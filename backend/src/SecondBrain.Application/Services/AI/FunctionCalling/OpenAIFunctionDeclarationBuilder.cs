using System.ComponentModel;
using System.Reflection;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.SemanticKernel;
using OpenAI.Chat;

namespace SecondBrain.Application.Services.AI.FunctionCalling;

/// <summary>
/// Builds OpenAI ChatTool objects from methods with [KernelFunction] attributes.
/// This allows reusing the same plugin infrastructure for both Semantic Kernel and OpenAI native calling.
/// </summary>
public static class OpenAIFunctionDeclarationBuilder
{
    /// <summary>
    /// Builds ChatTool objects from all [KernelFunction] methods in the given object.
    /// </summary>
    /// <param name="plugin">The plugin instance to extract functions from.</param>
    /// <param name="useStrictMode">When true, enables strict mode with additionalProperties: false and all parameters required.</param>
    public static List<ChatTool> BuildFromPlugin(object plugin, bool useStrictMode = false)
    {
        var tools = new List<ChatTool>();

        foreach (var method in plugin.GetType().GetMethods())
        {
            var funcAttr = method.GetCustomAttribute<KernelFunctionAttribute>();
            if (funcAttr == null) continue;

            var tool = BuildFromMethod(method, funcAttr, useStrictMode);
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
    /// <param name="method">The method to build a tool from.</param>
    /// <param name="funcAttr">Optional function attribute (will be retrieved if not provided).</param>
    /// <param name="useStrictMode">When true, enables strict mode with additionalProperties: false and all parameters required.</param>
    public static ChatTool? BuildFromMethod(MethodInfo method, KernelFunctionAttribute? funcAttr = null, bool useStrictMode = false)
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
                // For nullable types in strict mode, add to required anyway (strict mode requires all params)
                if (useStrictMode)
                {
                    required.Add(param.Name!);
                }
            }
            else if (!param.HasDefaultValue)
            {
                // Parameters without defaults
                if (useStrictMode)
                {
                    // In strict mode, ALL parameters must be in required array
                    required.Add(param.Name!);
                }
                else if (paramType.IsValueType)
                {
                    // Non-nullable value types without defaults are always required
                    required.Add(param.Name!);
                }
                else if (paramType == typeof(string))
                {
                    // String types - check description for required hint
                    var desc = paramDesc?.Description ?? "";
                    if (desc.Contains("required", StringComparison.OrdinalIgnoreCase) &&
                        !desc.Contains("optional", StringComparison.OrdinalIgnoreCase))
                    {
                        required.Add(param.Name!);
                    }
                }
                // Note: Other reference types (List<T>, arrays, objects) without defaults
                // are not marked required in non-strict mode (they can be null)
            }
            else if (useStrictMode)
            {
                // In strict mode, parameters WITH defaults must also be in required array
                required.Add(param.Name!);
            }

            properties[param.Name!] = paramSchema;
        }

        // Build the JSON schema object for OpenAI
        var parametersSchema = new JsonObject
        {
            ["type"] = "object",
            ["properties"] = properties
        };

        if (required.Count > 0)
        {
            parametersSchema["required"] = required;
        }

        // For strict mode, add additionalProperties: false (required by OpenAI)
        if (useStrictMode)
        {
            parametersSchema["additionalProperties"] = false;
        }

        // Serialize to BinaryData for OpenAI SDK
        var schemaBytes = JsonSerializer.SerializeToUtf8Bytes(parametersSchema);
        var schemaData = BinaryData.FromBytes(schemaBytes);

        // Create OpenAI ChatTool using CreateFunctionTool
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
