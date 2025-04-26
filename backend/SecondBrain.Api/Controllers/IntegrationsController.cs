using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SecondBrain.Api.Models.Integrations;
using SecondBrain.Api.Services.Interfaces;
using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Headers; // Needed if using Basic Auth
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using System.Linq; // Add LINQ using

namespace SecondBrain.Api.Controllers
{
    [Authorize] // Ensure only authenticated users can access this controller
    [ApiController]
    [Route("api/[controller]")]
    public class IntegrationsController : ControllerBase
    {
        private readonly IIntegrationService _integrationService;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _configuration;
        private readonly ILogger<IntegrationsController> _logger;

        public IntegrationsController(
            IIntegrationService integrationService,
            IHttpClientFactory httpClientFactory,
            IConfiguration configuration,
            ILogger<IntegrationsController> logger)
        {
            _integrationService = integrationService;
            _httpClientFactory = httpClientFactory;
            _configuration = configuration;
            _logger = logger;
        }

        // POST: api/integrations/ticktick/exchange-code
        [HttpPost("ticktick/exchange-code")]
        public async Task<IActionResult> ExchangeTickTickCode([FromBody] TickTickCodeExchangeRequest request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            _logger.LogInformation("TickTick code exchange request from user with ID: {UserId}", userId);
            
            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("TickTick code exchange attempt failed: User ID not found in token.");
                return Unauthorized(new { message = "User authentication failed." });
            }

            if (string.IsNullOrEmpty(request?.Code))
            {
                 _logger.LogWarning("TickTick code exchange attempt failed for user {UserId}: Authorization code missing.", userId);
                return BadRequest(new { message = "Authorization code is required." });
            }

            // --- Retrieve Configuration --- 
            var clientId = _configuration["TickTick:ClientId"];
            var clientSecret = _configuration["TickTick:ClientSecret"];
            var redirectUri = _configuration["TickTick:RedirectUri"];
            var tokenEndpoint = _configuration["TickTick:TokenEndpoint"] ?? "https://ticktick.com/oauth/token"; // Use configured or default

            if (string.IsNullOrEmpty(clientId) || string.IsNullOrEmpty(clientSecret) || string.IsNullOrEmpty(redirectUri))
            {
                _logger.LogError("TickTick configuration (ClientId, ClientSecret, RedirectUri) is incomplete or missing in application settings.");
                return StatusCode(500, new { message = "Integration configuration error. Please contact support." });
            }

            // --- Call TickTick Token Endpoint --- 
            using var httpClient = _httpClientFactory.CreateClient("TickTickApiClient"); // Consider using a named client

            var tokenRequestPayload = new Dictionary<string, string>
            {
                { "client_id", clientId },
                { "client_secret", clientSecret },
                { "code", request.Code },
                { "grant_type", "authorization_code" },
                { "redirect_uri", redirectUri },
                // { "scope", "tasks:read tasks:write" } // Usually needed for auth, not token exchange, but check docs
            };

            using var tokenRequest = new HttpRequestMessage(HttpMethod.Post, tokenEndpoint)
            {
                Content = new FormUrlEncodedContent(tokenRequestPayload)
            };

            // Check TickTick docs: Does it need Basic Auth instead of client_secret in body?
            // var authValue = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{clientId}:{clientSecret}"));
            // tokenRequest.Headers.Authorization = new AuthenticationHeaderValue("Basic", authValue);

            try
            {
                _logger.LogInformation("Exchanging TickTick code for user {UserId}", userId);
                using var response = await httpClient.SendAsync(tokenRequest);
                var responseContent = await response.Content.ReadAsStringAsync();

                if (response.IsSuccessStatusCode)
                {
                    // --- Process Successful Response --- 
                    TickTickTokenResponse? tokenResponse = null;
                    try {
                        tokenResponse = JsonSerializer.Deserialize<TickTickTokenResponse>(responseContent);
                    }
                    catch(JsonException jsonEx) {
                        _logger.LogError(jsonEx, "Failed to deserialize successful TickTick token response for user {UserId}. Content: {ResponseContent}", userId, responseContent);
                        return StatusCode(500, new { message = "Error processing TickTick response." });
                    }
                    
                    if (tokenResponse == null || string.IsNullOrEmpty(tokenResponse.AccessToken))
                    {
                        _logger.LogError("Deserialized TickTick token response is invalid or missing access token for user {UserId}. Content: {ResponseContent}", userId, responseContent);
                        return StatusCode(500, new { message = "Invalid response received from TickTick." });
                    }

                    _logger.LogInformation("Successfully received TickTick tokens for user {UserId}", userId);

                    // --- Save Credentials using Service --- 
                    bool saveSuccess = await _integrationService.SaveTickTickCredentialsAsync(userId, tokenResponse);

                    if (saveSuccess)
                    {
                        _logger.LogInformation("TickTick connection successful and credentials stored for user {UserId}", userId);
                        return Ok(new { message = "TickTick connected successfully." });
                    }
                    else
                    {
                        // Service layer logged the error
                        return StatusCode(500, new { message = "Failed to store TickTick credentials." });
                    }
                }
                else
                {
                    // --- Process Error Response --- 
                    string errorMessage = "Failed to connect to TickTick.";
                    try {
                         var errorResponse = JsonSerializer.Deserialize<TickTickErrorResponse>(responseContent);
                         if(errorResponse != null && !string.IsNullOrEmpty(errorResponse.Error)) {
                             errorMessage = $"TickTick Error: {errorResponse.Error} ({errorResponse.ErrorDescription ?? "-"})";
                         }
                    } catch (JsonException) { /* Ignore if content is not expected JSON error */ }
                    
                    _logger.LogWarning("TickTick token exchange failed for user {UserId}. Status: {StatusCode}. Response: {ResponseContent}", userId, response.StatusCode, responseContent);
                    return StatusCode((int)response.StatusCode, new { message = errorMessage });
                }
            }
            catch (HttpRequestException ex)
            {
                _logger.LogError(ex, "HTTP request exception during TickTick token exchange for user {UserId}. Endpoint: {TokenEndpoint}", userId, tokenEndpoint);
                return StatusCode(502, new { message = "Network error communicating with TickTick." }); // 502 Bad Gateway
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error during TickTick token exchange for user {UserId}", userId);
                return StatusCode(500, new { message = "An internal server error occurred." });
            }
        }

