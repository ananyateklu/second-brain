using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using SecondBrain.Application.Services.AI.StructuredOutput.Common;
using Xunit;

namespace SecondBrain.Tests.Unit.Application.Services.AI.StructuredOutput;

public class JsonSchemaBuilderTests
{
    #region Test Types

    public class SimpleType
    {
        public string Name { get; set; } = string.Empty;
        public int Age { get; set; }
        public bool IsActive { get; set; }
    }

    public class TypeWithDescription
    {
        [Description("The user's full name")]
        public string Name { get; set; } = string.Empty;

        [Description("Age in years")]
        public int Age { get; set; }
    }

    public class TypeWithRequired
    {
        [Required]
        public string RequiredField { get; set; } = string.Empty;

        public string? OptionalField { get; set; }
    }

    public class TypeWithJsonPropertyName
    {
        [JsonPropertyName("user_name")]
        public string UserName { get; set; } = string.Empty;

        [JsonPropertyName("email_address")]
        public string Email { get; set; } = string.Empty;
    }

    public class TypeWithJsonIgnore
    {
        public string Visible { get; set; } = string.Empty;

        [JsonIgnore]
        public string Hidden { get; set; } = string.Empty;
    }

    public class TypeWithNullable
    {
        public int? NullableInt { get; set; }
        public string? NullableString { get; set; }
        public DateTime? NullableDate { get; set; }
    }

    public class TypeWithCollections
    {
        public List<string> Tags { get; set; } = new();
        public string[] Categories { get; set; } = Array.Empty<string>();
        public IEnumerable<int> Numbers { get; set; } = Array.Empty<int>();
    }

    public class TypeWithDictionary
    {
        public Dictionary<string, string> Metadata { get; set; } = new();
    }

    public class TypeWithNestedObject
    {
        public string Title { get; set; } = string.Empty;
        public NestedType Details { get; set; } = new();
    }

    public class NestedType
    {
        public string Description { get; set; } = string.Empty;
        public int Count { get; set; }
    }

    public enum Status
    {
        Pending,
        Active,
        Completed,
        Cancelled
    }

    public class TypeWithEnum
    {
        public Status Status { get; set; }
        public Status? OptionalStatus { get; set; }
    }

    public class TypeWithDateTimes
    {
        public DateTime CreatedAt { get; set; }
        public DateTimeOffset UpdatedAt { get; set; }
        public DateOnly Date { get; set; }
        public TimeOnly Time { get; set; }
    }

    public class TypeWithRangeAttribute
    {
        [Range(0, 100)]
        public int Percentage { get; set; }

        [Range(0.0, 1.0)]
        public double Score { get; set; }
    }

    public class TypeWithStringLengthAttribute
    {
        [StringLength(100, MinimumLength = 1)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(500)]
        public string Description { get; set; } = string.Empty;

        [MinLength(3)]
        public string Code { get; set; } = string.Empty;
    }

    #endregion

    [Fact]
    public void FromType_SimpleType_ReturnsCorrectSchema()
    {
        // Act
        var schema = JsonSchemaBuilder.FromType<SimpleType>();

        // Assert
        Assert.Equal("object", schema.Type);
        Assert.NotNull(schema.Properties);
        Assert.Contains("name", schema.Properties.Keys);
        Assert.Contains("age", schema.Properties.Keys);
        Assert.Contains("isActive", schema.Properties.Keys);
        Assert.Equal("string", schema.Properties["name"].Type);
        Assert.Equal("integer", schema.Properties["age"].Type);
        Assert.Equal("boolean", schema.Properties["isActive"].Type);
    }

    [Fact]
    public void FromType_TypeWithDescription_IncludesDescriptions()
    {
        // Act
        var schema = JsonSchemaBuilder.FromType<TypeWithDescription>();

        // Assert
        Assert.NotNull(schema.Properties);
        Assert.Equal("The user's full name", schema.Properties["name"].Description);
        Assert.Equal("Age in years", schema.Properties["age"].Description);
    }

    [Fact]
    public void FromType_TypeWithRequired_MarksRequiredFields()
    {
        // Act
        var schema = JsonSchemaBuilder.FromType<TypeWithRequired>();

        // Assert
        Assert.NotNull(schema.Required);
        Assert.Contains("requiredField", schema.Required);
        Assert.DoesNotContain("optionalField", schema.Required);
    }

