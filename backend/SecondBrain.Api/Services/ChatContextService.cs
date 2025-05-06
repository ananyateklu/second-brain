using SecondBrain.Data;
using SecondBrain.Data.Entities;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace SecondBrain.Api.Services
{
    public interface IChatContextService
    {
        Task<List<AgentMessage>> GetChatContextAsync(string chatId, int maxMessages = 10);
        Task<Dictionary<string, object>> FormatContextForProviderAsync(string chatId, string provider, int maxTokens = 4000);
    }

    public class ChatContextService : IChatContextService
    {
        private readonly DataContext _context;
        private readonly ILogger<ChatContextService> _logger;

        public ChatContextService(DataContext context, ILogger<ChatContextService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<List<AgentMessage>> GetChatContextAsync(string chatId, int maxMessages = 10)
        {
            _logger.LogInformation($"Getting chat context for chatId: {chatId}");
            var messages = await _context.AgentMessages
                .Where(m => m.ChatId == chatId)
                .OrderByDescending(m => m.Timestamp)
                .Take(maxMessages)
                .OrderBy(m => m.Timestamp)
                .ToListAsync();

            _logger.LogInformation($"Found {messages.Count} messages for context");
            foreach (var msg in messages)
            {
                _logger.LogInformation($"Message: Role={msg.Role}, Content={msg.Content.Substring(0, Math.Min(50, msg.Content.Length))}...");
            }
            return messages;
        }

        public async Task<Dictionary<string, object>> FormatContextForProviderAsync(string chatId, string provider, int maxTokens = 4000)
        {
            var messages = await GetChatContextAsync(chatId);
            var formattedContext = new Dictionary<string, object>();

            switch (provider.ToLower())
            {
                case "openai":
                    formattedContext["messages"] = messages.Select(m => new
                    {
                        role = m.Role,
                        content = m.Content
                    }).ToList();
                    break;

                case "anthropic":
                    formattedContext["conversation"] = string.Join("\n\n", messages.Select(m =>
                        $"{(m.Role == "user" ? "Human" : "Assistant")}: {m.Content}"));
                    break;

                case "gemini":
                    formattedContext["messages"] = messages.Select(m => new
                    {
                        role = m.Role == "user" ? "user" : "model",
                        content = m.Content,
                        parts = new[] { new { text = m.Content } }
                    }).ToList();
                    break;

                case "grok":
                case "ollama":
                    // Format for text completion style models
                    formattedContext["conversation"] = string.Join("\n", messages.Select(m =>
                        $"{(m.Role == "user" ? "User" : "Assistant")}: {m.Content}"));
                    break;
            }

            // Add metadata about the context
            formattedContext["metadata"] = new
            {
                message_count = messages.Count,
                last_timestamp = messages.LastOrDefault()?.Timestamp,
                chat_id = chatId
            };

            _logger.LogInformation($"Formatted context for {provider}: {JsonSerializer.Serialize(formattedContext)}");
            return formattedContext;
        }
    }
}