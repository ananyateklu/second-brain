using BenchmarkDotNet.Configs;
using BenchmarkDotNet.Running;
using SecondBrain.Benchmarks;

// Run all benchmarks in this assembly
// Use: dotnet run -c Release -- --filter *
// Or for specific benchmarks: dotnet run -c Release -- --filter *EmbeddingBenchmarks*

var config = DefaultConfig.Instance
    .WithOptions(ConfigOptions.DisableOptimizationsValidator);

BenchmarkSwitcher.FromAssembly(typeof(Program).Assembly).Run(args, config);
