using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SecondBrain.Api.Models.Integrations;
using SecondBrain.Api.Services.Interfaces;
using SecondBrain.Data;
using SecondBrain.Data.Entities;
using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Headers; // Needed if using Basic Auth
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using System.Linq; // Add LINQ using
using Microsoft.EntityFrameworkCore;

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
        private readonly DataContext _context;

        public IntegrationsController(
            IIntegrationService integrationService,
            IHttpClientFactory httpClientFactory,
            IConfiguration configuration,
            ILogger<IntegrationsController> logger,
            DataContext context)
        {
            _integrationService = integrationService;
            _httpClientFactory = httpClientFactory;
            _configuration = configuration;
            _logger = logger;
            _context = context;
        }

        // Add a new model for sync requests
        public class TaskSyncRequest
        {
            public string Direction { get; set; } = "two-way"; // "two-way", "to-ticktick", "from-ticktick"
            public string ResolutionStrategy { get; set; } = "newer"; // "newer", "ticktick", "secondbrain", "ask"
            public bool IncludeTags { get; set; } = true;
            public required string ProjectId { get; set; } // Add this property
        }

        // Add a new model for sync results
        public class TaskSyncResult
        {
            public bool Success { get; set; }
            public int Created { get; set; }
            public int Updated { get; set; }
            public int Deleted { get; set; }
            public int Errors { get; set; }
            public string? Message { get; set; }
            public string LastSynced { get; set; } = DateTime.UtcNow.ToString("o");
        }

        // Add a new model for sync status
        public class TaskSyncStatus
        {
            public string? LastSynced { get; set; }
            public TaskCountInfo TaskCount { get; set; } = new TaskCountInfo();
            
            public class TaskCountInfo
            {
                public int Local { get; set; }
                public int TickTick { get; set; }
                public int Mapped { get; set; }
            }
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

        // GET: api/integrations/ticktick/tasks/{projectId}/{taskId}
        [HttpGet("ticktick/tasks/{projectId}/{taskId}")]
        public async Task<IActionResult> GetTickTickTaskById(string projectId, string taskId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User authentication failed." });
            }

            _logger.LogInformation("Fetching TickTick task for user {UserId}. ProjectId: {ProjectId}, TaskId: {TaskId}", userId, projectId, taskId);

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
            var taskEndpoint = $"{tickTickApiBaseUrl}/open/v1/project/{projectId}/task/{taskId}";

            using var httpClient = _httpClientFactory.CreateClient("TickTickApiClient");
            using var request = new HttpRequestMessage(HttpMethod.Get, taskEndpoint);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

            try
            {
                using var response = await httpClient.SendAsync(request);
                var content = await response.Content.ReadAsStringAsync();

                if (response.IsSuccessStatusCode)
                {
                    try
                    {
                        var task = JsonSerializer.Deserialize<TickTickTask>(content);
                        if (task == null)
                        {
                            _logger.LogWarning("Deserialized TickTick task is null for user {UserId}. Content: {Content}", userId, content);
                            return StatusCode(500, new { message = "Failed to process TickTick task data." });
                        }
                        return Ok(task);
                    }
                    catch (JsonException jsonEx)
                    {
                        _logger.LogError(jsonEx, "Failed to deserialize TickTick task response for user {UserId}. Content: {Content}", userId, content);
                        return StatusCode(500, new { message = "Error processing TickTick task data." });
                    }
                }
                else
                {
                    _logger.LogWarning("Failed to fetch TickTick task for user {UserId}. Status: {StatusCode}, Response: {Content}", userId, response.StatusCode, content);
                    string errorMessage = "Failed to retrieve task from TickTick.";
                    try
                    {
                        var errorResponse = JsonSerializer.Deserialize<TickTickErrorResponse>(content);
                        if (errorResponse != null && !string.IsNullOrEmpty(errorResponse.Error))
                        {
                            errorMessage = $"TickTick API Error: {errorResponse.Error} ({errorResponse.ErrorDescription ?? "-"})";
                        }
                    }
                    catch (JsonException) { /* Ignore */ }
                    return StatusCode((int)response.StatusCode, new { message = errorMessage });
                }
            }
            catch (HttpRequestException ex)
            {
                _logger.LogError(ex, "HTTP request exception while fetching TickTick task for user {UserId}. Endpoint: {Endpoint}", userId, taskEndpoint);
                return StatusCode(502, new { message = "Network error communicating with TickTick." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while fetching TickTick task for user {UserId}", userId);
                return StatusCode(500, new { message = "An internal server error occurred." });
            }
        }

        // POST: api/integrations/ticktick/tasks/{taskId}
        [HttpPost("ticktick/tasks/{taskId}")]
        public async Task<IActionResult> UpdateTickTickTask(string taskId, [FromBody] TickTickTask request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User authentication failed." });
            }

            if (string.IsNullOrEmpty(request?.Id) || string.IsNullOrEmpty(request?.ProjectId))
            {
                return BadRequest(new { message = "Task ID and Project ID are required." });
            }

            _logger.LogInformation("Updating TickTick task for user {UserId}. TaskId: {TaskId}, ProjectId: {ProjectId}", 
                userId, taskId, request.ProjectId);

            // Verify taskId in path matches taskId in request body
            if (taskId != request.Id)
            {
                return BadRequest(new { message = "Task ID in path must match Task ID in request body." });
            }

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
            var updateEndpoint = $"{tickTickApiBaseUrl}/open/v1/task/{taskId}";

            using var httpClient = _httpClientFactory.CreateClient("TickTickApiClient");
            using var httpRequest = new HttpRequestMessage(HttpMethod.Post, updateEndpoint)
            {
                Content = new StringContent(
                    JsonSerializer.Serialize(request),
                    Encoding.UTF8,
                    "application/json"
                )
            };
            
            httpRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

            try
            {
                using var response = await httpClient.SendAsync(httpRequest);
                var content = await response.Content.ReadAsStringAsync();

                if (response.IsSuccessStatusCode)
                {
                    try
                    {
                        var updatedTask = JsonSerializer.Deserialize<TickTickTask>(content);
                        return Ok(updatedTask);
                    }
                    catch (JsonException jsonEx)
                    {
                        _logger.LogError(jsonEx, "Failed to deserialize TickTick task response for user {UserId}. Content: {Content}", userId, content);
                        return StatusCode(500, new { message = "Error processing TickTick task data." });
                    }
                }
                else
                {
                    _logger.LogWarning("Failed to update TickTick task for user {UserId}. Status: {StatusCode}, Response: {Content}", 
                        userId, response.StatusCode, content);
                    
                    string errorMessage = "Failed to update task in TickTick.";
                    try
                    {
                        var errorResponse = JsonSerializer.Deserialize<TickTickErrorResponse>(content);
                        if (errorResponse != null && !string.IsNullOrEmpty(errorResponse.Error))
                        {
                            errorMessage = $"TickTick API Error: {errorResponse.Error} ({errorResponse.ErrorDescription ?? "-"})";
                        }
                    }
                    catch (JsonException) { /* Ignore */ }
                    
                    return StatusCode((int)response.StatusCode, new { message = errorMessage });
                }
            }
            catch (HttpRequestException ex)
            {
                _logger.LogError(ex, "HTTP request exception while updating TickTick task for user {UserId}. Endpoint: {Endpoint}", 
                    userId, updateEndpoint);
                return StatusCode(502, new { message = "Network error communicating with TickTick." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while updating TickTick task for user {UserId}", userId);
                return StatusCode(500, new { message = "An internal server error occurred." });
            }
        }

        // POST: api/integrations/ticktick/tasks/{projectId}/{taskId}/complete
        [HttpPost("ticktick/tasks/{projectId}/{taskId}/complete")]
        public async Task<IActionResult> CompleteTickTickTask(string projectId, string taskId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User authentication failed." });
            }

            _logger.LogInformation("Completing TickTick task for user {UserId}. ProjectId: {ProjectId}, TaskId: {TaskId}", 
                userId, projectId, taskId);

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
            var completeEndpoint = $"{tickTickApiBaseUrl}/open/v1/project/{projectId}/task/{taskId}/complete";

            using var httpClient = _httpClientFactory.CreateClient("TickTickApiClient");
            using var httpRequest = new HttpRequestMessage(HttpMethod.Post, completeEndpoint);
            httpRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

            try
            {
                using var response = await httpClient.SendAsync(httpRequest);
                
                if (response.IsSuccessStatusCode)
                {
                    _logger.LogInformation("Successfully completed TickTick task for user {UserId}. TaskId: {TaskId}", userId, taskId);
                    return Ok(new { message = "Task completed successfully." });
                }
                else
                {
                    var content = await response.Content.ReadAsStringAsync();
                    _logger.LogWarning("Failed to complete TickTick task for user {UserId}. Status: {StatusCode}, Response: {Content}", 
                        userId, response.StatusCode, content);
                    
                    string errorMessage = "Failed to complete task in TickTick.";
                    try
                    {
                        var errorResponse = JsonSerializer.Deserialize<TickTickErrorResponse>(content);
                        if (errorResponse != null && !string.IsNullOrEmpty(errorResponse.Error))
                        {
                            errorMessage = $"TickTick API Error: {errorResponse.Error} ({errorResponse.ErrorDescription ?? "-"})";
                        }
                    }
                    catch (JsonException) { /* Ignore */ }
                    
                    return StatusCode((int)response.StatusCode, new { message = errorMessage });
                }
            }
            catch (HttpRequestException ex)
            {
                _logger.LogError(ex, "HTTP request exception while completing TickTick task for user {UserId}. Endpoint: {Endpoint}", 
                    userId, completeEndpoint);
                return StatusCode(502, new { message = "Network error communicating with TickTick." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while completing TickTick task for user {UserId}", userId);
                return StatusCode(500, new { message = "An internal server error occurred." });
            }
        }

        // DELETE: api/integrations/ticktick/tasks/{projectId}/{taskId}
        [HttpDelete("ticktick/tasks/{projectId}/{taskId}")]
        public async Task<IActionResult> DeleteTickTickTask(string projectId, string taskId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User authentication failed." });
            }

            _logger.LogInformation("Deleting TickTick task for user {UserId}. ProjectId: {ProjectId}, TaskId: {TaskId}", 
                userId, projectId, taskId);

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
            var deleteEndpoint = $"{tickTickApiBaseUrl}/open/v1/project/{projectId}/task/{taskId}";

            using var httpClient = _httpClientFactory.CreateClient("TickTickApiClient");
            using var httpRequest = new HttpRequestMessage(HttpMethod.Delete, deleteEndpoint);
            httpRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

            try
            {
                using var response = await httpClient.SendAsync(httpRequest);
                
                if (response.IsSuccessStatusCode)
                {
                    _logger.LogInformation("Successfully deleted TickTick task for user {UserId}. TaskId: {TaskId}", userId, taskId);
                    return Ok(new { message = "Task deleted successfully." });
                }
                else
                {
                    var content = await response.Content.ReadAsStringAsync();
                    _logger.LogWarning("Failed to delete TickTick task for user {UserId}. Status: {StatusCode}, Response: {Content}", 
                        userId, response.StatusCode, content);
                    
                    string errorMessage = "Failed to delete task in TickTick.";
                    try
                    {
                        var errorResponse = JsonSerializer.Deserialize<TickTickErrorResponse>(content);
                        if (errorResponse != null && !string.IsNullOrEmpty(errorResponse.Error))
                        {
                            errorMessage = $"TickTick API Error: {errorResponse.Error} ({errorResponse.ErrorDescription ?? "-"})";
                        }
                    }
                    catch (JsonException) { /* Ignore */ }
                    
                    return StatusCode((int)response.StatusCode, new { message = errorMessage });
                }
            }
            catch (HttpRequestException ex)
            {
                _logger.LogError(ex, "HTTP request exception while deleting TickTick task for user {UserId}. Endpoint: {Endpoint}", 
                    userId, deleteEndpoint);
                return StatusCode(502, new { message = "Network error communicating with TickTick." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while deleting TickTick task for user {UserId}", userId);
                return StatusCode(500, new { message = "An internal server error occurred." });
            }
        }

        // Change route to be more specific
        [HttpPost("ticktick/projects/{projectId}/tasks")]
        public async Task<IActionResult> CreateTickTickTask(string projectId, [FromBody] TickTickTask request)
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { error = "User ID not found in token." });
                }

                // Get user's TickTick access token
                var credentials = await _integrationService.GetTickTickCredentialsAsync(userId);
                if (credentials == null || string.IsNullOrEmpty(credentials.AccessToken))
                {
                    return NotFound(new { error = "TickTick integration not found or invalid credentials." });
                }

                // Set the provided project ID
                request.ProjectId = projectId;

                // Create endpoint for TickTick API
                var tickTickApiUrl = _configuration["TickTick:ApiBaseUrl"] ?? "https://api.ticktick.com";
                var createTaskEndpoint = $"{tickTickApiUrl}/open/v1/task";

                // Configure HTTP Client for TickTick API request
                var client = _httpClientFactory.CreateClient();
                client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", credentials.AccessToken);

                // Make the API call to create the task
                var response = await client.PostAsJsonAsync(createTaskEndpoint, request);

                if (!response.IsSuccessStatusCode)
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    _logger.LogError("Failed to create TickTick task: {Error}", errorContent);
                    return StatusCode((int)response.StatusCode, new { error = $"Failed to create TickTick task: {errorContent}" });
                }

                // Parse and return the created task
                var createdTask = await response.Content.ReadFromJsonAsync<TickTickTask>();

                // Add null check here
                if (createdTask == null || string.IsNullOrEmpty(createdTask.Id))
                {
                    _logger.LogError("Failed to deserialize or invalid created task response from TickTick for user {UserId}", userId);
                    return StatusCode(500, new { error = "Failed to process response from TickTick after creating task." });
                }

                return CreatedAtAction(nameof(GetTickTickTaskById), new { projectId, taskId = createdTask.Id }, createdTask); // Use correct casing
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating TickTick task");
                return StatusCode(500, new { error = "An error occurred while creating the task." });
            }
        }

        // POST: api/integrations/ticktick/sync
        [HttpPost("ticktick/sync")]
        [ProducesResponseType(typeof(TaskSyncResult), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> SyncTickTickTasks([FromBody] TaskSyncRequest request)
        {
            string userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            
            try
            {
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { error = "User ID not found in token." });
                }
                
                _logger.LogInformation("Starting task sync for user {UserId} with direction {Direction}", 
                    userId, request.Direction);
                
                // 1. Get TickTick credentials
                var credentials = await _integrationService.GetTickTickCredentialsAsync(userId);
                    
                if (credentials == null)
                {
                    return BadRequest(new { error = "TickTick credentials not found. Please connect TickTick first." });
                }
                
                // Check if project ID was provided - required for all sync types
                if (string.IsNullOrEmpty(request.ProjectId))
                {
                    return BadRequest(new { error = "Project ID is required for task sync." });
                }
                
                // 2. Get existing mappings for this user
                var existingMappings = await _context.TaskSyncMappings
                    .IgnoreQueryFilters() // This will include mappings for soft-deleted tasks
                    .Where(m => m.UserId == userId && m.Provider == "TickTick")
                    .ToListAsync();
                    
                _logger.LogInformation("Found {Count} existing task mappings for user {UserId}", 
                    existingMappings.Count, userId);

                // 3. Get local tasks
                var localTasks = new List<TaskItem>();
                if (request.Direction == "to-ticktick") 
                {
                    // For to-ticktick sync, we only need non-deleted tasks
                    localTasks = await _context.Tasks
                        .Where(t => t.UserId == userId && !t.IsDeleted)
                        .ToListAsync();
                }
                else
                {
                    // For from-ticktick or two-way sync, we need all tasks including soft-deleted ones
                    localTasks = await _context.Tasks
                        .IgnoreQueryFilters()
                        .Where(t => t.UserId == userId)
                        .ToListAsync();
                }

                _logger.LogInformation("Retrieved {Count} local tasks for user {UserId}", localTasks.Count, userId);
                
                // 4. Get TickTick tasks - Use project/{projectId}/data endpoint instead of /task
                var tickTickTasks = new List<TickTickTask>();
                try
                {
                    var httpClient = _httpClientFactory.CreateClient();
                    httpClient.DefaultRequestHeaders.Authorization = 
                        new AuthenticationHeaderValue("Bearer", credentials.AccessToken);
                    
                    var tickTickApiUrl = _configuration["TickTick:ApiBaseUrl"] ?? "https://api.ticktick.com";
                    var taskEndpoint = $"{tickTickApiUrl}/open/v1/project/{request.ProjectId}/data";
                    
                    _logger.LogInformation("Fetching TickTick tasks from project {ProjectId} for sync", request.ProjectId);
                    var response = await httpClient.GetAsync(taskEndpoint);
                    response.EnsureSuccessStatusCode();
                    
                    var responseContent = await response.Content.ReadAsStringAsync();
                    var projectData = JsonSerializer.Deserialize<TickTickProjectData>(responseContent);
                    tickTickTasks = projectData?.Tasks ?? new List<TickTickTask>();
                    
                    _logger.LogInformation("Retrieved {Count} TickTick tasks for sync from project {ProjectId}", 
                        tickTickTasks.Count, request.ProjectId);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error fetching TickTick tasks for user {UserId} from project {ProjectId}", 
                        userId, request.ProjectId);
                    return StatusCode(502, new { message = "Failed to retrieve tasks from TickTick." });
                }
                
                // 5. Perform the sync based on direction
                var result = new TaskSyncResult();
                
                switch (request.Direction)
                {
                    case "two-way":
                        result = await PerformTwoWaySync(userId, localTasks, tickTickTasks, existingMappings, request);
                        break;
                    case "to-ticktick":
                        result = await PerformToTickTickSync(userId, localTasks, tickTickTasks, existingMappings, request);
                        break;
                    case "from-ticktick":
                        result = await PerformFromTickTickSync(userId, localTasks, tickTickTasks, existingMappings, request);
                        break;
                    default:
                        return BadRequest(new { message = "Invalid sync direction." });
                }
                
                // 6. Update the last sync time
                var now = DateTime.UtcNow;
                foreach (var mapping in existingMappings)
                {
                    mapping.LastSyncedAt = now;
                }
                
                await _context.SaveChangesAsync();
                
                _logger.LogInformation("Completed TickTick task sync for user {UserId}. Created: {Created}, Updated: {Updated}, Deleted: {Deleted}, Errors: {Errors}",
                    userId, result.Created, result.Updated, result.Deleted, result.Errors);
                
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during TickTick task sync for user {UserId}", userId);
                return StatusCode(500, new { message = "An unexpected error occurred during synchronization." });
            }
        }

        // GET: api/integrations/ticktick/sync/status
        [HttpGet("ticktick/sync/status")]
        [ProducesResponseType(typeof(TaskSyncStatus), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> GetTickTickSyncStatus([FromQuery] string? projectId = null)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User authentication failed." });
            }

            try
            {
                int tickTickTaskCount = 0;
                if (!string.IsNullOrEmpty(projectId))
                {
                    // Use the helper to fetch TickTick tasks for the selected project
                    var tickTickTasks = await FetchTickTickProjectTasksAsync(userId, projectId);
                    tickTickTaskCount = tickTickTasks?.Count ?? 0;
                }
                else 
                {
                    // Log that projectId was not provided, count will be 0
                    _logger.LogWarning("TickTick Sync Status requested without projectId for user {UserId}. Returning 0 for TickTick task count.", userId);
                }

                var mappings = await _context.TaskSyncMappings
                    .Where(m => m.UserId == userId && m.Provider == "TickTick")
                    .ToListAsync(); // Fetch all mappings to get the count

                var localTaskCount = await _context.Tasks
                    .Where(t => t.UserId == userId && !t.IsDeleted)
                    .CountAsync();

                var result = new TaskSyncStatus
                {
                    LastSynced = mappings.OrderByDescending(m => m.LastSyncedAt).FirstOrDefault()?.LastSyncedAt.ToString("o"),
                    TaskCount = new TaskSyncStatus.TaskCountInfo
                    {
                        Local = localTaskCount,
                        Mapped = mappings.Count,
                        TickTick = tickTickTaskCount // Use the actual count from the API call
                    }
                };

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving TickTick sync status for user {UserId}", userId);
                return StatusCode(500, new { message = "An error occurred while retrieving sync status." });
            }
        }

        // GET: api/integrations/ticktick/task-mappings
        [HttpGet("ticktick/task-mappings")]
        public async Task<IActionResult> GetTaskMappings()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User authentication failed." });
            }

            try
            {
                var mappings = await _context.TaskSyncMappings
                    .Where(m => m.UserId == userId && m.Provider == "TickTick")
                    .Select(m => new
                    {
                        localTaskId = m.LocalTaskId,
                        tickTickTaskId = m.TickTickTaskId,
                        lastSynced = m.LastSyncedAt.ToString("o")
                    })
                    .ToListAsync();
                
                return Ok(mappings);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving task mappings for user {UserId}", userId);
                return StatusCode(500, new { message = "An error occurred while retrieving task mappings." });
            }
        }

        // POST: api/integrations/ticktick/sync/reset
        [HttpPost("ticktick/sync/reset")]
        public async Task<IActionResult> ResetTickTickSync()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User authentication failed." });
            }

            try
            {
                var mappings = await _context.TaskSyncMappings
                    .Where(m => m.UserId == userId && m.Provider == "TickTick")
                    .ToListAsync();
                
                _context.TaskSyncMappings.RemoveRange(mappings);
                await _context.SaveChangesAsync();
                
                _logger.LogInformation("Reset TickTick sync data for user {UserId}. Removed {Count} mappings.", userId, mappings.Count);
                
                return Ok(new { message = "Sync data reset successfully." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error resetting sync data for user {UserId}", userId);
                return StatusCode(500, new { message = "An error occurred while resetting sync data." });
            }
        }

        // Helper method for two-way sync
        private async Task<TaskSyncResult> PerformTwoWaySync(
            string userId, 
            List<TaskItem> localTasks, 
            List<TickTickTask> tickTickTasks, 
            List<TaskSyncMapping> existingMappings, 
            TaskSyncRequest request)
        {
            var result = new TaskSyncResult();
            int created = 0, updated = 0, errors = 0;
            
            try
            {
                // 1. Process tasks that exist in both systems (have mappings)
                foreach (var mapping in existingMappings)
                {
                    try
                    {
                        var localTask = localTasks.FirstOrDefault(t => t.Id == mapping.LocalTaskId);
                        var tickTickTask = tickTickTasks.FirstOrDefault(t => t.Id == mapping.TickTickTaskId);
                        
                        // Handle deleted tasks in both systems
                        if (localTask == null && tickTickTask == null)
                        {
                            // Both tasks have been deleted - remove the mapping
                            _context.TaskSyncMappings.Remove(mapping);
                            continue;
                        }
                        else if (tickTickTask == null)
                        {
                            // TickTick task is deleted but local task exists
                            if (localTask?.IsDeleted == false)
                            {
                                // Local task is not deleted - create new TickTick task
                                var newTickTickTask = MapLocalTaskToTickTick(localTask, request.ProjectId);
                                var createdTickTickTask = await CreateTickTickTaskInternal(userId, newTickTickTask);
                                
                                if (createdTickTickTask != null)
                                {
                                    // Update mapping with new TickTick ID
                                    mapping.TickTickTaskId = createdTickTickTask.Id;
                                    mapping.LastSyncedAt = DateTime.UtcNow;
                                    created++;
                                }
                                else
                                {
                                    errors++;
                                }
                            }
                            else
                            {
                                // Both tasks are effectively deleted - remove mapping
                                _context.TaskSyncMappings.Remove(mapping);
                            }
                            continue;
                        }
                        else if (localTask == null)
                        {
                            // Local task doesn't exist, but TickTick task does
                            // Check if the local task may have been soft-deleted
                            var softDeletedTask = await _context.Tasks
                                .IgnoreQueryFilters()
                                .FirstOrDefaultAsync(t => t.Id == mapping.LocalTaskId && t.IsDeleted);
                                
                            if (softDeletedTask != null)
                            {
                                // Local task exists but is soft-deleted
                                // Restore the soft-deleted task and update it with TickTick data
                                softDeletedTask.IsDeleted = false;
                                UpdateLocalTaskFromTickTick(softDeletedTask, tickTickTask);
                                mapping.LastSyncedAt = DateTime.UtcNow;
                                updated++;
                            }
                            else
                            {
                                // Local task was hard-deleted or never existed
                                // Create a new local task from TickTick data
                                var newLocalTask = MapTickTickTaskToLocal(tickTickTask, userId);
                                _context.Tasks.Add(newLocalTask);
                                
                                // Update mapping with new local task ID
                                mapping.LocalTaskId = newLocalTask.Id;
                                mapping.LastSyncedAt = DateTime.UtcNow;
                                created++;
                            }
                            continue;
                        }
                        
                        // Both tasks exist - check which one was updated more recently
                        if (localTask.IsDeleted)
                        {
                            // Local task is soft-deleted - delete the TickTick task
                            var success = await DeleteTickTickTaskInternal(userId, request.ProjectId, tickTickTask.Id);
                            if (success)
                            {
                                // Remove the mapping since both tasks are now deleted
                                _context.TaskSyncMappings.Remove(mapping);
                            }
                            else
                            {
                                errors++;
                            }
                            continue;
                        }
                        
                        DateTime? localUpdateTime = localTask.UpdatedAt;
                        DateTime? tickTickUpdateTime = null;
                        
                        // Parse TickTick modification time if available
                        if (!string.IsNullOrEmpty(tickTickTask.ModifiedTime))
                        {
                            tickTickUpdateTime = DateTime.Parse(tickTickTask.ModifiedTime);
                        }
                        else if (!string.IsNullOrEmpty(tickTickTask.CreatedTime))
                        {
                            tickTickUpdateTime = DateTime.Parse(tickTickTask.CreatedTime);
                        }
                        
                        if (localUpdateTime > tickTickUpdateTime)
                        {
                            // Local task is more recent - update TickTick task
                            var updatedTickTickTask = MapLocalTaskToTickTick(localTask, request.ProjectId);
                            updatedTickTickTask.Id = tickTickTask.Id;
                            
                            var success = await UpdateTickTickTaskInternal(userId, updatedTickTickTask);
                            if (success)
                            {
                                mapping.LastSyncedAt = DateTime.UtcNow;
                                updated++;
                            }
                            else
                            {
                                errors++;
                            }
                        }
                        else
                        {
                            // TickTick task is more recent - update local task
                            UpdateLocalTaskFromTickTick(localTask, tickTickTask);
                            mapping.LastSyncedAt = DateTime.UtcNow;
                            updated++;
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error processing task mapping {MappingId}", mapping.Id);
                        errors++;
                    }
                }
                
                // 2. Process local tasks that don't have mappings (create in TickTick)
                var unmappedLocalTasks = localTasks
                    .Where(t => !t.IsDeleted && !existingMappings.Any(m => m.LocalTaskId == t.Id))
                    .ToList();
                    
                foreach (var localTask in unmappedLocalTasks)
                {
                    try
                    {
                        var newTickTickTask = MapLocalTaskToTickTick(localTask, request.ProjectId);
                        var createdTickTickTask = await CreateTickTickTaskInternal(userId, newTickTickTask);
                        
                        if (createdTickTickTask != null)
                        {
                            var newMapping = new TaskSyncMapping
                            {
                                UserId = userId,
                                LocalTaskId = localTask.Id,
                                TickTickTaskId = createdTickTickTask.Id,
                                Provider = "TickTick",
                                LastSyncedAt = DateTime.UtcNow
                            };
                            
                            _context.TaskSyncMappings.Add(newMapping);
                            existingMappings.Add(newMapping);
                            created++;
                        }
                        else
                        {
                            errors++;
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error creating TickTick task for local task {TaskId}", localTask.Id);
                        errors++;
                    }
                }
                
                // 3. Process TickTick tasks that don't have mappings (create locally)
                // More efficient query to find unmapped TickTick tasks
                var mappedTickTickIds = await _context.TaskSyncMappings
                    .Where(m => m.UserId == userId && m.Provider == "TickTick")
                    .Select(m => m.TickTickTaskId)
                    .ToListAsync();

                var unmappedTickTickTasks = tickTickTasks
                    .Where(t => !mappedTickTickIds.Contains(t.Id))
                    .ToList();

                _logger.LogInformation("Found {Count} unmapped TickTick tasks to sync", unmappedTickTickTasks.Count);
                
                foreach (var tickTickTask in unmappedTickTickTasks)
                {
                    try
                    {
                        // Check if a soft-deleted task exists with a mapping to this TickTick task ID
                        var existingMapping = await _context.TaskSyncMappings
                            .IgnoreQueryFilters()
                            .Include(m => m.LocalTask)
                            .FirstOrDefaultAsync(m => 
                                m.TickTickTaskId == tickTickTask.Id && 
                                m.Provider == "TickTick" && 
                                m.UserId == userId &&
                                m.LocalTask != null && 
                                m.LocalTask.IsDeleted);
                                
                        if (existingMapping != null)
                        {
                            // Found a mapping with a soft-deleted local task - restore it
                            existingMapping.LocalTask.IsDeleted = false;
                            existingMapping.LocalTask.DeletedAt = null;
                            
                            // Update task content from TickTick
                            UpdateLocalTaskFromTickTick(existingMapping.LocalTask, tickTickTask);
                            _context.Tasks.Update(existingMapping.LocalTask);
                            
                            // Update mapping timestamp
                            existingMapping.LastSyncedAt = DateTime.UtcNow;
                            updated++;
                            continue; // Skip creating a new task
                        }
                        
                        // Check if this might be a task that was previously mapped but got deleted locally
                        var existingLocalTask = await _context.Tasks
                            .IgnoreQueryFilters()
                            .FirstOrDefaultAsync(t => 
                                t.IsDeleted && 
                                t.UserId == userId && 
                                _context.TaskSyncMappings.Any(m => m.LocalTaskId == t.Id && m.TickTickTaskId == tickTickTask.Id));
                                
                        if (existingLocalTask != null)
                        {
                            // Restore the soft-deleted task and update it
                            existingLocalTask.IsDeleted = false;
                            existingLocalTask.DeletedAt = null;
                            UpdateLocalTaskFromTickTick(existingLocalTask, tickTickTask);
                            
                            // Update the mapping timestamp
                            var mapping = await _context.TaskSyncMappings.FirstAsync(m => m.LocalTaskId == existingLocalTask.Id);
                            mapping.LastSyncedAt = DateTime.UtcNow;
                            updated++;
                        }
                        else
                        {
                            // Check if an existing sync mapping exists but is not returned in our loaded mappings
                            var existingDbMapping = await _context.TaskSyncMappings
                                .FirstOrDefaultAsync(m => 
                                    m.TickTickTaskId == tickTickTask.Id && 
                                    m.Provider == "TickTick" && 
                                    m.UserId == userId);
                                    
                            if (existingDbMapping != null)
                            {
                                // Mapping exists in database but wasn't in our loaded list
                                // Check if the task was soft-deleted locally
                                var localTask = await _context.Tasks
                                    .IgnoreQueryFilters()
                                    .FirstOrDefaultAsync(t => t.Id == existingDbMapping.LocalTaskId);
                                
                                if (localTask != null)
                                {
                                    if (localTask.IsDeleted)
                                    {
                                        // The local task was soft-deleted - restore it since this is from-ticktick sync
                                        localTask.IsDeleted = false;
                                        localTask.DeletedAt = null;
                                        
                                        // Update content from TickTick
                                        UpdateLocalTaskFromTickTick(localTask, tickTickTask);
                                        _context.Tasks.Update(localTask);
                                        
                                        // Update mapping timestamp
                                        existingDbMapping.LastSyncedAt = DateTime.UtcNow;
                                        updated++;
                                    }
                                    else
                                    {
                                        // Task exists and is not deleted - update it
                                        UpdateLocalTaskFromTickTick(localTask, tickTickTask);
                                        _context.Tasks.Update(localTask);
                                        
                                        // Update mapping timestamp
                                        existingDbMapping.LastSyncedAt = DateTime.UtcNow;
                                        updated++;
                                    }
                                }
                                else
                                {
                                    // Local task doesn't exist anymore (hard-deleted) - create a new one
                                    var newLocalTask = MapTickTickTaskToLocal(tickTickTask, userId);
                                    _context.Tasks.Add(newLocalTask);
                                    await _context.SaveChangesAsync();
                                    
                                    // Update mapping to point to the new local task
                                    existingDbMapping.LocalTaskId = newLocalTask.Id;
                                    existingDbMapping.LastSyncedAt = DateTime.UtcNow;
                                    created++;
                                }
                            }
                            else
                            {
                                // No mapping exists - create a new local task
                                var newLocalTask = MapTickTickTaskToLocal(tickTickTask, userId);
                                
                                _context.Tasks.Add(newLocalTask);
                                await _context.SaveChangesAsync();
                                
                                // Create mapping record
                                var newMapping = new TaskSyncMapping
                                {
                                    UserId = userId,
                                    LocalTaskId = newLocalTask.Id,
                                    TickTickTaskId = tickTickTask.Id,
                                    Provider = "TickTick",
                                    LastSyncedAt = DateTime.UtcNow
                                };
                                
                                _context.TaskSyncMappings.Add(newMapping);
                                existingMappings.Add(newMapping);
                                created++;
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error processing TickTick task {TickTickTaskId} during sync", tickTickTask.Id);
                        errors++;
                    }
                }
                
                await _context.SaveChangesAsync();
                
                result.Success = true;
                result.Created = created;
                result.Updated = updated;
                result.Errors = errors;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during two-way sync");
                result.Success = false;
                result.Errors += 1;
                result.Message = $"Error during sync: {ex.Message}";
            }
            
            return result;
        }

        // Helper method for local to TickTick sync (one-way)
        private async Task<TaskSyncResult> PerformToTickTickSync(
            string userId, 
            List<TaskItem> localTasks, 
            List<TickTickTask> tickTickTasks, 
            List<TaskSyncMapping> existingMappings, 
            TaskSyncRequest request)
        {
            var result = new TaskSyncResult();
            int created = 0, updated = 0, errors = 0;
            
            try
            {
                // Filter out soft-deleted local tasks - don't sync deleted tasks to TickTick
                var nonDeletedLocalTasks = localTasks.Where(t => !t.IsDeleted).ToList();
                
                // Process local tasks - create or update them in TickTick
                foreach (var localTask in nonDeletedLocalTasks)
                {
                    try
                    {
                        // Check if this local task already has a mapping
                        var mapping = existingMappings.FirstOrDefault(m => m.LocalTaskId == localTask.Id);
                        
                        if (mapping == null)
                        {
                            // No mapping exists - create a new TickTick task
                            var newTickTickTask = MapLocalTaskToTickTick(localTask, request.ProjectId);
                            
                            // Call TickTick API to create task
                            var createdTickTickTask = await CreateTickTickTaskInternal(userId, newTickTickTask);
                            
                            if (createdTickTickTask != null)
                            {
                                // Create mapping record
                                var newMapping = new TaskSyncMapping
                                {
                                    UserId = userId,
                                    LocalTaskId = localTask.Id,
                                    TickTickTaskId = createdTickTickTask.Id,
                                    Provider = "TickTick",
                                    LastSyncedAt = DateTime.UtcNow
                                };
                                
                                _context.TaskSyncMappings.Add(newMapping);
                                existingMappings.Add(newMapping);
                                created++;
                            }
                            else
                            {
                                errors++;
                            }
                        }
                        else
                        {
                            // Mapping exists - update the TickTick task
                            var tickTickTask = tickTickTasks.FirstOrDefault(t => t.Id == mapping.TickTickTaskId);
                            
                            if (tickTickTask != null)
                            {
                                // Update TickTick task with local data
                                var updatedTickTickTask = MapLocalTaskToTickTick(localTask, request.ProjectId);
                                updatedTickTickTask.Id = tickTickTask.Id;
                                
                                // Call TickTick API to update task
                                var success = await UpdateTickTickTaskInternal(userId, updatedTickTickTask);
                                
                                if (success)
                                {
                                    mapping.LastSyncedAt = DateTime.UtcNow;
                                    updated++;
                                }
                                else
                                {
                                    errors++;
                                }
                            }
                            else
                            {
                                // TickTick task might have been deleted in TickTick
                                // Create a new one and update the mapping
                                var newTickTickTask = MapLocalTaskToTickTick(localTask, request.ProjectId);
                                
                                // Call TickTick API to create task
                                var createdTickTickTask = await CreateTickTickTaskInternal(userId, newTickTickTask);
                                
                                if (createdTickTickTask != null)
                                {
                                    // Update mapping with new TickTick task ID
                                    mapping.TickTickTaskId = createdTickTickTask.Id;
                                    mapping.LastSyncedAt = DateTime.UtcNow;
                                    created++;
                                }
                                else
                                {
                                    errors++;
                                }
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error syncing local task {TaskId} to TickTick", localTask.Id);
                        errors++;
                    }
                }
                
                await _context.SaveChangesAsync();
                
                result.Success = true;
                result.Created = created;
                result.Updated = updated;
                result.Errors = errors;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during one-way sync to TickTick");
                result.Success = false;
                result.Errors += 1;
                result.Message = $"Error during sync: {ex.Message}";
            }
            
            return result;
        }

        // Helper method for TickTick to local sync (one-way)
        private async Task<TaskSyncResult> PerformFromTickTickSync(
            string userId, 
            List<TaskItem> localTasks, 
            List<TickTickTask> tickTickTasks, 
            List<TaskSyncMapping> existingMappings, 
            TaskSyncRequest request)
        {
            // Ensure we don't process duplicate TickTick tasks which can lead to duplicate mapping inserts
            tickTickTasks = tickTickTasks
                .GroupBy(t => t.Id)
                .Select(g => g.First())
                .ToList();

            var result = new TaskSyncResult();
            int created = 0, updated = 0, errors = 0;
            
            try
            {
                // Process TickTick tasks - create or update them locally
                foreach (var tickTickTask in tickTickTasks)
                {
                    try
                    {
                        // Check if a soft-deleted task exists with a mapping to this TickTick task ID
                        var existingMapping = await _context.TaskSyncMappings
                            .IgnoreQueryFilters()
                            .Include(m => m.LocalTask)
                            .FirstOrDefaultAsync(m => 
                                m.TickTickTaskId == tickTickTask.Id && 
                                m.Provider == "TickTick" && 
                                m.UserId == userId &&
                                m.LocalTask != null && 
                                m.LocalTask.IsDeleted);
                                
                        if (existingMapping != null)
                        {
                            // Found a mapping with a soft-deleted local task - restore it
                            existingMapping.LocalTask.IsDeleted = false;
                            existingMapping.LocalTask.DeletedAt = null;
                            
                            // Update task content from TickTick
                            UpdateLocalTaskFromTickTick(existingMapping.LocalTask, tickTickTask);
                            _context.Tasks.Update(existingMapping.LocalTask);
                            
                            // Update mapping timestamp
                            existingMapping.LastSyncedAt = DateTime.UtcNow;
                            updated++;
                            continue; // Skip creating a new task
                        }
                        
                        // Check if this might be a task that was previously mapped but got deleted locally
                        var existingLocalTask = await _context.Tasks
                            .IgnoreQueryFilters()
                            .FirstOrDefaultAsync(t => 
                                t.IsDeleted && 
                                t.UserId == userId && 
                                _context.TaskSyncMappings.Any(m => m.LocalTaskId == t.Id && m.TickTickTaskId == tickTickTask.Id));
                                
                        if (existingLocalTask != null)
                        {
                            // Restore the soft-deleted task and update it
                            existingLocalTask.IsDeleted = false;
                            existingLocalTask.DeletedAt = null;
                            UpdateLocalTaskFromTickTick(existingLocalTask, tickTickTask);
                            
                            // Update the mapping timestamp
                            var mapping = await _context.TaskSyncMappings.FirstAsync(m => m.LocalTaskId == existingLocalTask.Id);
                            mapping.LastSyncedAt = DateTime.UtcNow;
                            updated++;
                        }
                        else
                        {
                            // Check if an existing sync mapping exists but is not returned in our loaded mappings
                            var existingDbMapping = await _context.TaskSyncMappings
                                .FirstOrDefaultAsync(m => 
                                    m.TickTickTaskId == tickTickTask.Id && 
                                    m.Provider == "TickTick" && 
                                    m.UserId == userId);
                                    
                            if (existingDbMapping != null)
                            {
                                // Mapping exists in database but wasn't in our loaded list
                                // Check if the task was soft-deleted locally
                                var localTask = await _context.Tasks
                                    .IgnoreQueryFilters()
                                    .FirstOrDefaultAsync(t => t.Id == existingDbMapping.LocalTaskId);
                                
                                if (localTask != null)
                                {
                                    if (localTask.IsDeleted)
                                    {
                                        // The local task was soft-deleted - restore it since this is from-ticktick sync
                                        localTask.IsDeleted = false;
                                        localTask.DeletedAt = null;
                                        
                                        // Update content from TickTick
                                        UpdateLocalTaskFromTickTick(localTask, tickTickTask);
                                        _context.Tasks.Update(localTask);
                                        
                                        // Update mapping timestamp
                                        existingDbMapping.LastSyncedAt = DateTime.UtcNow;
                                        updated++;
                                    }
                                    else
                                    {
                                        // Task exists and is not deleted - update it
                                        UpdateLocalTaskFromTickTick(localTask, tickTickTask);
                                        _context.Tasks.Update(localTask);
                                        
                                        // Update mapping timestamp
                                        existingDbMapping.LastSyncedAt = DateTime.UtcNow;
                                        updated++;
                                    }
                                }
                                else
                                {
                                    // Local task doesn't exist anymore (hard-deleted) - create a new one
                                    var newLocalTask = MapTickTickTaskToLocal(tickTickTask, userId);
                                    _context.Tasks.Add(newLocalTask);
                                    await _context.SaveChangesAsync();
                                    
                                    // Update mapping to point to the new local task
                                    existingDbMapping.LocalTaskId = newLocalTask.Id;
                                    existingDbMapping.LastSyncedAt = DateTime.UtcNow;
                                    created++;
                                }
                            }
                            else
                            {
                                // No mapping exists - create a new local task
                                var newLocalTask = MapTickTickTaskToLocal(tickTickTask, userId);
                                
                                _context.Tasks.Add(newLocalTask);
                                await _context.SaveChangesAsync();
                                
                                // Create mapping record
                                var newMapping = new TaskSyncMapping
                                {
                                    UserId = userId,
                                    LocalTaskId = newLocalTask.Id,
                                    TickTickTaskId = tickTickTask.Id,
                                    Provider = "TickTick",
                                    LastSyncedAt = DateTime.UtcNow
                                };
                                
                                _context.TaskSyncMappings.Add(newMapping);
                                existingMappings.Add(newMapping);
                                created++;
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error processing TickTick task {TickTickTaskId} during sync", tickTickTask.Id);
                        errors++;
                    }
                }
                
                await _context.SaveChangesAsync();
                
                result.Success = true;
                result.Created = created;
                result.Updated = updated;
                result.Errors = errors;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during one-way sync from TickTick");
                result.Success = false;
                result.Errors += 1;
                result.Message = $"Error during sync: {ex.Message}";
            }
            
            return result;
        }
        
        // Helper methods for task mapping and synchronization

        private TickTickTask MapLocalTaskToTickTick(TaskItem localTask, string projectId)
        {
            return new TickTickTask
            {
                ProjectId = projectId,
                Title = localTask.Title,
                Content = localTask.Description,
                Status = localTask.Status == Data.Entities.TaskStatus.Completed ? 2 : 0, // 0 for incomplete, 2 for completed
                Priority = (int)localTask.Priority, // Assuming priorities align
                DueDate = localTask.DueDate?.ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
                Tags = !string.IsNullOrEmpty(localTask.Tags) ? localTask.Tags.Split(',').ToList() : new List<string>()
            };
        }
        
        private TaskItem MapTickTickTaskToLocal(TickTickTask tickTickTask, string userId)
        {
            DateTime? dueDateParsed = null;
            if (!string.IsNullOrEmpty(tickTickTask.DueDate)) 
            {
                if (DateTime.TryParse(tickTickTask.DueDate, out var parsedDate)) 
                {
                    dueDateParsed = parsedDate;
                }
            }

            DateTime createdAt = DateTime.UtcNow;
            if (!string.IsNullOrEmpty(tickTickTask.CreatedTime)) 
            {
                if (DateTime.TryParse(tickTickTask.CreatedTime, out var parsedDate))
                {
                    createdAt = parsedDate;
                }
            }

            DateTime updatedAt = DateTime.UtcNow;
            if (!string.IsNullOrEmpty(tickTickTask.ModifiedTime))
            {
                if (DateTime.TryParse(tickTickTask.ModifiedTime, out var parsedDate))
                {
                    updatedAt = parsedDate;
                }
            }

            return new TaskItem
            {
                Id = Guid.NewGuid().ToString(),
                Title = tickTickTask.Title ?? string.Empty,
                Description = tickTickTask.Content ?? tickTickTask.Description ?? string.Empty,
                Status = tickTickTask.Status == 2 ? Data.Entities.TaskStatus.Completed : Data.Entities.TaskStatus.Incomplete,
                Priority = MapTickTickPriorityToLocal(tickTickTask.Priority),
                DueDate = dueDateParsed,
                Tags = tickTickTask.Tags != null ? string.Join(",", tickTickTask.Tags) : string.Empty,
                CreatedAt = createdAt,
                UpdatedAt = updatedAt,
                UserId = userId,
                IsDeleted = false
            };
        }
        
        private void UpdateLocalTaskFromTickTick(TaskItem localTask, TickTickTask tickTickTask)
        {
            localTask.Title = tickTickTask.Title ?? string.Empty;
            localTask.Description = tickTickTask.Content ?? tickTickTask.Description ?? string.Empty;
            localTask.Status = tickTickTask.Status == 2 ? Data.Entities.TaskStatus.Completed : Data.Entities.TaskStatus.Incomplete;
            localTask.Priority = MapTickTickPriorityToLocal(tickTickTask.Priority);
            
            // Safely parse the due date
            if (!string.IsNullOrEmpty(tickTickTask.DueDate) && DateTime.TryParse(tickTickTask.DueDate, out var parsedDueDate))
            {
                localTask.DueDate = parsedDueDate;
            }
            else
            {
                localTask.DueDate = null;
            }
            
            localTask.Tags = tickTickTask.Tags != null ? string.Join(",", tickTickTask.Tags) : string.Empty;
            localTask.UpdatedAt = DateTime.UtcNow;
        }
        
        private Data.Entities.TaskPriority MapTickTickPriorityToLocal(int tickTickPriority)
        {
            // TickTick priority: 1 (low), 3 (medium), 5 (high)
            // Local priority: Low (1), Medium (2), High (3)
            return tickTickPriority switch
            {
                5 => Data.Entities.TaskPriority.High,
                3 => Data.Entities.TaskPriority.Medium,
                _ => Data.Entities.TaskPriority.Low
            };
        }
        
        private bool ShouldUpdateTickTick(TaskItem localTask, TickTickTask tickTickTask, string resolutionStrategy)
        {
            // Convert timestamps to DateTime for comparison
            DateTime localUpdated = localTask.UpdatedAt;
            DateTime tickTickUpdated = string.IsNullOrEmpty(tickTickTask.ModifiedTime) 
                ? DateTime.MinValue 
                : DateTime.Parse(tickTickTask.ModifiedTime);
                
            switch (resolutionStrategy)
            {
                case "newer":
                    return localUpdated > tickTickUpdated;
                case "ticktick":
                    return false; // Never update TickTick in this strategy
                case "secondbrain":
                    return true; // Always update TickTick in this strategy
                default:
                    return localUpdated > tickTickUpdated; // Default to newer
            }
        }
        
        private bool ShouldUpdateLocal(TaskItem localTask, TickTickTask tickTickTask, string resolutionStrategy)
        {
            // Convert timestamps to DateTime for comparison
            DateTime localUpdated = localTask.UpdatedAt;
            DateTime tickTickUpdated = string.IsNullOrEmpty(tickTickTask.ModifiedTime) 
                ? DateTime.MinValue 
                : DateTime.Parse(tickTickTask.ModifiedTime);
                
            switch (resolutionStrategy)
            {
                case "newer":
                    return tickTickUpdated > localUpdated;
                case "ticktick":
                    return true; // Always update local in this strategy
                case "secondbrain":
                    return false; // Never update local in this strategy
                default:
                    return tickTickUpdated > localUpdated; // Default to newer
            }
        }
        
        private async Task<TickTickTask?> CreateTickTickTaskInternal(string userId, TickTickTask task)
        {
            try
            {
                var credentials = await _integrationService.GetTickTickCredentialsAsync(userId);
                if (credentials == null) return null;
                
                var tickTickApiUrl = _configuration["TickTick:ApiBaseUrl"] ?? "https://api.ticktick.com";
                var createTaskEndpoint = $"{tickTickApiUrl}/open/v1/task";
                
                var httpClient = _httpClientFactory.CreateClient();
                httpClient.DefaultRequestHeaders.Authorization = 
                    new AuthenticationHeaderValue("Bearer", credentials.AccessToken);
                
                var response = await httpClient.PostAsJsonAsync(createTaskEndpoint, task);
                if (!response.IsSuccessStatusCode) return null;
                
                return await response.Content.ReadFromJsonAsync<TickTickTask>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating TickTick task for user {UserId}", userId);
                return null;
            }
        }
        
        private async Task<bool> UpdateTickTickTaskInternal(string userId, TickTickTask task)
        {
            try
            {
                var credentials = await _integrationService.GetTickTickCredentialsAsync(userId);
                if (credentials == null) return false;
                
                var tickTickApiUrl = _configuration["TickTick:ApiBaseUrl"] ?? "https://api.ticktick.com";
                var updateEndpoint = $"{tickTickApiUrl}/open/v1/task/{task.Id}";
                
                var httpClient = _httpClientFactory.CreateClient();
                httpClient.DefaultRequestHeaders.Authorization = 
                    new AuthenticationHeaderValue("Bearer", credentials.AccessToken);
                
                var content = new StringContent(
                    JsonSerializer.Serialize(task),
                    Encoding.UTF8,
                    "application/json"
                );
                
                var response = await httpClient.PostAsync(updateEndpoint, content);
                return response.IsSuccessStatusCode;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating TickTick task {TaskId} for user {UserId}", task.Id, userId);
                return false;
            }
        }

        // Add this helper method for TickTick task deletion
        private async Task<bool> DeleteTickTickTaskInternal(string userId, string projectId, string taskId)
        {
            try
            {
                var credentials = await _integrationService.GetTickTickCredentialsAsync(userId);
                if (credentials == null) return false;
                
                var tickTickApiUrl = _configuration["TickTick:ApiBaseUrl"] ?? "https://api.ticktick.com";
                var deleteEndpoint = $"{tickTickApiUrl}/open/v1/project/{projectId}/task/{taskId}";
                
                var httpClient = _httpClientFactory.CreateClient();
                httpClient.DefaultRequestHeaders.Authorization = 
                    new AuthenticationHeaderValue("Bearer", credentials.AccessToken);
                
                var response = await httpClient.DeleteAsync(deleteEndpoint);
                return response.IsSuccessStatusCode;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting TickTick task {TaskId} for user {UserId}", taskId, userId);
                return false;
            }
        }

        // Helper method to fetch tasks from a specific TickTick project
        private async Task<List<TickTickTask>?> FetchTickTickProjectTasksAsync(string userId, string projectId)
        {
             // --- 1. Get Credentials --- 
            var credentials = await _integrationService.GetTickTickCredentialsAsync(userId);
            if (credentials == null)
            {
                _logger.LogWarning("Cannot fetch TickTick tasks for project {ProjectId}, credentials missing for user {UserId}", projectId, userId);
                return null; // Indicate credentials missing
            }

            // --- 2. Check Token Expiry & Refresh ---
            if (credentials.ExpiresAt <= DateTime.UtcNow.AddMinutes(1))
            {
                _logger.LogWarning("TickTick token expired or nearing expiry for user {UserId}. Refresh needed.", userId);
                // TODO: Implement proper refresh token logic here
                // For now, return null to indicate failure due to expiry
                return null; 
            }

            var accessToken = credentials.AccessToken;
            var tickTickApiBaseUrl = _configuration["TickTick:ApiBaseUrl"] ?? "https://api.ticktick.com";
            var tasksEndpoint = $"{tickTickApiBaseUrl}/open/v1/project/{projectId}/data";

            _logger.LogInformation("Fetching tasks from TickTick project {ProjectId} for user {UserId}.", projectId, userId);
            using var httpClient = _httpClientFactory.CreateClient("TickTickApiClient");
            
            using var requestMessage = new HttpRequestMessage(HttpMethod.Get, tasksEndpoint);
            requestMessage.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

            try
            {
                using var response = await httpClient.SendAsync(requestMessage);
                var responseContent = await response.Content.ReadAsStringAsync();

                if (response.IsSuccessStatusCode)
                {
                    _logger.LogInformation("Successfully fetched tasks from TickTick project {ProjectId} for user {UserId}", projectId, userId);
                    try 
                    {
                        var projectData = JsonSerializer.Deserialize<TickTickProjectData>(responseContent);
                        return projectData?.Tasks ?? new List<TickTickTask>();
                    }
                    catch (JsonException jsonEx)
                    {
                        _logger.LogError(jsonEx, "Failed to deserialize TickTick project data for user {UserId}, project {ProjectId}. Content: {ResponseContent}", userId, projectId, responseContent);
                        return null; // Indicate deserialization error
                    }
                }
                else
                {
                    _logger.LogWarning("Failed to fetch tasks from TickTick project {ProjectId} for user {UserId}. Status: {StatusCode}, Response: {ResponseContent}", projectId, userId, response.StatusCode, responseContent);
                    // You might want to throw an exception here or return null depending on how you want to handle API errors
                    return null; // Indicate API error
                }
            }
            catch (HttpRequestException ex)
            {
                _logger.LogError(ex, "HTTP request exception while fetching TickTick project tasks for user {UserId}, project {ProjectId}. Endpoint: {Endpoint}", userId, projectId, tasksEndpoint);
                return null; // Indicate network error
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while fetching TickTick project tasks for user {UserId}, project {ProjectId}", userId, projectId);
                return null; // Indicate unexpected error
            }
        }
    }
} 