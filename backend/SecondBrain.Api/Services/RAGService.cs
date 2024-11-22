using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using SecondBrain.Api.DTOs.RAG;

namespace SecondBrain.Api.Services
{
    public class RAGService
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<RAGService> _logger;
        private readonly string _apiKey;
        private readonly string _apiEndpoint = "https://api.openai.com/v1";

        public RAGService(IConfiguration configuration, ILogger<RAGService> logger)
        {
            _logger = logger;
            _apiKey = configuration["OpenAI:ApiKey"];
            
            _httpClient = new HttpClient();
            _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _apiKey);
            _httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
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
                    throw new Exception($"File upload failed: {responseString}");
                }

                var result = JsonSerializer.Deserialize<FileUploadResponse>(responseString);
                return result.Id;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error uploading file for RAG");
                throw;
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
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                var response = await _httpClient.PostAsync($"{_apiEndpoint}/assistants", content);
                var responseString = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    throw new Exception($"Assistant creation failed: {responseString}");
                }

                var result = JsonSerializer.Deserialize<AssistantResponse>(responseString);
                
                // Then attach the file to the assistant
                var attachFileRequest = new
                {
                    file_id = fileId
                };

                json = JsonSerializer.Serialize(attachFileRequest);
                content = new StringContent(json, Encoding.UTF8, "application/json");

                response = await _httpClient.PostAsync($"{_apiEndpoint}/assistants/{result.Id}/files", content);
                responseString = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    // If file attachment fails, delete the assistant and throw
                    await DeleteAssistantAsync(result.Id);
                    throw new Exception($"File attachment failed: {responseString}");
                }

                return result.Id;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating assistant");
                throw;
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
                        throw new Exception("Assistant run failed");
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
                throw;
            }
        }

        private async Task<ThreadResponse> CreateThreadAsync()
        {
            var response = await _httpClient.PostAsync($"{_apiEndpoint}/threads", new StringContent("", Encoding.UTF8, "application/json"));
            var responseString = await response.Content.ReadAsStringAsync();
            return JsonSerializer.Deserialize<ThreadResponse>(responseString);
        }

        private async Task AddMessageToThreadAsync(string threadId, string content)
        {
            var request = new { role = "user", content };
            var json = JsonSerializer.Serialize(request);
            var httpContent = new StringContent(json, Encoding.UTF8, "application/json");
            
            await _httpClient.PostAsync($"{_apiEndpoint}/threads/{threadId}/messages", httpContent);
        }

        private async Task<RunResponse> CreateRunAsync(string threadId, string assistantId)
        {
            var request = new { assistant_id = assistantId };
            var json = JsonSerializer.Serialize(request);
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            
            var response = await _httpClient.PostAsync($"{_apiEndpoint}/threads/{threadId}/runs", content);
            var responseString = await response.Content.ReadAsStringAsync();
            return JsonSerializer.Deserialize<RunResponse>(responseString);
        }

        private async Task<RunResponse> GetRunStatusAsync(string threadId, string runId)
        {
            var response = await _httpClient.GetAsync($"{_apiEndpoint}/threads/{threadId}/runs/{runId}");
            var responseString = await response.Content.ReadAsStringAsync();
            return JsonSerializer.Deserialize<RunResponse>(responseString);
        }

        private async Task<List<MessageResponse>> GetThreadMessagesAsync(string threadId)
        {
            var response = await _httpClient.GetAsync($"{_apiEndpoint}/threads/{threadId}/messages");
            var responseString = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<ThreadMessagesResponse>(responseString);
            return result.Data;
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
                throw;
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
                throw;
            }
        }
    }
} 