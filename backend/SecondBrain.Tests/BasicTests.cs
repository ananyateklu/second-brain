using Xunit;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SecondBrain.Api.Services;
using SecondBrain.Api.Controllers;
using System.Threading.Tasks;

namespace SecondBrain.Tests;

public class BasicTests
{
    protected readonly IServiceCollection _services;
    protected readonly IConfiguration _configuration;

    public BasicTests()
    {
        _services = new ServiceCollection();

        // Setup configuration
        _configuration = new ConfigurationBuilder()
            .AddJsonFile("appsettings.Development.json", optional: true)
            .AddEnvironmentVariables()
            .Build();
    }

    [Fact]
    public void ConfigurationLoads()
    {
        Assert.NotNull(_configuration);
        Assert.NotNull(_configuration.GetSection("ConnectionStrings")["DefaultConnection"]);
    }
}