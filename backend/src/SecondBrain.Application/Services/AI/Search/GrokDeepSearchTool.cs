using System.ComponentModel;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.SemanticKernel;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.AI.Models;

namespace SecondBrain.Application.Services.AI.Search;

/// <summary>
/// Grok DeepSearch tool for comprehensive web research.
/// Conducts thorough research across multiple sources and synthesizes findings.
/// </summary>
public class GrokDeepSearchTool
{
    private readonly XAISettings _settings;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<GrokDeepSearchTool> _logger;

    public const string ToolName = "deep_search";

    public GrokDeepSearchTool(
        IOptions<AIProvidersSettings> settings,
        IHttpClientFactory httpClientFactory,
        ILogger<GrokDeepSearchTool> logger)
    {
        _settings = settings.Value.XAI;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    /// <summary>
    /// Conduct comprehensive research on a topic.
    /// </summary>
    /// <param name="query">The research question or topic</param>
    /// <param name="focusAreas">Optional comma-separated focus areas for the research</param>
    /// <param name="maxSources">Maximum number of sources to search (default: 20)</param>
    /// <returns>Research report as JSON</returns>
    [KernelFunction(ToolName)]
    [Description("Conduct comprehensive research on a topic. Use this for in-depth questions requiring synthesis from multiple sources, comparative analysis, or thorough investigation of complex topics.")]
    public async Task<string> DeepSearchAsync(
        [Description("The research question or topic to investigate")] string query,
        [Description("Comma-separated focus areas to guide the research (optional)")] string? focusAreas = null,
        [Description("Maximum number of sources to search (default: 20)")] int? maxSources = null)
    {
        if (!_settings.Enabled || !_settings.Features.EnableDeepSearch)
        {
            return JsonSerializer.Serialize(new
            {
                success = false,
                error = "Grok DeepSearch is not enabled"
            });
        }

        try
        {
            using var httpClient = CreateHttpClient();

            // Parse focus areas
            var areas = string.IsNullOrEmpty(focusAreas)
                ? null
                : focusAreas.Split(',').Select(a => a.Trim()).ToList();

            // Build request with deep_search parameters
            var requestBody = new
            {
                model = "grok-3", // DeepSearch works best with grok-3
                messages = new[]
                {
                    new { role = "user", content = query }
                },
                deep_search = new
                {
                    enabled = true,
                    max_sources = maxSources ?? _settings.DeepSearch.MaxSources,
                    max_time_seconds = _settings.DeepSearch.MaxTimeSeconds,
                    focus_areas = areas
                }
            };

            var jsonContent = JsonSerializer.Serialize(requestBody);
            var httpContent = new System.Net.Http.StringContent(
                jsonContent, System.Text.Encoding.UTF8, "application/json");

            _logger.LogInformation("Executing Grok DeepSearch. Query: {Query}", query);

            // Use longer timeout for DeepSearch
            httpClient.Timeout = TimeSpan.FromSeconds(_settings.DeepSearch.MaxTimeSeconds + 30);

            var response = await httpClient.PostAsync("chat/completions", httpContent);
            var responseContent = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Grok DeepSearch failed. Status: {Status}, Response: {Response}",
                    response.StatusCode, responseContent);

                return JsonSerializer.Serialize(new
                {
                    success = false,
                    error = $"DeepSearch failed: HTTP {response.StatusCode}"
                });
            }

            // Parse response
            var result = ParseDeepSearchResponse(responseContent);

            return JsonSerializer.Serialize(new
            {
                success = true,
                query = query,
                focusAreas = areas,
                report = result
            });
        }
        catch (TaskCanceledException)
        {
            _logger.LogWarning("Grok DeepSearch timed out for query: {Query}", query);
            return JsonSerializer.Serialize(new
            {
                success = false,
                error = "DeepSearch timed out. Try a more specific query or reduce max sources."
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error executing Grok DeepSearch");
            return JsonSerializer.Serialize(new
            {
                success = false,
                error = ex.Message
            });
        }
    }

    private HttpClient CreateHttpClient()
    {
        var client = _httpClientFactory.CreateClient("Grok");

        // Set BaseAddress from settings if not already configured
        if (client.BaseAddress == null && !string.IsNullOrWhiteSpace(_settings.BaseUrl))
        {
            var baseUrl = _settings.BaseUrl.TrimEnd('/') + "/";
            client.BaseAddress = new Uri(baseUrl);
        }

        if (!string.IsNullOrWhiteSpace(_settings.ApiKey) &&
            !client.DefaultRequestHeaders.Contains("Authorization"))
        {
            client.DefaultRequestHeaders.Add("Authorization", $"Bearer {_settings.ApiKey}");
        }
        return client;
    }

    private static GrokDeepSearchResponse ParseDeepSearchResponse(string json)
    {
        var response = new GrokDeepSearchResponse();

        try
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            // Extract main content as summary
            if (root.TryGetProperty("choices", out var choices) &&
                choices.GetArrayLength() > 0)
            {
                var firstChoice = choices[0];
                if (firstChoice.TryGetProperty("message", out var message) &&
                    message.TryGetProperty("content", out var content))
                {
                    response.Summary = content.GetString() ?? string.Empty;
                }
            }

            // Extract deep search results if present
            if (root.TryGetProperty("deep_search_results", out var deepSearchResults))
            {
                // Extract sources
                if (deepSearchResults.TryGetProperty("sources", out var sources))
                {
                    foreach (var source in sources.EnumerateArray())
                    {
                        response.Sources.Add(new GrokSearchSource
                        {
                            Url = source.TryGetProperty("url", out var url) ? url.GetString() ?? "" : "",
                            Title = source.TryGetProperty("title", out var title) ? title.GetString() ?? "" : "",
                            Snippet = source.TryGetProperty("snippet", out var snippet) ? snippet.GetString() ?? "" : "",
                            SourceType = source.TryGetProperty("source_type", out var sourceType) ? sourceType.GetString() ?? "web" : "web"
                        });
                    }
                }

                // Extract key findings
                if (deepSearchResults.TryGetProperty("key_findings", out var findings))
                {
                    foreach (var prop in findings.EnumerateObject())
                    {
                        response.KeyFindings[prop.Name] = prop.Value.GetString() ?? string.Empty;
                    }
                }

                // Extract analysis
                if (deepSearchResults.TryGetProperty("analysis", out var analysis))
                {
                    response.Analysis = analysis.GetString() ?? string.Empty;
                }
            }
        }
        catch
        {
            response.Summary = json;
        }

        return response;
    }
}
