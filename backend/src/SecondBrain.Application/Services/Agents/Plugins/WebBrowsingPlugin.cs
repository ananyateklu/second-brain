using System.ComponentModel;
using System.Net;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;
using Microsoft.SemanticKernel;
using SecondBrain.Application.Services.RAG.Models;

namespace SecondBrain.Application.Services.Agents.Plugins;

/// <summary>
/// Plugin that provides web browsing capabilities to agents.
/// Allows fetching content from URLs for analysis, summarization, and note creation.
/// </summary>
public class WebBrowsingPlugin : IAgentPlugin
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<WebBrowsingPlugin> _logger;
    private static readonly TimeSpan DefaultTimeout = TimeSpan.FromSeconds(30);

    public WebBrowsingPlugin(HttpClient httpClient, ILogger<WebBrowsingPlugin> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    #region IAgentPlugin Implementation

    public string CapabilityId => "browsing";
    public string DisplayName => "Web Browsing";
    public string Description => "Fetch and read content from web pages to analyze, summarize, or create notes from URLs";

    public void SetCurrentUserId(string userId)
    {
        // Web browsing doesn't need user context
    }

    public void SetAgentRagEnabled(bool enabled)
    {
        // Web browsing doesn't depend on RAG state
    }

    public void SetRagOptions(RagOptions? options)
    {
        // Web browsing doesn't use RAG options
    }

    public void SetAgentContext(string provider, string model)
    {
        // Web browsing doesn't need agent context
    }

    public object GetPluginInstance() => this;

    public string GetPluginName() => "WebBrowsing";

    public string GetSystemPromptAddition()
    {
        return @"

## Web Browsing Tools

You have access to web browsing capabilities that allow you to fetch and read content from URLs:

### Available Tools:
1. **fetch_url** - Fetch the content of a web page from a URL
   - Use for: Reading articles, recipes, documentation, blog posts, or any web content
   - Returns: The text content of the page (HTML tags stripped)
   - Handles: Automatic redirects, common error codes

### When to Use Web Browsing:
- User provides a URL and asks you to read, summarize, or analyze the content
- User wants to create a note from a web page
- User asks you to extract specific information from a webpage
- User shares a link and asks questions about its content

### Important Guidelines:
1. **Always use fetch_url for URLs** - When a user provides a URL and asks about its content, always fetch it first
2. **Handle errors gracefully** - If a page fails to load, explain the issue and suggest alternatives
3. **Summarize effectively** - After fetching, provide a clear summary unless the user asks for specific details
4. **Respect content** - When creating notes from web content, maintain attribution to the source
5. **Combine with notes** - If the user asks to save the content, use the notes tools after fetching to create a note

### Example Usage:
User: ""Look at this recipe and create a note: https://example.com/recipe""
1. First, use fetch_url to get the page content
2. Then, use CreateNote to save the recipe with proper formatting
3. Confirm to the user what was saved
";
    }

    #endregion

    #region Web Browsing Tools

    [KernelFunction("fetch_url")]
    [Description("Fetch the content of a web page from a URL. Returns the text content with HTML tags stripped. Use this when a user provides a URL and asks you to read, summarize, analyze, or extract information from the page.")]
    public async Task<string> FetchUrlAsync(
        [Description("The full URL to fetch (must start with http:// or https://)")] string url,
        [Description("Maximum number of characters to return (default: 50000, max: 100000)")] int? maxLength = null)
    {
        try
        {
            // Validate URL
            if (string.IsNullOrWhiteSpace(url))
            {
                return "Error: URL cannot be empty. Please provide a valid URL starting with http:// or https://";
            }

            // Clean up URL - trim whitespace and remove markdown formatting if present
            url = url.Trim();

            // Remove markdown link formatting like [text](url) - extract just the URL
            var markdownMatch = Regex.Match(url, @"\[.*?\]\((https?://[^\)]+)\)");
            if (markdownMatch.Success)
            {
                url = markdownMatch.Groups[1].Value;
            }

            if (!url.StartsWith("http://", StringComparison.OrdinalIgnoreCase) &&
                !url.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
            {
                return "Error: Invalid URL format. URL must start with http:// or https://";
            }

            if (!Uri.TryCreate(url, UriKind.Absolute, out var uri))
            {
                return "Error: Could not parse the URL. Please ensure it's a valid web address.";
            }

            _logger.LogInformation("Fetching URL: {Url}", url);

            // Configure request
            using var request = new HttpRequestMessage(HttpMethod.Get, uri);
            request.Headers.Add("User-Agent", "SecondBrain/1.0 (AI Assistant Web Browser)");
            request.Headers.Add("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.7");
            request.Headers.Add("Accept-Language", "en-US,en;q=0.9");

            // Send request with timeout
            using var cts = new CancellationTokenSource(DefaultTimeout);
            var response = await _httpClient.SendAsync(request, cts.Token);

            // Check status
            if (!response.IsSuccessStatusCode)
            {
                var statusDescription = response.StatusCode switch
                {
                    HttpStatusCode.NotFound => "Page not found (404). The URL may be incorrect or the page may have been removed.",
                    HttpStatusCode.Forbidden => "Access forbidden (403). The website may be blocking automated access.",
                    HttpStatusCode.Unauthorized => "Authorization required (401). This page requires login credentials.",
                    HttpStatusCode.InternalServerError => "Server error (500). The website is experiencing issues.",
                    HttpStatusCode.ServiceUnavailable => "Service unavailable (503). The website may be temporarily down.",
                    HttpStatusCode.TooManyRequests => "Too many requests (429). Please wait and try again.",
                    _ => $"HTTP error {(int)response.StatusCode}: {response.ReasonPhrase}"
                };
                return $"Error fetching URL: {statusDescription}";
            }

            // Read content
            var content = await response.Content.ReadAsStringAsync(cts.Token);

            if (string.IsNullOrWhiteSpace(content))
            {
                return "The page returned empty content. It may be dynamically loaded with JavaScript, which this tool cannot execute.";
            }

            // Extract text content from HTML
            var textContent = ExtractTextFromHtml(content);

            if (string.IsNullOrWhiteSpace(textContent))
            {
                return "Could not extract readable text from the page. It may be primarily images or require JavaScript to render.";
            }

            // Apply length limit
            var limit = Math.Min(maxLength ?? 50000, 100000);
            if (textContent.Length > limit)
            {
                textContent = textContent[..limit] + "\n\n[Content truncated - reached character limit]";
            }

            // Add source attribution
            var result = $"=== Content from: {url} ===\n\n{textContent}";

            _logger.LogInformation("Successfully fetched URL: {Url}, Content length: {Length}", url, textContent.Length);

            return result;
        }
        catch (TaskCanceledException)
        {
            return "Error: Request timed out. The website may be slow or unresponsive.";
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "HTTP error fetching URL: {Url}", url);
            return $"Error connecting to the website: {ex.Message}. Please check the URL and try again.";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error fetching URL: {Url}", url);
            return $"Unexpected error: {ex.Message}. Please try again or use a different URL.";
        }
    }

    #endregion

    #region Private Methods

    /// <summary>
    /// Extracts readable text content from HTML, stripping tags and normalizing whitespace.
    /// </summary>
    private static string ExtractTextFromHtml(string html)
    {
        if (string.IsNullOrWhiteSpace(html))
            return string.Empty;

        // Remove script and style elements completely (including content)
        html = Regex.Replace(html, @"<script[^>]*>[\s\S]*?</script>", "", RegexOptions.IgnoreCase);
        html = Regex.Replace(html, @"<style[^>]*>[\s\S]*?</style>", "", RegexOptions.IgnoreCase);
        html = Regex.Replace(html, @"<noscript[^>]*>[\s\S]*?</noscript>", "", RegexOptions.IgnoreCase);
        html = Regex.Replace(html, @"<head[^>]*>[\s\S]*?</head>", "", RegexOptions.IgnoreCase);
        html = Regex.Replace(html, @"<nav[^>]*>[\s\S]*?</nav>", "", RegexOptions.IgnoreCase);
        html = Regex.Replace(html, @"<footer[^>]*>[\s\S]*?</footer>", "", RegexOptions.IgnoreCase);

        // Add line breaks before block elements for better formatting
        html = Regex.Replace(html, @"<(p|div|br|h[1-6]|li|tr|article|section)[^>]*>", "\n", RegexOptions.IgnoreCase);
        html = Regex.Replace(html, @"</(p|div|h[1-6]|li|tr|article|section)>", "\n", RegexOptions.IgnoreCase);

        // Remove all remaining HTML tags
        html = Regex.Replace(html, @"<[^>]+>", " ");

        // Decode HTML entities
        html = WebUtility.HtmlDecode(html);

        // Normalize whitespace
        html = Regex.Replace(html, @"[ \t]+", " ");
        html = Regex.Replace(html, @"\n[ \t]+", "\n");
        html = Regex.Replace(html, @"[ \t]+\n", "\n");
        html = Regex.Replace(html, @"\n{3,}", "\n\n");

        return html.Trim();
    }

    #endregion
}