    [Fact]
    public void FromType_TypeWithJsonPropertyName_UsesCustomNames()
    {
        // Act
        var schema = JsonSchemaBuilder.FromType<TypeWithJsonPropertyName>();

        // Assert
        Assert.NotNull(schema.Properties);
        Assert.Contains("user_name", schema.Properties.Keys);
        Assert.Contains("email_address", schema.Properties.Keys);
        Assert.DoesNotContain("UserName", schema.Properties.Keys);
        Assert.DoesNotContain("Email", schema.Properties.Keys);
    }

    [Fact]
    public void FromType_TypeWithJsonIgnore_ExcludesIgnoredProperties()
    {
        // Act
        var schema = JsonSchemaBuilder.FromType<TypeWithJsonIgnore>();

        // Assert
        Assert.NotNull(schema.Properties);
        Assert.Contains("visible", schema.Properties.Keys);
        Assert.DoesNotContain("hidden", schema.Properties.Keys);
    }

    [Fact]
    public void FromType_TypeWithNullable_MarksNullableFields()
    {
        // Act
        var schema = JsonSchemaBuilder.FromType<TypeWithNullable>();

        // Assert
        Assert.NotNull(schema.Properties);
        Assert.True(schema.Properties["nullableInt"].Nullable);
        Assert.True(schema.Properties["nullableDate"].Nullable);
    }

    [Fact]
    public void FromType_TypeWithCollections_CreatesArraySchemas()
    {
        // Act
        var schema = JsonSchemaBuilder.FromType<TypeWithCollections>();

        // Assert
        Assert.NotNull(schema.Properties);

        Assert.Equal("array", schema.Properties["tags"].Type);
        Assert.NotNull(schema.Properties["tags"].Items);
        Assert.Equal("string", schema.Properties["tags"].Items!.Type);

        Assert.Equal("array", schema.Properties["categories"].Type);
        Assert.NotNull(schema.Properties["categories"].Items);
        Assert.Equal("string", schema.Properties["categories"].Items!.Type);

        Assert.Equal("array", schema.Properties["numbers"].Type);
        Assert.NotNull(schema.Properties["numbers"].Items);
        Assert.Equal("integer", schema.Properties["numbers"].Items!.Type);
    }

    [Fact]
    public void FromType_TypeWithDictionary_CreatesObjectWithAdditionalProperties()
    {
        // Act
        var schema = JsonSchemaBuilder.FromType<TypeWithDictionary>();

        // Assert
        Assert.NotNull(schema.Properties);
        Assert.Equal("object", schema.Properties["metadata"].Type);
        Assert.True(schema.Properties["metadata"].AdditionalProperties);
    }

    [Fact]
    public void FromType_TypeWithNestedObject_CreatesNestedSchema()
    {
        // Act
        var schema = JsonSchemaBuilder.FromType<TypeWithNestedObject>();

        // Assert
        Assert.NotNull(schema.Properties);
        Assert.Equal("string", schema.Properties["title"].Type);
        Assert.Equal("object", schema.Properties["details"].Type);
        Assert.NotNull(schema.Properties["details"].Properties);
        Assert.Contains("description", schema.Properties["details"].Properties!.Keys);
        Assert.Contains("count", schema.Properties["details"].Properties!.Keys);
    }

    [Fact]
    public void FromType_TypeWithEnum_CreatesEnumSchema()
    {
        // Act
        var schema = JsonSchemaBuilder.FromType<TypeWithEnum>();

        // Assert
        Assert.NotNull(schema.Properties);
        Assert.Equal("string", schema.Properties["status"].Type);
        Assert.NotNull(schema.Properties["status"].Enum);
        Assert.Contains("Pending", schema.Properties["status"].Enum!);
        Assert.Contains("Active", schema.Properties["status"].Enum!);
        Assert.Contains("Completed", schema.Properties["status"].Enum!);
        Assert.Contains("Cancelled", schema.Properties["status"].Enum!);
    }

