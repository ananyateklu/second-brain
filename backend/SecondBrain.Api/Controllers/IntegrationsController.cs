using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SecondBrain.Api.Models.Integrations;
using SecondBrain.Api.Services.Interfaces;
using SecondBrain.Api.Services;
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
        private readonly IActivityLogger _activityLogger;

        public IntegrationsController(
            IIntegrationService integrationService,
            IHttpClientFactory httpClientFactory,
            IConfiguration configuration,
            ILogger<IntegrationsController> logger,
            DataContext context,
            IActivityLogger activityLogger)
        {
            _integrationService = integrationService;
            _httpClientFactory = httpClientFactory;
            _configuration = configuration;
            _logger = logger;
            _context = context;
            _activityLogger = activityLogger;
        }

        // Add a new model for sync requests
        public class TaskSyncRequest
        {
            public string ResolutionStrategy { get; set; } = "newer"; // "newer", "ticktick", "secondbrain", "ask"
            public bool IncludeTags { get; set; } = true;
            public required string ProjectId { get; set; } // Add this property
            public string SyncType { get; set; } = "tasks"; // Default to tasks if not specified
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
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { error = "Invalid user credentials." });
            }
            
            // Get the code from the request body
            var code = request.Code;
            if (string.IsNullOrEmpty(code))
            {
                return BadRequest(new { error = "Authorization code is required." });
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
                { "code", code },
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
                        // If successful, log the activity
                        await _activityLogger.LogActivityAsync(
                            userId,
                            "CONNECT",
                            "INTEGRATION",
                            "TICKTICK",
                            "TickTick Integration",
                            "Connected TickTick account",
                            new { provider = "TickTick" });
                        
                        return Ok(new { success = true });
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
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { error = "Invalid user credentials." });
            }

            _logger.LogInformation("Attempting to disconnect TickTick for user {UserId}", userId);

            bool deleteSuccess = await _integrationService.DeleteTickTickCredentialsAsync(userId);

            if (deleteSuccess)
            {
                _logger.LogInformation("TickTick disconnected successfully for user {UserId}", userId);
                // TODO: Potentially call TickTick API to revoke the token if their API supports it.
                // If successful, log the activity
                await _activityLogger.LogActivityAsync(
                    userId,
                    "DISCONNECT",
                    "INTEGRATION",
                    "TICKTICK",
                    "TickTick Integration",
                    "Disconnected TickTick account",
                    new { provider = "TickTick" });
                
                return Ok(new { success = true });
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
        public async Task<IActionResult> GetTickTickProjects([FromQuery] string? kind = null)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User authentication failed." });
            }

            _logger.LogInformation("Fetching TickTick projects for user {UserId} with kind filter: {Kind}", userId, kind ?? "all");

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
                    var allProjects = JsonSerializer.Deserialize<List<TickTickProject>>(content) ?? new List<TickTickProject>();
                    
                    // Filter projects by kind if specified
                    if (!string.IsNullOrEmpty(kind))
                    {
                        var filteredProjects = allProjects.Where(p => string.Equals(p.Kind, kind, StringComparison.OrdinalIgnoreCase)).ToList();
                        return Ok(filteredProjects);
                    }
                    
                    return Ok(allProjects);
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
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { error = "Invalid user credentials." });
            }

            if (string.IsNullOrEmpty(request?.Id) || string.IsNullOrEmpty(request?.ProjectId))
            {
                return BadRequest(new { message = "Task ID and Project ID are required." });
            }

            _logger.LogInformation("Updating TickTick item for user {UserId}. TaskId: {TaskId}, ProjectId: {ProjectId}", 
                userId, taskId, request.ProjectId);

            // Verify taskId in path matches taskId in request body
            if (taskId != request.Id)
            {
                return BadRequest(new { message = "Task ID in path must match Task ID in request body." });
            }

            // Fetch project details to determine type for logging
            var project = await GetTickTickProjectAsync(userId, request.ProjectId);
            var entityType = project?.Kind?.Equals("NOTE", StringComparison.OrdinalIgnoreCase) == true 
                ? "TICKTICK_NOTE" 
                : "TICKTICK_TASK"; // Default to TASK

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
                        // Log the activity for task update using dynamic entityType
                        await _activityLogger.LogActivityAsync(
                            userId,
                            "UPDATE",
                            entityType, // Use dynamic entity type
                            request.Id,
                            request.Title,
                            $"Updated TickTick item in project {request.ProjectId}", // Use generic "item"
                            new { 
                                projectId = request.ProjectId,
                                kind = project?.Kind ?? "Unknown", // Log the kind
                                dueDate = request.DueDate,
                                priority = request.Priority,
                                tags = request.Tags
                            });
                        
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
                    _logger.LogWarning("Failed to update TickTick item for user {UserId}. Status: {StatusCode}, Response: {Content}", 
                        userId, response.StatusCode, content);
                    
                    string errorMessage = "Failed to update item in TickTick.";
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
                _logger.LogError(ex, "HTTP request exception while updating TickTick item for user {UserId}. Endpoint: {Endpoint}", 
                    userId, updateEndpoint);
                return StatusCode(502, new { message = "Network error communicating with TickTick." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while updating TickTick item for user {UserId}", userId);
                return StatusCode(500, new { message = "An internal server error occurred." });
            }
        }

        // POST: api/integrations/ticktick/tasks/{projectId}/{taskId}/complete
        [HttpPost("ticktick/tasks/{projectId}/{taskId}/complete")]
        public async Task<IActionResult> CompleteTickTickTask(string projectId, string taskId)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { error = "Invalid user credentials." });
            }

            _logger.LogInformation("Completing TickTick item for user {UserId}. ProjectId: {ProjectId}, TaskId: {TaskId}", 
                userId, projectId, taskId);
                
            // Fetch project details to determine type for logging
            var project = await GetTickTickProjectAsync(userId, projectId);
            var entityType = project?.Kind?.Equals("NOTE", StringComparison.OrdinalIgnoreCase) == true 
                ? "TICKTICK_NOTE" 
                : "TICKTICK_TASK"; // Default to TASK

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
                    _logger.LogInformation("Successfully completed TickTick item for user {UserId}. TaskId: {TaskId}", userId, taskId);
                    // Get task details for logging - we need the title
                    var task = await GetTickTickTaskDetails(userId, projectId, taskId);
                    // if (task == null)
                    // {
                    //     // Task might already be deleted or inaccessible after completion, handle gracefully
                    //     _logger.LogWarning("Could not retrieve details for completed TickTick item {TaskId} for logging.", taskId);
                    //     // Still log the activity, but maybe with a placeholder title
                    // }
                    
                    // Log the activity for task completion using dynamic entityType
                    await _activityLogger.LogActivityAsync(
                        userId,
                        "COMPLETE",
                        entityType, // Use dynamic entity type
                        taskId,
                        task?.Title ?? "Completed Item", // Use placeholder if task details not found
                        $"Completed TickTick item in project {projectId}", // Use generic "item"
                        new { 
                            projectId = projectId,
                            kind = project?.Kind ?? "Unknown" // Log the kind
                         });
                    
                    return Ok(new { success = true });
                }
                else
                {
                    var content = await response.Content.ReadAsStringAsync();
                    _logger.LogWarning("Failed to complete TickTick item for user {UserId}. Status: {StatusCode}, Response: {Content}", 
                        userId, response.StatusCode, content);
                    
                    string errorMessage = "Failed to complete item in TickTick.";
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
                _logger.LogError(ex, "HTTP request exception while completing TickTick item for user {UserId}. Endpoint: {Endpoint}", 
                    userId, completeEndpoint);
                return StatusCode(502, new { message = "Network error communicating with TickTick." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while completing TickTick item for user {UserId}", userId);
                return StatusCode(500, new { message = "An internal server error occurred." });
            }
        }

        // DELETE: api/integrations/ticktick/tasks/{projectId}/{taskId}
        [HttpDelete("ticktick/tasks/{projectId}/{taskId}")]
        public async Task<IActionResult> DeleteTickTickTask(string projectId, string taskId)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { error = "Invalid user credentials." });
            }

            // Fetch project details to determine type for logging BEFORE attempting deletion
            var project = await GetTickTickProjectAsync(userId, projectId);
             var entityType = project?.Kind?.Equals("NOTE", StringComparison.OrdinalIgnoreCase) == true 
                ? "TICKTICK_NOTE" 
                : "TICKTICK_TASK"; // Default to TASK

            // Get task details for logging BEFORE deletion
            var task = await GetTickTickTaskDetails(userId, projectId, taskId);
            var taskTitleForLog = task?.Title ?? "Deleted Item"; // Get title before deletion

            _logger.LogInformation("Deleting TickTick item for user {UserId}. ProjectId: {ProjectId}, TaskId: {TaskId}", 
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
                    _logger.LogInformation("Successfully deleted TickTick item for user {UserId}. TaskId: {TaskId}", userId, taskId);
                   
                    // Log the activity for task deletion using dynamic entityType
                    await _activityLogger.LogActivityAsync(
                        userId,
                        "DELETE",
                        entityType, // Use dynamic entity type
                        taskId,
                        taskTitleForLog, // Use title fetched before deletion
                        $"Deleted TickTick item from project {projectId}", // Use generic "item"
                         new { 
                            projectId = projectId,
                            kind = project?.Kind ?? "Unknown" // Log the kind
                         });
                    
                    return Ok(new { success = true });
                }
                else
                {
                    var content = await response.Content.ReadAsStringAsync();
                    _logger.LogWarning("Failed to delete TickTick item for user {UserId}. Status: {StatusCode}, Response: {Content}", 
                        userId, response.StatusCode, content);
                    
                    string errorMessage = "Failed to delete item in TickTick.";
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
                _logger.LogError(ex, "HTTP request exception while deleting TickTick item for user {UserId}. Endpoint: {Endpoint}", 
                    userId, deleteEndpoint);
                return StatusCode(502, new { message = "Network error communicating with TickTick." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while deleting TickTick item for user {UserId}", userId);
                return StatusCode(500, new { message = "An internal server error occurred." });
            }
        }

        // Change route to be more specific
        [HttpPost("ticktick/projects/{projectId}/tasks")]
        public async Task<IActionResult> CreateTickTickTask(string projectId, [FromBody] TickTickTask request)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { error = "Invalid user credentials." });
            }
            
            // Fetch project details to determine type for logging
            var project = await GetTickTickProjectAsync(userId, projectId);
            var entityType = project?.Kind?.Equals("NOTE", StringComparison.OrdinalIgnoreCase) == true 
                ? "TICKTICK_NOTE" 
                : "TICKTICK_TASK"; // Default to TASK if kind is unknown or fetch fails

            try
            {
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

                // Log the activity for task creation using the determined entityType
                await _activityLogger.LogActivityAsync(
                    userId,
                    "CREATE",
                    entityType, // Use dynamic entity type
                    createdTask.Id,
                    createdTask.Title,
                    $"Created TickTick item in project {projectId}", // Use generic "item"
                    new { 
                        projectId = projectId,
                        kind = project?.Kind ?? "Unknown", // Log the kind
                        dueDate = createdTask.DueDate,
                        priority = createdTask.Priority,
                        tags = createdTask.Tags
                    });
                
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
            string? userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            
            try
            {
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { error = "Invalid user credentials." });
                }
                
                // Validate the sync type
                string syncType = request.SyncType?.ToLowerInvariant() ?? "tasks";
                if (syncType != "tasks" && syncType != "notes")
                {
                    return BadRequest(new { error = "Invalid sync type. Must be 'tasks' or 'notes'." });
                }
                
                _logger.LogInformation("Starting {SyncType} sync for user {UserId} with strategy {Strategy}", 
                    syncType, userId, request.ResolutionStrategy);
                
                // 1. Get TickTick credentials
                var credentials = await _integrationService.GetTickTickCredentialsAsync(userId);
                    
                if (credentials == null)
                {
                    return BadRequest(new { error = "TickTick credentials not found. Please connect TickTick first." });
                }
                
                // Check if project ID was provided - required for all sync types
                if (string.IsNullOrEmpty(request.ProjectId))
                {
                    return BadRequest(new { error = $"Project ID is required for {syncType} sync." });
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
                if (request.ResolutionStrategy == "from-ticktick") 
                {
                    // For from-ticktick sync, we only need non-deleted tasks
                    localTasks = await _context.Tasks
                        .Where(t => t.UserId == userId && !t.IsDeleted)
                        .ToListAsync();
                }
                else
                {
                    // For two-way or ask sync, we need all tasks including soft-deleted ones
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
                    
                    _logger.LogInformation("Fetching TickTick {SyncType} from project {ProjectId} for sync", 
                        syncType, request.ProjectId);
                    var response = await httpClient.GetAsync(taskEndpoint);
                    response.EnsureSuccessStatusCode();
                    
                    var responseContent = await response.Content.ReadAsStringAsync();
                    var projectData = JsonSerializer.Deserialize<TickTickProjectData>(responseContent);
                    tickTickTasks = projectData?.Tasks ?? new List<TickTickTask>();
                    
                    _logger.LogInformation("Retrieved {Count} TickTick items for {SyncType} sync from project {ProjectId}", 
                        tickTickTasks.Count, syncType, request.ProjectId);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error fetching TickTick {SyncType} for user {UserId} from project {ProjectId}", 
                        syncType, userId, request.ProjectId);
                    return StatusCode(502, new { message = $"Failed to retrieve {syncType} from TickTick." });
                }
                
                // 5. Perform the sync based on direction
                var result = new TaskSyncResult();
                
                // Always perform sync from TickTick to local
                result = await PerformFromTickTickSync(userId, localTasks, tickTickTasks, existingMappings, request);
                
                // 6. Update the last sync time
                var now = DateTime.UtcNow;
                foreach (var mapping in existingMappings)
                {
                    mapping.LastSyncedAt = now;
                }
                
                await _context.SaveChangesAsync();
                
                _logger.LogInformation("Completed TickTick {SyncType} sync for user {UserId}. Created: {Created}, Updated: {Updated}, Deleted: {Deleted}, Errors: {Errors}",
                    syncType, userId, result.Created, result.Updated, result.Deleted, result.Errors);
                
                // Log the activity for task sync
                await _activityLogger.LogActivityAsync(
                    userId,
                    "SYNC",
                    "TICKTICK_INTEGRATION",
                    request.ProjectId,
                    "TickTick Sync",
                    $"Synchronized {syncType} with TickTick ({result.Created} created, {result.Updated} updated, {result.Deleted} deleted)",
                    new { 
                        projectId = request.ProjectId,
                        syncType = syncType,
                        direction = request.ResolutionStrategy,
                        created = result.Created,
                        updated = result.Updated,
                        deleted = result.Deleted,
                        errors = result.Errors
                    });
                
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during TickTick sync for user {UserId}", userId);
                return StatusCode(500, new { message = "An unexpected error occurred during synchronization." });
            }
        }

        // GET: api/integrations/ticktick/sync/status
        [HttpGet("ticktick/sync/status")]
        [ProducesResponseType(typeof(TaskSyncStatus), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> GetTickTickSyncStatus([FromQuery] string? projectId = null, [FromQuery] string? syncType = null)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User authentication failed." });
            }

            try
            {
                // Default to tasks if not specified
                syncType = syncType?.ToLowerInvariant() ?? "tasks";
                
                if (syncType != "tasks" && syncType != "notes")
                {
                    return BadRequest(new { message = "Invalid sync type. Must be 'tasks' or 'notes'." });
                }
                
                _logger.LogInformation("Getting {SyncType} sync status for user {UserId}", syncType, userId);
                
                int tickTickItemCount = 0;
                if (!string.IsNullOrEmpty(projectId))
                {
                    // Use the helper to fetch TickTick tasks for the selected project
                    var tickTickTasks = await FetchTickTickProjectTasksAsync(userId, projectId);
                    tickTickItemCount = tickTickTasks?.Count ?? 0;
                }
                else 
                {
                    // Log that projectId was not provided, count will be 0
                    _logger.LogWarning("TickTick Sync Status requested without projectId for user {UserId}. Returning 0 for TickTick item count.", userId);
                }

                // Get mappings for this specific operation type (task or note)
                var mappings = await _context.TaskSyncMappings
                    .Where(m => m.UserId == userId && m.Provider == "TickTick")
                    .ToListAsync(); // Fetch all mappings to get the count

                // Get local items count based on sync type
                int localItemCount;
                if (syncType == "notes")
                {
                    localItemCount = await _context.Notes
                        .Where(n => n.UserId == userId && !n.IsDeleted && !n.IsArchived)
                        .CountAsync();
                }
                else // tasks
                {
                    localItemCount = await _context.Tasks
                        .Where(t => t.UserId == userId && !t.IsDeleted)
                        .CountAsync();
                }

                var result = new TaskSyncStatus
                {
                    LastSynced = mappings.OrderByDescending(m => m.LastSyncedAt).FirstOrDefault()?.LastSyncedAt.ToString("o"),
                    TaskCount = new TaskSyncStatus.TaskCountInfo
                    {
                        Local = localItemCount,
                        Mapped = mappings.Count,
                        TickTick = tickTickItemCount // Use the actual count from the API call
                    }
                };

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving TickTick {SyncType} sync status for user {UserId}", syncType ?? "tasks", userId);
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
            
            // Check if we're syncing notes or tasks
            bool isSyncingNotes = request.SyncType?.ToLower() == "notes";
            
            if (isSyncingNotes)
            {
                _logger.LogInformation("Performing notes sync from TickTick for user {UserId}", userId);
            }
            else
            {
                _logger.LogInformation("Performing tasks sync from TickTick for user {UserId}", userId);
            }
            
            try
            {
                // Process TickTick tasks - create or update them locally
                foreach (var tickTickTask in tickTickTasks)
                {
                    try
                    {
                        if (isSyncingNotes)
                        {
                            // Handle note syncing
                            await SyncNoteFromTickTick(userId, tickTickTask, request.IncludeTags);
                            created++; // For simplicity, we're just counting created for now
                        }
                        else
                        {
                            // Original code for task syncing
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
                                    
                            if (existingMapping != null && existingMapping.LocalTask != null)
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
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error processing TickTick {ItemType} {TickTickItemId} during sync", 
                            isSyncingNotes ? "note" : "task", tickTickTask.Id);
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
        
        // Add new method for syncing notes from TickTick
        private async Task<Note> SyncNoteFromTickTick(string userId, TickTickTask tickTickNote, bool includeTags)
        {
            // Check if note already exists by matching the TickTick ID in metadata
            string metadataToMatch = $"\"tickTickId\":\"{tickTickNote.Id}\"";
            var existingNote = await _context.Notes
                .FirstOrDefaultAsync(n => 
                    n.UserId == userId && 
                    (n.Metadata != null && n.Metadata.Contains(metadataToMatch)));
                    
            if (existingNote != null)
            {
                // Update existing note
                existingNote.Title = tickTickNote.Title ?? string.Empty;
                existingNote.Content = tickTickNote.Content ?? tickTickNote.Description ?? string.Empty;
                existingNote.UpdatedAt = DateTime.UtcNow;
                
                // Update tags if requested
                if (includeTags && tickTickNote.Tags != null && tickTickNote.Tags.Any())
                {
                    existingNote.Tags = string.Join(",", tickTickNote.Tags);
                }
                
                // Update the metadata to include updated time from TickTick
                existingNote.Metadata = JsonSerializer.Serialize(new
                {
                    tickTickId = tickTickNote.Id,
                    tickTickProjectId = tickTickNote.ProjectId,
                    lastSyncedAt = DateTime.UtcNow,
                    tickTickModifiedTime = tickTickNote.ModifiedTime
                });
                
                _context.Notes.Update(existingNote);
                await _context.SaveChangesAsync();
                
                return existingNote;
            }
            else
            {
                // Create new note
                var newNote = new Note
                {
                    Id = Guid.NewGuid().ToString(),
                    Title = tickTickNote.Title ?? "Untitled TickTick Note",
                    Content = tickTickNote.Content ?? tickTickNote.Description ?? string.Empty,
                    UserId = userId,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    IsPinned = false,
                    IsFavorite = false,
                    IsArchived = false,
                    IsDeleted = false
                };
                
                // Add tags if available and requested
                if (includeTags && tickTickNote.Tags != null && tickTickNote.Tags.Any())
                {
                    newNote.Tags = string.Join(",", tickTickNote.Tags);
                }
                
                // Store TickTick-specific metadata for future sync
                newNote.Metadata = JsonSerializer.Serialize(new
                {
                    tickTickId = tickTickNote.Id,
                    tickTickProjectId = tickTickNote.ProjectId,
                    lastSyncedAt = DateTime.UtcNow,
                    tickTickCreatedTime = tickTickNote.CreatedTime,
                    tickTickModifiedTime = tickTickNote.ModifiedTime
                });
                
                _context.Notes.Add(newNote);
                await _context.SaveChangesAsync();
                
                // Log the activity for new note creation
                await _activityLogger.LogActivityAsync(
                    userId,
                    "CREATE",
                    "NOTE",
                    newNote.Id,
                    newNote.Title,
                    $"Created note from TickTick: {newNote.Title}",
                    new { 
                        tickTickId = tickTickNote.Id,
                        tickTickProjectId = tickTickNote.ProjectId
                    });
                
                return newNote;
            }
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

        // Helper method to get TickTick task details for logging
        private async Task<TickTickTask?> GetTickTickTaskDetails(string userId, string projectId, string taskId)
        {
            try
            {
                var credentials = await _integrationService.GetTickTickCredentialsAsync(userId);
                if (credentials == null)
                {
                    return null;
                }
                
                // Create HTTP client with appropriate headers
                var client = _httpClientFactory.CreateClient();
                client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue(
                    "Bearer", credentials.AccessToken);
                    
                // Get task details from TickTick API
                var response = await client.GetAsync($"https://api.ticktick.com/open/v1/project/{projectId}/task/{taskId}");
                if (!response.IsSuccessStatusCode)
                {
                    return null;
                }
                
                var content = await response.Content.ReadAsStringAsync();
                var task = System.Text.Json.JsonSerializer.Deserialize<TickTickTask>(content);
                return task;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting TickTick task details for logging");
                return null;
            }
        }

        // Helper method to get details for a single TickTick project
        private async Task<TickTickProject?> GetTickTickProjectAsync(string userId, string projectId)
        {
            var credentials = await _integrationService.GetTickTickCredentialsAsync(userId);
            if (credentials == null)
            {
                _logger.LogWarning("Cannot fetch TickTick project {ProjectId}, credentials missing for user {UserId}", projectId, userId);
                return null;
            }

            if (credentials.ExpiresAt <= DateTime.UtcNow.AddMinutes(1))
            {
                _logger.LogWarning("Cannot fetch TickTick project {ProjectId}, token expired for user {UserId}", projectId, userId);
                return null;
            }

            var accessToken = credentials.AccessToken;
            var tickTickApiBaseUrl = _configuration["TickTick:ApiBaseUrl"] ?? "https://api.ticktick.com";
            // Assuming TickTick has an endpoint like this based on common API patterns
            var projectEndpoint = $"{tickTickApiBaseUrl}/open/v1/project/{projectId}"; 

            using var httpClient = _httpClientFactory.CreateClient("TickTickApiClient");
            using var request = new HttpRequestMessage(HttpMethod.Get, projectEndpoint);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

            try
            {
                using var response = await httpClient.SendAsync(request);
                var content = await response.Content.ReadAsStringAsync();

                if (response.IsSuccessStatusCode)
                {
                    // Assuming the response is a single TickTickProject object
                    var project = JsonSerializer.Deserialize<TickTickProject>(content); 
                    return project;
                }
                else
                {
                    _logger.LogWarning("Failed to fetch TickTick project {ProjectId} for user {UserId}. Status: {StatusCode}", projectId, userId, response.StatusCode);
                    return null;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching TickTick project {ProjectId} for user {UserId}", projectId, userId);
                return null;
            }
        }
    }
} 