using System.ComponentModel;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.SemanticKernel;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.AI.Models;

namespace SecondBrain.Application.Services.AI.Search;

/// <summary>
/// Grok Live Search tool for real-time web and X data.
/// Implements as a function tool following the new agentic tool calling API pattern.
/// Note: The legacy Live Search API is being deprecated by December 15, 2025.
/// </summary>
public class GrokSearchTool
{
    private readonly XAISettings _settings;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<GrokSearchTool> _logger;

    public const string ToolName = "web_search";

    public GrokSearchTool(
        IOptions<AIProvidersSettings> settings,
        IHttpClientFactory httpClientFactory,
        ILogger<GrokSearchTool> logger)
    {
        _settings = settings.Value.XAI;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    /// <summary>
    /// Search the web and X (Twitter) for real-time information.
    /// </summary>
    /// <param name="query">The search query to execute</param>
    /// <param name="sources">Comma-separated sources to search: web, x (default: both)</param>
    /// <param name="recency">How recent the results should be: hour, day, week, month (default: day)</param>
    /// <param name="maxResults">Maximum number of results to return (default: 10)</param>
    /// <returns>Search results as JSON</returns>
    [KernelFunction(ToolName)]
    [Description("Search the web and X (Twitter) for real-time information. Use this when users ask about current events, news, trending topics, or anything that requires up-to-date information.")]
    public async Task<string> SearchAsync(
        [Description("The search query to execute")] string query,
        [Description("Comma-separated sources to search: web, x (default: web,x)")] string? sources = null,
        [Description("How recent the results should be: hour, day, week, month (default: day)")] string? recency = null,
        [Description("Maximum number of results to return (default: 10)")] int? maxResults = null)
    {
        if (!_settings.Enabled || !_settings.Features.EnableLiveSearch)
        {
            return JsonSerializer.Serialize(new
            {
                success = false,
                error = "Grok Live Search is not enabled"
            });
        }

        try
        {
            using var httpClient = CreateHttpClient();

            // Parse sources
            var sourceList = string.IsNullOrEmpty(sources)
                ? _settings.Search.DefaultSources
                : sources.Split(',').Select(s => s.Trim().ToLower()).ToList();

            // Build request with search_parameters
            var requestBody = new
            {
                model = _settings.DefaultModel,
                messages = new[]
                {
                    new { role = "user", content = query }
                },
                search_parameters = new
                {
                    mode = "on",
                    sources = sourceList,
                    recency = recency ?? _settings.Search.DefaultRecency,
                    max_results = maxResults ?? _settings.Search.MaxResults
                }
            };

            var jsonContent = JsonSerializer.Serialize(requestBody);
            var httpContent = new System.Net.Http.StringContent(
                jsonContent, System.Text.Encoding.UTF8, "application/json");

            _logger.LogInformation("Executing Grok Live Search. Query: {Query}, Sources: {Sources}",
                query, string.Join(",", sourceList));

            var response = await httpClient.PostAsync("chat/completions", httpContent);
            var responseContent = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Grok Live Search failed. Status: {Status}, Response: {Response}",
                    response.StatusCode, responseContent);

                return JsonSerializer.Serialize(new
                {
                    success = false,
                    error = $"Search failed: HTTP {response.StatusCode}"
                });
            }

            // Parse response and extract search results
            var result = ParseSearchResponse(responseContent);

            return JsonSerializer.Serialize(new
            {
                success = true,
                query = query,
                sources = sourceList,
                results = result
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error executing Grok Live Search");
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
        if (!string.IsNullOrWhiteSpace(_settings.ApiKey) &&
            !client.DefaultRequestHeaders.Contains("Authorization"))
        {
            client.DefaultRequestHeaders.Add("Authorization", $"Bearer {_settings.ApiKey}");
        }
        return client;
    }

    private static object ParseSearchResponse(string json)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            var response = new
            {
                content = string.Empty,
                sources = new List<GrokSearchSource>()
            };

            // Extract content
            string content = string.Empty;
            if (root.TryGetProperty("choices", out var choices) &&
                choices.GetArrayLength() > 0)
            {
                var firstChoice = choices[0];
                if (firstChoice.TryGetProperty("message", out var message) &&
                    message.TryGetProperty("content", out var contentElement))
                {
                    content = contentElement.GetString() ?? string.Empty;
                }
            }

            // Extract search sources if present
            var sources = new List<GrokSearchSource>();
            if (root.TryGetProperty("search_results", out var searchResults))
            {
                foreach (var result in searchResults.EnumerateArray())
                {
                    sources.Add(new GrokSearchSource
                    {
                        Url = result.TryGetProperty("url", out var url) ? url.GetString() ?? "" : "",
                        Title = result.TryGetProperty("title", out var title) ? title.GetString() ?? "" : "",
                        Snippet = result.TryGetProperty("snippet", out var snippet) ? snippet.GetString() ?? "" : "",
                        SourceType = result.TryGetProperty("source_type", out var sourceType) ? sourceType.GetString() ?? "web" : "web",
                        RelevanceScore = result.TryGetProperty("relevance_score", out var score) ? score.GetSingle() : null
                    });
                }
            }

            return new { content, sources };
        }
        catch
        {
            return new { content = json, sources = new List<GrokSearchSource>() };
        }
    }
}
