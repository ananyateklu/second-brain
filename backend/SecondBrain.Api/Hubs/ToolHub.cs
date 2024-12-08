using Microsoft.AspNetCore.SignalR;

namespace SecondBrain.Api.Hubs
{
    public class ToolHub : Hub
    {
        public async Task SendExecutionStep(string messageId, string type, string content, object metadata)
        {
            await Clients.All.SendAsync("ReceiveExecutionStep", new
            {
                messageId,
                type,
                content,
                timestamp = DateTime.UtcNow,
                metadata
            });
        }

        public override async Task OnConnectedAsync()
        {
            Console.WriteLine($"Client Connected: {Context.ConnectionId}");
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            Console.WriteLine($"Client Disconnected: {Context.ConnectionId}");
            await base.OnDisconnectedAsync(exception);
        }
    }
} 