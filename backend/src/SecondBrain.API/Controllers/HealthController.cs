using Asp.Versioning;
using Microsoft.AspNetCore.Mvc;

namespace SecondBrain.API.Controllers;

/// <summary>
/// Health check endpoints
/// </summary>
[ApiController]
[ApiVersion("1.0")]
[Route("api/[controller]")]
[Route("api/v{version:apiVersion}/[controller]")]
[Produces("application/json")]
public class HealthController : ControllerBase
{
    private readonly IConfiguration _configuration;

    public HealthController(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    /// <summary>
    /// Health check endpoint
    /// </summary>
    /// <returns>Health status information</returns>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public IActionResult GetHealth()
    {
        var databaseProvider = _configuration["DatabaseProvider"] ?? "Firestore";

        return Ok(new
        {
            status = "healthy",
            timestamp = DateTime.UtcNow,
            version = "2.0.0",
            database = databaseProvider
        });
    }
}

