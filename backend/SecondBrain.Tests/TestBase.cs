using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using SecondBrain.Api.Services;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Moq;

namespace SecondBrain.Tests;

public abstract class TestBase
{
    protected readonly IServiceCollection Services;
    protected readonly IConfiguration Configuration;
    protected readonly IServiceProvider ServiceProvider;

    protected TestBase()
    {
        Services = new ServiceCollection();

        // Setup configuration
        Configuration = new ConfigurationBuilder()
            .AddJsonFile("appsettings.Development.json", optional: true)
            .AddEnvironmentVariables()
            .Build();

        // Add common services
        ConfigureServices(Services);

        ServiceProvider = Services.BuildServiceProvider();
    }

    protected virtual void ConfigureServices(IServiceCollection services)
    {
        // Add configuration
        services.AddSingleton(Configuration);

        // Add logging
        services.AddLogging(builder => builder.AddDebug().AddConsole());

        // Add common services
        services.AddScoped<ITokenService, TokenService>();
        services.AddScoped<IActivityLogger, ActivityLogger>();

        // Add other common services here
    }

    protected T GetService<T>() where T : notnull
    {
        return ServiceProvider.GetRequiredService<T>();
    }

    protected Mock<T> GetMock<T>() where T : class
    {
        var mock = new Mock<T>();
        Services.AddSingleton(mock.Object);
        return mock;
    }
}