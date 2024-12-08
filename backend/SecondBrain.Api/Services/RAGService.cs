using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using SecondBrain.Api.DTOs.RAG;
using SecondBrain.Api.Exceptions;

namespace SecondBrain.Api.Services
{
    public class RagService
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<RagService> _logger;
        private readonly string _apiEndpoint = "https://api.openai.com/v1";
        private const string JsonMediaType = "application/json";

        public RagService(IConfiguration configuration, ILogger<RagService> logger)
        {
            _logger = logger;
            var apiKey = configuration["OpenAI:ApiKey"];
            
            _httpClient = new HttpClient();
            _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
            _httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue(JsonMediaType));
            _httpClient.DefaultRequestHeaders.Add("OpenAI-Beta", "assistants=v2");
        }

        public async Task<string> UploadFileAsync(Stream fileStream, string fileName)
        {
            try
            {
                var content = new MultipartFormDataContent();
                var fileContent = new StreamContent(fileStream);
                content.Add(fileContent, "file", fileName);
                content.Add(new StringContent("assistants"), "purpose");

                var response = await _httpClient.PostAsync($"{_apiEndpoint}/files", content);
                var responseString = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    throw new RagException($"File upload failed: {responseString}");
                }

                var result = JsonSerializer.Deserialize<FileUploadResponse>(responseString)
                    ?? throw new RagException("Failed to deserialize file upload response");
                return result.Id ?? throw new RagException("File ID was null in response");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error uploading file for RAG");
                throw new RagException("Failed to upload file", ex);
            }
        }

        public async Task<string> CreateAssistantAsync(string fileId, string instructions)
        {
            try
            {
                // First create the assistant
                var createRequest = new
                {
                    name = "Document Assistant",
                    instructions = instructions,
                    model = "gpt-4-turbo-preview",
                    tools = new[] { new { type = "file_search" } }
                };

                var json = JsonSerializer.Serialize(createRequest);
                var content = new StringContent(json, Encoding.UTF8, JsonMediaType);

                var response = await _httpClient.PostAsync($"{_apiEndpoint}/assistants", content);
                var responseString = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    throw new RagException($"Assistant creation failed: {responseString}");
                }

                var result = JsonSerializer.Deserialize<AssistantResponse>(responseString)
                    ?? throw new RagException("Failed to deserialize assistant response");
                
                if (result.Id == null)
                {
                    throw new RagException("Assistant ID was null in response");
                }

                // Then attach the file to the assistant
                var attachFileRequest = new
                {
                    file_id = fileId
                };

                json = JsonSerializer.Serialize(attachFileRequest);
                content = new StringContent(json, Encoding.UTF8, JsonMediaType);

                response = await _httpClient.PostAsync($"{_apiEndpoint}/assistants/{result.Id}/files", content);
                responseString = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    // If file attachment fails, delete the assistant and throw
                    await DeleteAssistantAsync(result.Id);
                    throw new RagException($"File attachment failed: {responseString}");
                }

                return result.Id;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating assistant");
                throw new RagException("Failed to create assistant", ex);
            }
        }

        public async Task<string> GetAssistantResponseAsync(string assistantId, string prompt)
        {
            try
            {
                // Create thread
                var thread = await CreateThreadAsync();

                // Add message to thread
                await AddMessageToThreadAsync(thread.Id, prompt);

                // Create run
                var run = await CreateRunAsync(thread.Id, assistantId);

                // Wait for completion
                while (run.Status != "completed")
                {
                    await Task.Delay(500);
                    run = await GetRunStatusAsync(thread.Id, run.Id);

                    if (run.Status == "failed")
                    {
                        throw new RagException("Assistant run failed");
                    }
                }

                // Get messages
                var messages = await GetThreadMessagesAsync(thread.Id);
                var assistantMessage = messages.FirstOrDefault(m => m.Role == "assistant");
                
                if (assistantMessage?.Content == null || !assistantMessage.Content.Any())
                    return "No response generated";

                // Combine all text content from the message
                return string.Join("\n", 
                    assistantMessage.Content
                        .Where(c => c.Type == "text")
                        .Select(c => c.Text.Value));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting assistant response");
                throw new RagException("Failed to get assistant response", ex);
            }
        }

        private async Task<ThreadResponse> CreateThreadAsync()
        {
            var response = await _httpClient.PostAsync($"{_apiEndpoint}/threads", new StringContent("", Encoding.UTF8, JsonMediaType));
            var responseString = await response.Content.ReadAsStringAsync();
            return JsonSerializer.Deserialize<ThreadResponse>(responseString) 
                ?? throw new RagException("Failed to deserialize thread response");
        }

        private async Task AddMessageToThreadAsync(string threadId, string content)
        {
            var request = new { role = "user", content };
            var json = JsonSerializer.Serialize(request);
            var httpContent = new StringContent(json, Encoding.UTF8, JsonMediaType);
            
            await _httpClient.PostAsync($"{_apiEndpoint}/threads/{threadId}/messages", httpContent);
        }

        private async Task<RunResponse> CreateRunAsync(string threadId, string assistantId)
        {
            var request = new { assistant_id = assistantId };
            var json = JsonSerializer.Serialize(request);
            var content = new StringContent(json, Encoding.UTF8, JsonMediaType);
            
            var response = await _httpClient.PostAsync($"{_apiEndpoint}/threads/{threadId}/runs", content);
            var responseString = await response.Content.ReadAsStringAsync();
            return JsonSerializer.Deserialize<RunResponse>(responseString)
                ?? throw new RagException("Failed to deserialize run response");
        }

        private async Task<RunResponse> GetRunStatusAsync(string threadId, string runId)
        {
            var response = await _httpClient.GetAsync($"{_apiEndpoint}/threads/{threadId}/runs/{runId}");
            var responseString = await response.Content.ReadAsStringAsync();
            return JsonSerializer.Deserialize<RunResponse>(responseString)
                ?? throw new RagException("Failed to deserialize run status response");
        }

        private async Task<List<MessageResponse>> GetThreadMessagesAsync(string threadId)
        {
            var response = await _httpClient.GetAsync($"{_apiEndpoint}/threads/{threadId}/messages");
            var responseString = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<ThreadMessagesResponse>(responseString)
                ?? throw new RagException("Failed to deserialize thread messages response");
            return result.Data ?? throw new RagException("Message data was null in response");
        }

        public async Task DeleteAssistantAsync(string assistantId)
        {
            try
            {
                await _httpClient.DeleteAsync($"{_apiEndpoint}/assistants/{assistantId}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting assistant");
                throw new RagException("Failed to delete assistant", ex);
            }
        }

        public async Task DeleteFileAsync(string fileId)
        {
            try
            {
                await _httpClient.DeleteAsync($"{_apiEndpoint}/files/{fileId}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting file");
                throw new RagException("Failed to delete file", ex);
            }
        }
    }
} 