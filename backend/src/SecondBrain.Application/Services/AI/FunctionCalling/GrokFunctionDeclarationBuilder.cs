using System.ComponentModel;
using System.Reflection;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.SemanticKernel;
using OpenAI.Chat;

namespace SecondBrain.Application.Services.AI.FunctionCalling;

/// <summary>
/// Builds OpenAI-compatible ChatTool objects from methods with [KernelFunction] attributes for Grok/X.AI.
/// This allows reusing the same plugin infrastructure for both Semantic Kernel and Grok native calling.
/// Since Grok uses an OpenAI-compatible API, this implementation mirrors OpenAIFunctionDeclarationBuilder.
/// </summary>
public static class GrokFunctionDeclarationBuilder
{
    /// <summary>
    /// Builds ChatTool objects from all [KernelFunction] methods in the given object.
    /// </summary>
    public static List<ChatTool> BuildFromPlugin(object plugin)
    {
        var tools = new List<ChatTool>();

        foreach (var method in plugin.GetType().GetMethods())
        {
            var funcAttr = method.GetCustomAttribute<KernelFunctionAttribute>();
            if (funcAttr == null) continue;

            var tool = BuildFromMethod(method, funcAttr);
            if (tool != null)
            {
                tools.Add(tool);
            }
        }

        return tools;
    }

    /// <summary>
    /// Builds a ChatTool from a method with [KernelFunction] attribute.
    /// </summary>
    public static ChatTool? BuildFromMethod(MethodInfo method, KernelFunctionAttribute? funcAttr = null)
    {
        funcAttr ??= method.GetCustomAttribute<KernelFunctionAttribute>();
        if (funcAttr == null) return null;

        var descAttr = method.GetCustomAttribute<DescriptionAttribute>();
        var funcName = funcAttr.Name ?? method.Name;
        var funcDescription = descAttr?.Description ?? "";

        var parameters = method.GetParameters();
        var properties = new JsonObject();
        var required = new JsonArray();

        foreach (var param in parameters)
        {
            var paramDesc = param.GetCustomAttribute<DescriptionAttribute>();
            var paramType = param.ParameterType;

            var paramSchema = new JsonObject
            {
                ["type"] = GetJsonSchemaType(paramType)
            };

            if (paramDesc != null)
            {
                paramSchema["description"] = paramDesc.Description;
            }

            // Handle nullable types
            var underlyingType = Nullable.GetUnderlyingType(paramType);
            if (underlyingType != null)
            {
                // For nullable types, we don't add to required
            }
            else if (!param.HasDefaultValue)
            {
                // Non-nullable value types without defaults are required
                if (paramType.IsValueType)
                {
                    required.Add(param.Name!);
                }
                // String types - check description for required hint
                else if (paramType == typeof(string))
                {
                    var desc = paramDesc?.Description ?? "";
                    if (desc.Contains("required", StringComparison.OrdinalIgnoreCase) &&
                        !desc.Contains("optional", StringComparison.OrdinalIgnoreCase))
                    {
                        required.Add(param.Name!);
                    }
                }
            }

            properties[param.Name!] = paramSchema;
        }

        // Build the JSON schema object for the API
        var parametersSchema = new JsonObject
        {
            ["type"] = "object",
            ["properties"] = properties
        };

        if (required.Count > 0)
        {
            parametersSchema["required"] = required;
        }

        // Serialize to BinaryData for OpenAI SDK (Grok uses same format)
        var schemaBytes = JsonSerializer.SerializeToUtf8Bytes(parametersSchema);
        var schemaData = BinaryData.FromBytes(schemaBytes);

        // Create OpenAI ChatTool using CreateFunctionTool (compatible with Grok)
        return ChatTool.CreateFunctionTool(
            functionName: funcName,
            functionDescription: funcDescription,
            functionParameters: schemaData
        );
    }

    /// <summary>
    /// Maps .NET types to JSON Schema type strings.
    /// </summary>
    private static string GetJsonSchemaType(Type type)
    {
        var underlyingType = Nullable.GetUnderlyingType(type) ?? type;

        if (underlyingType == typeof(string))
            return "string";
        if (underlyingType == typeof(int) || underlyingType == typeof(long) ||
            underlyingType == typeof(short) || underlyingType == typeof(byte))
            return "integer";
        if (underlyingType == typeof(float) || underlyingType == typeof(double) ||
            underlyingType == typeof(decimal))
            return "number";
        if (underlyingType == typeof(bool))
            return "boolean";
        if (underlyingType.IsArray ||
            (underlyingType.IsGenericType &&
             (underlyingType.GetGenericTypeDefinition() == typeof(List<>) ||
              underlyingType.GetGenericTypeDefinition() == typeof(IEnumerable<>))))
            return "array";

        // Default to string for complex types
        return "string";
    }
}
