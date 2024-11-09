using Microsoft.AspNetCore.SignalR;

namespace SecondBrain.Api.Hubs
{
    public class ToolHub : Hub
    {
        public async Task SendExecutionStep(string messageId, string type, string content, object metadata)
        {
            await Clients.All.SendAsync("ReceiveExecutionStep", new
            {
                type,
                content,
                timestamp = DateTime.UtcNow,
                metadata
            });
        }
    }
} 