    [Fact]
    public void FromType_TypeWithDateTimes_CreatesDateTimeSchemas()
    {
        // Act
        var schema = JsonSchemaBuilder.FromType<TypeWithDateTimes>();

        // Assert
        Assert.NotNull(schema.Properties);
        Assert.Equal("string", schema.Properties["createdAt"].Type);
        Assert.Equal("date-time", schema.Properties["createdAt"].Format);

        Assert.Equal("string", schema.Properties["updatedAt"].Type);
        Assert.Equal("date-time", schema.Properties["updatedAt"].Format);

        Assert.Equal("string", schema.Properties["date"].Type);
        Assert.Equal("date", schema.Properties["date"].Format);

        Assert.Equal("string", schema.Properties["time"].Type);
        Assert.Equal("time", schema.Properties["time"].Format);
    }

    [Fact]
    public void FromType_TypeWithRangeAttribute_IncludesMinMax()
    {
        // Act
        var schema = JsonSchemaBuilder.FromType<TypeWithRangeAttribute>();

        // Assert
        Assert.NotNull(schema.Properties);
        Assert.Equal(0, schema.Properties["percentage"].Minimum);
        Assert.Equal(100, schema.Properties["percentage"].Maximum);
        Assert.Equal(0.0, schema.Properties["score"].Minimum);
        Assert.Equal(1.0, schema.Properties["score"].Maximum);
    }

    [Fact]
    public void FromType_TypeWithStringLengthAttribute_IncludesLengthConstraints()
    {
        // Act
        var schema = JsonSchemaBuilder.FromType<TypeWithStringLengthAttribute>();

        // Assert
        Assert.NotNull(schema.Properties);
        Assert.Equal(1, schema.Properties["name"].MinLength);
        Assert.Equal(100, schema.Properties["name"].MaxLength);
        Assert.Equal(500, schema.Properties["description"].MaxLength);
        Assert.Equal(3, schema.Properties["code"].MinLength);
    }

    [Fact]
    public void FromType_PrimitiveString_ReturnsStringSchema()
    {
        // Act
        var schema = JsonSchemaBuilder.FromType(typeof(string));

        // Assert
        Assert.Equal("string", schema.Type);
    }

    [Fact]
    public void FromType_PrimitiveInt_ReturnsIntegerSchema()
    {
        // Act
        var schema = JsonSchemaBuilder.FromType(typeof(int));

        // Assert
        Assert.Equal("integer", schema.Type);
    }

    [Fact]
    public void FromType_PrimitiveDouble_ReturnsNumberSchema()
    {
        // Act
        var schema = JsonSchemaBuilder.FromType(typeof(double));

        // Assert
        Assert.Equal("number", schema.Type);
    }

    [Fact]
    public void FromType_PrimitiveBool_ReturnsBooleanSchema()
    {
        // Act
        var schema = JsonSchemaBuilder.FromType(typeof(bool));

        // Assert
        Assert.Equal("boolean", schema.Type);
    }

    [Fact]
    public void FromType_Guid_ReturnsStringWithUuidFormat()
    {
        // Act
        var schema = JsonSchemaBuilder.FromType(typeof(Guid));

        // Assert
        Assert.Equal("string", schema.Type);
        Assert.Equal("uuid", schema.Format);
    }

    [Fact]
    public void FromType_Uri_ReturnsStringWithUriFormat()
    {
        // Act
        var schema = JsonSchemaBuilder.FromType(typeof(Uri));

        // Assert
        Assert.Equal("string", schema.Type);
        Assert.Equal("uri", schema.Format);
    }

    [Fact]
    public void FromType_AdditionalPropertiesFalseByDefault()
    {
        // Act
        var schema = JsonSchemaBuilder.FromType<SimpleType>();

        // Assert
        Assert.False(schema.AdditionalProperties);
    }

    [Fact]
    public void FromType_GenericMethod_ReturnsSameAsRuntimeType()
    {
        // Act
        var genericSchema = JsonSchemaBuilder.FromType<SimpleType>();
        var runtimeSchema = JsonSchemaBuilder.FromType(typeof(SimpleType));

        // Assert
        Assert.Equal(genericSchema.Type, runtimeSchema.Type);
        Assert.Equal(genericSchema.Properties?.Count, runtimeSchema.Properties?.Count);
    }
}
