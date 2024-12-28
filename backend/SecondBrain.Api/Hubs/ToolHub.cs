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

        public async Task NotifyUserStatsUpdated(string userId)
        {
            await Clients.Group($"User_{userId}").SendAsync("userstatsupdated");
        }

        public override async Task OnConnectedAsync()
        {
            var userId = Context.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (!string.IsNullOrEmpty(userId))
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, $"User_{userId}");
                Console.WriteLine($"Client Connected: {Context.ConnectionId}, UserId: {userId}, Added to group: User_{userId}");
            }
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var userId = Context.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (!string.IsNullOrEmpty(userId))
            {
                await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"User_{userId}");
                Console.WriteLine($"Client Disconnected: {Context.ConnectionId}, UserId: {userId}, Removed from group: User_{userId}");
            }
            await base.OnDisconnectedAsync(exception);
        }
    }
}