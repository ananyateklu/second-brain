using System.Text.RegularExpressions;

namespace SecondBrain.Application.Services.AI.Models;

/// <summary>
/// Configuration and utilities for multimodal (vision) model support
/// 
/// NOTE: Most modern LLMs are multimodal by default. The patterns below
/// are designed to be inclusive of newer model versions.
/// </summary>
public static class MultimodalConfig
{
    /// <summary>
    /// Vision-capable model patterns by provider
    /// Patterns support wildcards (*) at start, middle, or end
    /// </summary>
    private static readonly Dictionary<string, List<string>> VisionModelPatterns = new(StringComparer.OrdinalIgnoreCase)
    {
        ["OpenAI"] = new List<string>
        {
            // GPT-4 variants with vision
            "gpt-4o*",              // gpt-4o, gpt-4o-mini, gpt-4o-2024-*, etc.
            "gpt-4-turbo*",         // gpt-4-turbo, gpt-4-turbo-preview, etc.
            "gpt-4-vision*",
            "gpt-4.1*",             // gpt-4.1, gpt-4.1-mini, gpt-4.1-nano, etc.
            "gpt-4.5*",             // gpt-4.5, gpt-4.5-preview, etc.
            "gpt-5*",
            "gpt-5.1*",             // Explicit support for gpt-5.1
            // O-series reasoning models (all support vision)
            "o1*",                  // o1, o1-mini, o1-preview, etc.
            "o3*",                  // o3, o3-mini, etc.
            "o4*",                  // o4, o4-mini, etc.
            "o5*",
            // Chatgpt models
            "chatgpt-4o*"
        },
        ["Claude"] = new List<string>
        {
            // All Claude 3.x models support vision (3, 3.5, 3.7, etc.)
            "claude-3*",            // claude-3-opus, claude-3-sonnet, claude-3-haiku, claude-3.5-*, claude-3.7-*, etc.
            // Claude 4.x and beyond (all multimodal)
            "claude-4*",            // claude-4, claude-4.5, claude-4-opus, claude-4-sonnet, etc.
            // Named models without version prefix
            "claude-sonnet*",       // claude-sonnet-4, claude-sonnet-4-*, etc.
            "claude-opus*",         // claude-opus-4, etc.
            "claude-haiku*"
        },
        ["Gemini"] = new List<string>
        {
            // All Gemini models are multimodal by design
            "gemini-1*",            // gemini-1.0-*, gemini-1.5-*, etc.
            "gemini-2*",            // gemini-2.0-*, gemini-2.5-*, etc.
            "gemini-3*",            // gemini-3.0-*, etc.
            "gemini-pro*",          // gemini-pro, gemini-pro-vision, gemini-pro-latest
            "gemini-flash*",        // gemini-flash, gemini-flash-*, etc.
            "gemini-ultra*",
            "gemini-nano*",
            // Experimental models
            "gemini-exp*"
        },
        ["Ollama"] = new List<string>
        {
            // Vision-capable models in Ollama (must be explicitly vision models)
            "llava*",               // llava, llava:*, llava-llama3, llava-phi3, llava-v1.6-*, etc.
            "bakllava*",
            "moondream*",
            "minicpm-v*",
            "cogvlm*",
            "llama3.2-vision*",     // Meta's vision model
            "llama-3.2-vision*",
            "nanollava*",
            "obsidian*"
        },
        ["Grok"] = new List<string>
        {
            // Only Grok models with "vision" in the name support images
            "*vision*",             // Any model with "vision" in the name
            "grok-2-vision*",
            "grok-vision*",
            "grok-3-vision*"
        }
    };

    /// <summary>
    /// Check if a model supports vision/image inputs
    /// </summary>
    public static bool IsMultimodalModel(string provider, string model)
    {
        if (string.IsNullOrEmpty(provider) || string.IsNullOrEmpty(model))
            return false;

        if (!VisionModelPatterns.TryGetValue(provider, out var patterns))
            return false;

        return patterns.Any(pattern => MatchesPattern(model, pattern));
    }

    /// <summary>
    /// Check if a model name matches a pattern
    /// Supports wildcards (*) at the start, end, or middle of patterns
    /// Examples:
    ///   - "gpt-4o*" matches "gpt-4o", "gpt-4o-mini", "gpt-4o-2024"
    ///   - "*vision*" matches "grok-2-vision", "grok-vision-beta"
    ///   - "claude-3*" matches "claude-3-opus", "claude-3.5-sonnet"
    /// </summary>
    private static bool MatchesPattern(string modelName, string pattern)
    {
        var lowerModel = modelName.ToLowerInvariant();
        var lowerPattern = pattern.ToLowerInvariant();

        // Check if pattern contains wildcard
        if (lowerPattern.Contains('*'))
        {
            // Convert glob pattern to regex
            // Escape special regex chars except *, then replace * with .*
            var regexPattern = Regex.Escape(lowerPattern).Replace("\\*", ".*");
            var regex = new Regex($"^{regexPattern}$", RegexOptions.IgnoreCase);
            return regex.IsMatch(lowerModel);
        }

        return lowerModel == lowerPattern;
    }

    /// <summary>
    /// Supported image formats by provider
    /// </summary>
    public static readonly Dictionary<string, HashSet<string>> SupportedImageFormats = new(StringComparer.OrdinalIgnoreCase)
    {
        ["OpenAI"] = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "image/jpeg", "image/png", "image/gif", "image/webp"
        },
        ["Claude"] = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "image/jpeg", "image/png", "image/gif", "image/webp"
        },
        ["Gemini"] = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "image/jpeg", "image/png", "image/gif", "image/webp", "image/heic", "image/heif"
        },
        ["Ollama"] = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "image/jpeg", "image/png"
        },
        ["Grok"] = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "image/jpeg", "image/png"  // xAI only supports JPEG and PNG per docs
        }
    };

    /// <summary>
    /// Validate if an image format is supported by a provider
    /// </summary>
    public static bool IsImageFormatSupported(string provider, string mediaType)
    {
        if (SupportedImageFormats.TryGetValue(provider, out var formats))
        {
            return formats.Contains(mediaType);
        }
        return false;
    }
}

