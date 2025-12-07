using System.Collections;
using System.ComponentModel;
using System.Reflection;
using System.Text.Json.Serialization;
using Google.GenAI.Types;

namespace SecondBrain.Application.Services.AI.StructuredOutput;

/// <summary>
/// Builds Google.GenAI.Types.Schema objects from C# types using reflection.
/// Enables Gemini structured output by generating JSON schemas from .NET types.
/// </summary>
public static class GeminiSchemaBuilder
{
    /// <summary>
    /// Generate a Schema from a generic type parameter.
    /// </summary>
    public static Schema FromType<T>()
    {
        return FromType(typeof(T));
    }

    /// <summary>
    /// Generate a Schema from a runtime type.
    /// </summary>
    public static Schema FromType(System.Type type)
    {
        return BuildSchema(type, new HashSet<System.Type>());
    }

    /// <summary>
    /// Builds a Schema for the given type, with cycle detection.
    /// </summary>
    private static Schema BuildSchema(System.Type type, HashSet<System.Type> visitedTypes)
    {
        // Handle nullable types
        var underlyingType = Nullable.GetUnderlyingType(type);
        if (underlyingType != null)
        {
            var schema = BuildSchema(underlyingType, visitedTypes);
            schema.Nullable = true;
            return schema;
        }

        // Handle primitive types
        if (type == typeof(string))
        {
            return new Schema { Type = Google.GenAI.Types.Type.STRING };
        }

        if (type == typeof(int) || type == typeof(long) || type == typeof(short) || type == typeof(byte))
        {
            return new Schema { Type = Google.GenAI.Types.Type.INTEGER };
        }

        if (type == typeof(float) || type == typeof(double) || type == typeof(decimal))
        {
            return new Schema { Type = Google.GenAI.Types.Type.NUMBER };
        }

        if (type == typeof(bool))
        {
            return new Schema { Type = Google.GenAI.Types.Type.BOOLEAN };
        }

        // Handle enums
        if (type.IsEnum)
        {
            return new Schema
            {
                Type = Google.GenAI.Types.Type.STRING,
                Enum = System.Enum.GetNames(type).ToList()
            };
        }

        // Handle arrays and collections
        if (type.IsArray)
        {
            var elementType = type.GetElementType()!;
            return new Schema
            {
                Type = Google.GenAI.Types.Type.ARRAY,
                Items = BuildSchema(elementType, visitedTypes)
            };
        }

        if (type.IsGenericType)
        {
            var genericDef = type.GetGenericTypeDefinition();

            // Handle List<T>, IEnumerable<T>, IList<T>, ICollection<T>
            if (genericDef == typeof(List<>) ||
                genericDef == typeof(IEnumerable<>) ||
                genericDef == typeof(IList<>) ||
                genericDef == typeof(ICollection<>))
            {
                var elementType = type.GetGenericArguments()[0];
                return new Schema
                {
                    Type = Google.GenAI.Types.Type.ARRAY,
                    Items = BuildSchema(elementType, visitedTypes)
                };
            }

            // Handle Dictionary<string, T>
            if (genericDef == typeof(Dictionary<,>) || genericDef == typeof(IDictionary<,>))
            {
                var keyType = type.GetGenericArguments()[0];
                if (keyType == typeof(string))
                {
                    // Dictionary with string keys becomes an object with additionalProperties
                    var valueType = type.GetGenericArguments()[1];
                    return new Schema
                    {
                        Type = Google.GenAI.Types.Type.OBJECT,
                        // Note: additionalProperties isn't directly supported, treat as object
                    };
                }
            }
        }

        // Handle complex objects
        if (type.IsClass || type.IsValueType)
        {
            // Cycle detection
            if (visitedTypes.Contains(type))
            {
                // Return a simple object reference to avoid infinite recursion
                return new Schema { Type = Google.GenAI.Types.Type.OBJECT };
            }

            visitedTypes.Add(type);

            var properties = new Dictionary<string, Schema>();
            var required = new List<string>();

            // Get all public properties
            foreach (var prop in type.GetProperties(BindingFlags.Public | BindingFlags.Instance))
            {
                // Skip properties marked with JsonIgnore
                if (prop.GetCustomAttribute<JsonIgnoreAttribute>() != null)
                {
                    continue;
                }

                // Get property name (use JsonPropertyName if available)
                var jsonNameAttr = prop.GetCustomAttribute<JsonPropertyNameAttribute>();
                var propName = jsonNameAttr?.Name ?? ToCamelCase(prop.Name);

                // Get description from Description attribute
                var descAttr = prop.GetCustomAttribute<DescriptionAttribute>();

                // Build schema for property type
                var propSchema = BuildSchema(prop.PropertyType, new HashSet<System.Type>(visitedTypes));

                if (descAttr != null)
                {
                    propSchema.Description = descAttr.Description;
                }

                properties[propName] = propSchema;

                // Determine if required
                // Required if: non-nullable reference type without JsonIgnore
                var isNullable = Nullable.GetUnderlyingType(prop.PropertyType) != null;
                var nullabilityContext = new NullabilityInfoContext();
                var nullabilityInfo = nullabilityContext.Create(prop);
                var isNullableReference = nullabilityInfo.WriteState == NullabilityState.Nullable;

                if (!isNullable && !isNullableReference && !prop.PropertyType.IsValueType)
                {
                    // Check for Required attribute (if using data annotations)
                    var requiredAttr = prop.GetCustomAttribute<System.ComponentModel.DataAnnotations.RequiredAttribute>();
                    if (requiredAttr != null)
                    {
                        required.Add(propName);
                    }
                }
            }

            visitedTypes.Remove(type);

            return new Schema
            {
                Type = Google.GenAI.Types.Type.OBJECT,
                Properties = properties.Count > 0 ? properties : null,
                Required = required.Count > 0 ? required : null
            };
        }

        // Fallback to string for unknown types
        return new Schema { Type = Google.GenAI.Types.Type.STRING };
    }

    /// <summary>
    /// Converts PascalCase to camelCase for JSON property names.
    /// </summary>
    private static string ToCamelCase(string name)
    {
        if (string.IsNullOrEmpty(name) || !char.IsUpper(name[0]))
        {
            return name;
        }

        return char.ToLowerInvariant(name[0]) + name[1..];
    }
}
