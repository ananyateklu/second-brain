using System.ComponentModel;
using System.Reflection;
using Google.GenAI.Types;
using Microsoft.SemanticKernel;

namespace SecondBrain.Application.Services.AI.FunctionCalling;

/// <summary>
/// Builds Gemini FunctionDeclaration objects from methods with [KernelFunction] attributes.
/// This allows reusing the same plugin infrastructure for both Semantic Kernel and Gemini native calling.
/// </summary>
public static class GeminiFunctionDeclarationBuilder
{
    /// <summary>
    /// Builds FunctionDeclaration objects from all [KernelFunction] methods in the given object.
    /// </summary>
    public static List<FunctionDeclaration> BuildFromPlugin(object plugin)
    {
        var declarations = new List<FunctionDeclaration>();

        foreach (var method in plugin.GetType().GetMethods())
        {
            var funcAttr = method.GetCustomAttribute<KernelFunctionAttribute>();
            if (funcAttr == null) continue;

            var declaration = BuildFromMethod(method, funcAttr);
            if (declaration != null)
            {
                declarations.Add(declaration);
            }
        }

        return declarations;
    }

    /// <summary>
    /// Builds a FunctionDeclaration from a method with [KernelFunction] attribute.
    /// </summary>
    public static FunctionDeclaration? BuildFromMethod(MethodInfo method, KernelFunctionAttribute? funcAttr = null)
    {
        funcAttr ??= method.GetCustomAttribute<KernelFunctionAttribute>();
        if (funcAttr == null) return null;

        var descAttr = method.GetCustomAttribute<DescriptionAttribute>();
        var funcName = funcAttr.Name ?? method.Name;
        var funcDescription = descAttr?.Description ?? "";

        var parameters = method.GetParameters();
        var properties = new Dictionary<string, Schema>();
        var required = new List<string>();

        foreach (var param in parameters)
        {
            var paramDesc = param.GetCustomAttribute<DescriptionAttribute>();
            var paramType = param.ParameterType;

            var schema = new Schema
            {
                Type = GetGeminiType(paramType),
                Description = paramDesc?.Description ?? ""
            };

            // Handle nullable types
            var underlyingType = Nullable.GetUnderlyingType(paramType);
            if (underlyingType != null)
            {
                schema.Nullable = true;
            }

            properties[param.Name!] = schema;

            // Add to required if not optional and not nullable
            if (!param.HasDefaultValue && underlyingType == null && paramType.IsValueType == false)
            {
                // String types without defaults are typically required
                if (paramType == typeof(string))
                {
                    // Check if description suggests required
                    var desc = paramDesc?.Description ?? "";
                    if (desc.Contains("required", StringComparison.OrdinalIgnoreCase) &&
                        !desc.Contains("optional", StringComparison.OrdinalIgnoreCase))
                    {
                        required.Add(param.Name!);
                    }
                }
            }
            else if (!param.HasDefaultValue && paramType.IsValueType && underlyingType == null)
            {
                // Non-nullable value types without defaults are required
                required.Add(param.Name!);
            }
        }

        return new FunctionDeclaration
        {
            Name = funcName,
            Description = funcDescription,
            Parameters = new Schema
            {
                Type = Google.GenAI.Types.Type.OBJECT,
                Properties = properties,
                Required = required.Count > 0 ? required : null
            }
        };
    }

    /// <summary>
    /// Maps .NET types to Google.GenAI.Types.Type enum values.
    /// </summary>
    private static Google.GenAI.Types.Type GetGeminiType(System.Type type)
    {
        var underlyingType = Nullable.GetUnderlyingType(type) ?? type;

        if (underlyingType == typeof(string))
            return Google.GenAI.Types.Type.STRING;
        if (underlyingType == typeof(int) || underlyingType == typeof(long) ||
            underlyingType == typeof(short) || underlyingType == typeof(byte))
            return Google.GenAI.Types.Type.INTEGER;
        if (underlyingType == typeof(float) || underlyingType == typeof(double) ||
            underlyingType == typeof(decimal))
            return Google.GenAI.Types.Type.NUMBER;
        if (underlyingType == typeof(bool))
            return Google.GenAI.Types.Type.BOOLEAN;
        if (underlyingType.IsArray ||
            (underlyingType.IsGenericType &&
             (underlyingType.GetGenericTypeDefinition() == typeof(List<>) ||
              underlyingType.GetGenericTypeDefinition() == typeof(IEnumerable<>))))
            return Google.GenAI.Types.Type.ARRAY;

        // Default to string for complex types
        return Google.GenAI.Types.Type.STRING;
    }
}
