using System.Collections;
using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.Reflection;
using System.Text.Json.Serialization;

namespace SecondBrain.Application.Services.AI.StructuredOutput.Common;

/// <summary>
/// Builds provider-agnostic JsonSchemaDefinition objects from C# types using reflection.
/// This shared builder is used by all provider-specific adapters.
/// </summary>
public static class JsonSchemaBuilder
{
    /// <summary>
    /// Generate a JsonSchemaDefinition from a generic type parameter.
    /// </summary>
    public static JsonSchemaDefinition FromType<T>()
    {
        return FromType(typeof(T));
    }

    /// <summary>
    /// Generate a JsonSchemaDefinition from a runtime type.
    /// </summary>
    public static JsonSchemaDefinition FromType(Type type)
    {
        return BuildSchema(type, new HashSet<Type>());
    }

    /// <summary>
    /// Builds a JsonSchemaDefinition for the given type, with cycle detection.
    /// </summary>
    private static JsonSchemaDefinition BuildSchema(Type type, HashSet<Type> visitedTypes)
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
            return new JsonSchemaDefinition { Type = "string" };
        }

        if (type == typeof(int) || type == typeof(long) || type == typeof(short) || type == typeof(byte) ||
            type == typeof(uint) || type == typeof(ulong) || type == typeof(ushort) || type == typeof(sbyte))
        {
            return new JsonSchemaDefinition { Type = "integer" };
        }

        if (type == typeof(float) || type == typeof(double) || type == typeof(decimal))
        {
            return new JsonSchemaDefinition { Type = "number" };
        }

        if (type == typeof(bool))
        {
            return new JsonSchemaDefinition { Type = "boolean" };
        }

        // Handle DateTime types
        if (type == typeof(DateTime) || type == typeof(DateTimeOffset))
        {
            return new JsonSchemaDefinition { Type = "string", Format = "date-time" };
        }

        if (type == typeof(DateOnly))
        {
            return new JsonSchemaDefinition { Type = "string", Format = "date" };
        }

        if (type == typeof(TimeOnly) || type == typeof(TimeSpan))
        {
            return new JsonSchemaDefinition { Type = "string", Format = "time" };
        }

        // Handle Guid
        if (type == typeof(Guid))
        {
            return new JsonSchemaDefinition { Type = "string", Format = "uuid" };
        }

        // Handle Uri
        if (type == typeof(Uri))
        {
            return new JsonSchemaDefinition { Type = "string", Format = "uri" };
        }

        // Handle enums
        if (type.IsEnum)
        {
            return new JsonSchemaDefinition
            {
                Type = "string",
                Enum = Enum.GetNames(type).ToList()
            };
        }

        // Handle arrays and collections
        if (type.IsArray)
        {
            var elementType = type.GetElementType()!;
            return new JsonSchemaDefinition
            {
                Type = "array",
                Items = BuildSchema(elementType, visitedTypes)
            };
        }

        if (type.IsGenericType)
        {
            var genericDef = type.GetGenericTypeDefinition();

            // Handle List<T>, IEnumerable<T>, IList<T>, ICollection<T>, IReadOnlyList<T>, IReadOnlyCollection<T>
            if (genericDef == typeof(List<>) ||
                genericDef == typeof(IEnumerable<>) ||
                genericDef == typeof(IList<>) ||
                genericDef == typeof(ICollection<>) ||
                genericDef == typeof(IReadOnlyList<>) ||
                genericDef == typeof(IReadOnlyCollection<>))
            {
                var elementType = type.GetGenericArguments()[0];
                return new JsonSchemaDefinition
                {
                    Type = "array",
                    Items = BuildSchema(elementType, visitedTypes)
                };
            }

            // Handle HashSet<T>
            if (genericDef == typeof(HashSet<>) || genericDef == typeof(ISet<>))
            {
                var elementType = type.GetGenericArguments()[0];
                return new JsonSchemaDefinition
                {
                    Type = "array",
                    Items = BuildSchema(elementType, visitedTypes)
                };
            }

            // Handle Dictionary<string, T>
            if (genericDef == typeof(Dictionary<,>) || genericDef == typeof(IDictionary<,>) ||
                genericDef == typeof(IReadOnlyDictionary<,>))
            {
                var keyType = type.GetGenericArguments()[0];
                if (keyType == typeof(string))
                {
                    // Dictionary with string keys becomes an object with additionalProperties
                    // Note: Standard JSON Schema would use additionalProperties for value schema,
                    // but for most AI providers, we just indicate it's an object
                    return new JsonSchemaDefinition
                    {
                        Type = "object",
                        AdditionalProperties = true
                    };
                }
            }
        }

        // Handle complex objects (classes and structs)
        if (type.IsClass || (type.IsValueType && !type.IsPrimitive))
        {
            // Cycle detection
            if (visitedTypes.Contains(type))
            {
                // Return a simple object reference to avoid infinite recursion
                return new JsonSchemaDefinition { Type = "object" };
            }

            visitedTypes.Add(type);

            var properties = new Dictionary<string, JsonSchemaDefinition>();
            var required = new List<string>();

            // Get all public properties
            foreach (var prop in type.GetProperties(BindingFlags.Public | BindingFlags.Instance))
            {
                // Skip properties marked with JsonIgnore
                if (prop.GetCustomAttribute<JsonIgnoreAttribute>() != null)
                {
                    continue;
                }

                // Skip indexers
                if (prop.GetIndexParameters().Length > 0)
                {
                    continue;
                }

                // Get property name (use JsonPropertyName if available)
                var jsonNameAttr = prop.GetCustomAttribute<JsonPropertyNameAttribute>();
                var propName = jsonNameAttr?.Name ?? ToCamelCase(prop.Name);

                // Get description from Description attribute
                var descAttr = prop.GetCustomAttribute<DescriptionAttribute>();

                // Build schema for property type
                var propSchema = BuildSchema(prop.PropertyType, new HashSet<Type>(visitedTypes));

                if (descAttr != null)
                {
                    propSchema.Description = descAttr.Description;
                }

                // Check for range constraints
                var rangeAttr = prop.GetCustomAttribute<RangeAttribute>();
                if (rangeAttr != null)
                {
                    if (rangeAttr.Minimum is IConvertible minConv)
                    {
                        propSchema.Minimum = Convert.ToDouble(minConv);
                    }
                    if (rangeAttr.Maximum is IConvertible maxConv)
                    {
                        propSchema.Maximum = Convert.ToDouble(maxConv);
                    }
                }

                // Check for string length constraints
                var strLenAttr = prop.GetCustomAttribute<StringLengthAttribute>();
                if (strLenAttr != null)
                {
                    propSchema.MinLength = strLenAttr.MinimumLength;
                    propSchema.MaxLength = strLenAttr.MaximumLength;
                }

                var maxLenAttr = prop.GetCustomAttribute<MaxLengthAttribute>();
                if (maxLenAttr != null)
                {
                    propSchema.MaxLength = maxLenAttr.Length;
                }

                var minLenAttr = prop.GetCustomAttribute<MinLengthAttribute>();
                if (minLenAttr != null)
                {
                    propSchema.MinLength = minLenAttr.Length;
                }

                properties[propName] = propSchema;

                // Determine if required
                var requiredAttr = prop.GetCustomAttribute<RequiredAttribute>();
                if (requiredAttr != null)
                {
                    required.Add(propName);
                }
                else
                {
                    // Check nullability for reference types
                    var isNullableValueType = Nullable.GetUnderlyingType(prop.PropertyType) != null;
                    if (!isNullableValueType && !prop.PropertyType.IsValueType)
                    {
                        var nullabilityContext = new NullabilityInfoContext();
                        var nullabilityInfo = nullabilityContext.Create(prop);
                        var isNullableReference = nullabilityInfo.WriteState == NullabilityState.Nullable ||
                                                  nullabilityInfo.ReadState == NullabilityState.Nullable;

                        // If it's a non-nullable reference type, consider it required
                        // But we'll be lenient and not add it to required unless [Required] is present
                        // This matches the behavior most AI models expect
                    }
                }
            }

            visitedTypes.Remove(type);

            return new JsonSchemaDefinition
            {
                Type = "object",
                Properties = properties.Count > 0 ? properties : null,
                Required = required.Count > 0 ? required : null,
                AdditionalProperties = false // Strict mode by default
            };
        }

        // Fallback to string for unknown types
        return new JsonSchemaDefinition { Type = "string" };
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

        // Handle consecutive uppercase letters (e.g., "XMLParser" -> "xmlParser")
        var chars = name.ToCharArray();
        for (int i = 0; i < chars.Length; i++)
        {
            if (i == 0)
            {
                chars[i] = char.ToLowerInvariant(chars[i]);
            }
            else if (i + 1 < chars.Length && char.IsUpper(chars[i]) && char.IsLower(chars[i + 1]))
            {
                break;
            }
            else if (char.IsUpper(chars[i]))
            {
                chars[i] = char.ToLowerInvariant(chars[i]);
            }
            else
            {
                break;
            }
        }

        return new string(chars);
    }
}