        // DELETE: api/integrations/ticktick
        [HttpDelete("ticktick")]
        public async Task<IActionResult> DisconnectTickTick()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("TickTick disconnect attempt failed: User ID not found in token.");
                return Unauthorized(new { message = "User authentication failed." });
            }

            _logger.LogInformation("Attempting to disconnect TickTick for user {UserId}", userId);

            bool deleteSuccess = await _integrationService.DeleteTickTickCredentialsAsync(userId);

            if (deleteSuccess)
            {
                _logger.LogInformation("TickTick disconnected successfully for user {UserId}", userId);
                // TODO: Potentially call TickTick API to revoke the token if their API supports it.
                return Ok(new { message = "TickTick disconnected successfully." });
            }
            else
            {
                // Service layer logged the error
                return StatusCode(500, new { message = "Failed to disconnect TickTick." });
            }
        }

        // GET: api/integrations/ticktick/status
        [HttpGet("ticktick/status")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetTickTickStatus()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("TickTick status check failed: User ID not found in token.");
                return Unauthorized(new { message = "User authentication failed." });
            }

            try
            {
                _logger.LogInformation("Checking TickTick connection status for user {UserId}", userId);
                var credentials = await _integrationService.GetTickTickCredentialsAsync(userId);
                bool isConnected = credentials != null;
                
                _logger.LogInformation("TickTick connection status for user {UserId}: {IsConnected}", userId, isConnected);
                return Ok(new { 
                    isConnected,
                    expiresAt = credentials?.ExpiresAt
                });
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error checking TickTick status during possible reconnection for user {UserId}", userId);
                // During reconnection periods, return a 503 Service Unavailable instead of an error
                // The frontend can interpret this to maintain the previous connection state
                return StatusCode(503, new { message = "Service temporarily unavailable during reconnection" });
            }
        }

        // GET: api/integrations/ticktick/tasks?projectId={projectId}
        // If projectId is provided, fetch tasks for that specific project via GET /open/v1/project/{projectId}/data
        [HttpGet("ticktick/tasks")]
        public async Task<IActionResult> GetTickTickTasks([FromQuery] string? projectId = null)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User authentication failed." });
            }

            // --- 1. Get Credentials --- 
            _logger.LogInformation("Attempting to retrieve TickTick credentials for user {UserId}", userId);
            var credentials = await _integrationService.GetTickTickCredentialsAsync(userId);

            if (credentials == null)
            {
                _logger.LogWarning("User {UserId} attempted to fetch TickTick tasks but is not connected.", userId);
                // You might want a specific status code or error message for "not connected"
                return NotFound(new { message = "TickTick integration not found or credentials missing." }); 
            }

            // --- 2. Check Token Expiry & Refresh (Simplified - Full refresh logic needed later) ---
            // IMPORTANT: This needs proper implementation using the refresh token
            if (credentials.ExpiresAt <= DateTime.UtcNow.AddMinutes(1)) // Check if expired or close to expiry
            {
                _logger.LogWarning("TickTick token expired or nearing expiry for user {UserId}. Refresh needed.", userId);
                // TODO: Call refresh token logic here
                // var newAccessToken = await _integrationService.RefreshTickTickTokenAsync(credentials);
                // if (newAccessToken == null) {
                //     return StatusCode(500, new { message = "Failed to refresh TickTick token." });
                // }
                // credentials.AccessToken = newAccessToken; // Use the refreshed token
                
                // For now, return an error indicating refresh is needed
                return StatusCode(401, new { message = "TickTick token expired. Please reconnect." }); // Or trigger refresh
            }

            var accessToken = credentials.AccessToken; // Use potentially decrypted token

            // --- 3. Call TickTick API --- 
            var tickTickApiBaseUrl = _configuration["TickTick:ApiBaseUrl"] ?? "https://api.ticktick.com";

            string tasksEndpoint;
            bool usingProjectEndpoint = !string.IsNullOrEmpty(projectId);

            if (usingProjectEndpoint)
            {
                tasksEndpoint = $"{tickTickApiBaseUrl}/open/v1/project/{projectId}/data";
            }
            else
            {
                // Fallback to all tasks if no project specified
                // Docs: https://developer.ticktick.com/api#/openapi
                tasksEndpoint = $"{tickTickApiBaseUrl}/open/v1/task";
            }
            
            _logger.LogInformation("Fetching tasks from TickTick for user {UserId}. Endpoint: {Endpoint}", userId, tasksEndpoint);
            using var httpClient = _httpClientFactory.CreateClient("TickTickApiClient");
            
            using var requestMessage = new HttpRequestMessage(HttpMethod.Get, tasksEndpoint);
            requestMessage.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
            // Add other headers if required by TickTick API (e.g., Content-Type)
            // requestMessage.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

            try
            {
                using var response = await httpClient.SendAsync(requestMessage);
                var responseContent = await response.Content.ReadAsStringAsync();

                if (response.IsSuccessStatusCode)
                {
                    _logger.LogInformation("Successfully fetched tasks from TickTick for user {UserId}", userId);
                    try {
                        if (usingProjectEndpoint)
                        {
                            // Deserialize project data and extract tasks
                            var projectData = JsonSerializer.Deserialize<TickTickProjectData>(responseContent);
                            var tasks = projectData?.Tasks ?? new List<TickTickTask>();
                            return Ok(tasks);
                        }
                        else
                        {
                            // Assuming TickTick returns a JSON array of tasks directly
                            var tasks = JsonSerializer.Deserialize<List<TickTickTask>>(responseContent);
                            return Ok(tasks ?? new List<TickTickTask>()); // Return empty list if null
                        }
                    }
                    catch (JsonException jsonEx)
                    {
                        _logger.LogError(jsonEx, "Failed to deserialize TickTick tasks response for user {UserId}. Content: {ResponseContent}", userId, responseContent);
                        return StatusCode(500, new { message = "Error processing TickTick task data." });
                    }
                }
                else
                {
                    // Handle API error from TickTick
                    _logger.LogWarning("Failed to fetch tasks from TickTick for user {UserId}. Status: {StatusCode}, Response: {ResponseContent}", userId, response.StatusCode, responseContent);
                     string errorMessage = "Failed to retrieve tasks from TickTick.";
                    try {
                         var errorResponse = JsonSerializer.Deserialize<TickTickErrorResponse>(responseContent);
                         if(errorResponse != null && !string.IsNullOrEmpty(errorResponse.Error)) {
                             errorMessage = $"TickTick API Error: {errorResponse.Error} ({errorResponse.ErrorDescription ?? "-"})";
                         }
                    } catch (JsonException) { /* Ignore */ }
                    return StatusCode((int)response.StatusCode, new { message = errorMessage });
                }
            }
            catch (HttpRequestException ex)
            {
                _logger.LogError(ex, "HTTP request exception while fetching TickTick tasks for user {UserId}. Endpoint: {Endpoint}", userId, tasksEndpoint);
                return StatusCode(502, new { message = "Network error communicating with TickTick." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while fetching TickTick tasks for user {UserId}", userId);
                return StatusCode(500, new { message = "An internal server error occurred." });
            }
        }

        // GET: api/integrations/ticktick/projects
        [HttpGet("ticktick/projects")]
        public async Task<IActionResult> GetTickTickProjects()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User authentication failed." });
            }

            _logger.LogInformation("Fetching TickTick projects for user {UserId}", userId);

            var credentials = await _integrationService.GetTickTickCredentialsAsync(userId);
            if (credentials == null)
            {
                return NotFound(new { message = "TickTick integration not found or credentials missing." });
            }

            if (credentials.ExpiresAt <= DateTime.UtcNow.AddMinutes(1))
            {
                return StatusCode(401, new { message = "TickTick token expired. Please reconnect." });
            }

            var accessToken = credentials.AccessToken;
            var tickTickApiBaseUrl = _configuration["TickTick:ApiBaseUrl"] ?? "https://api.ticktick.com";
            var projectsEndpoint = $"{tickTickApiBaseUrl}/open/v1/project";

            using var httpClient = _httpClientFactory.CreateClient("TickTickApiClient");
            using var request = new HttpRequestMessage(HttpMethod.Get, projectsEndpoint);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

            try
            {
                using var response = await httpClient.SendAsync(request);
                var content = await response.Content.ReadAsStringAsync();

                if (response.IsSuccessStatusCode)
                {
                    var projects = JsonSerializer.Deserialize<List<TickTickProject>>(content) ?? new List<TickTickProject>();
                    return Ok(projects);
                }
                else
                {
                    _logger.LogWarning("TickTick projects request failed for user {UserId}. Status: {StatusCode}", userId, response.StatusCode);
                    return StatusCode((int)response.StatusCode, new { message = "Failed to retrieve TickTick projects." });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching TickTick projects for user {UserId}", userId);
                return StatusCode(500, new { message = "An internal server error occurred." });
            }
        }
    }
} 