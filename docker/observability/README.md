# Second Brain Observability Stack

Production-ready observability stack with Grafana, Prometheus, Loki, and Tempo.

## Quick Start

```bash
cd docker/observability
docker-compose -f docker-compose.observability.yml up -d
```

## Access Points

| Service | URL | Credentials |
|---------|-----|-------------|
| Grafana | http://localhost:3001 | admin / admin |
| Prometheus | http://localhost:9090 | - |
| Loki | http://localhost:3100 | - |
| Tempo | http://localhost:4317 (OTLP gRPC) | - |

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Backend    │────▶│ Prometheus  │────▶│   Grafana   │
│  (metrics)  │     │   :9090     │     │   :3001     │
└─────────────┘     └─────────────┘     └─────────────┘
      │                                       ▲
      │ OTLP                                  │
      ▼                                       │
┌─────────────┐                               │
│   Tempo     │───────────────────────────────┤
│   :4317     │                               │
└─────────────┘                               │
      │                                       │
      │ Serilog                               │
      ▼                                       │
┌─────────────┐                               │
│    Loki     │───────────────────────────────┘
│   :3100     │
└─────────────┘
```

## Backend Configuration

### 1. Add OpenTelemetry Exporter

The backend is already configured with OpenTelemetry. Update `appsettings.json`:

```json
{
  "OpenTelemetry": {
    "Enabled": true,
    "ServiceName": "SecondBrain.API",
    "Exporter": {
      "Type": "otlp",
      "Endpoint": "http://localhost:4317"
    }
  }
}
```

### 2. Add Serilog Loki Sink (Optional)

Install the Serilog Loki sink for log aggregation:

```bash
dotnet add package Serilog.Sinks.Grafana.Loki
```

Configure in `Program.cs`:

```csharp
Log.Logger = new LoggerConfiguration()
    .WriteTo.GrafanaLoki("http://localhost:3100")
    .CreateLogger();
```

### 3. Expose Prometheus Metrics

The backend already exposes metrics at `/metrics`. Ensure it's accessible:

```bash
curl http://localhost:5001/metrics
```

## Pre-built Dashboards

1. **Second Brain - Overview**: Request rates, error rates, latency percentiles
2. **Second Brain - AI Providers**: Provider health, circuit breakers, token usage
3. **Second Brain - RAG Performance**: Query latency, relevance scores, indexing status

## Alert Rules

Alerts are configured in `config/prometheus-alerts.yml`:

- **HighErrorRate**: >5% error rate for 5 minutes
- **HighLatency**: P95 latency >2s for 5 minutes
- **APIDown**: API unreachable for 1 minute
- **CircuitBreakerOpen**: Circuit breaker open for 1 minute
- **SlowRAGQueries**: RAG P95 >5s for 5 minutes
- **HighTokenConsumption**: >100k tokens/hour

## Network Configuration

To scrape metrics from the main Second Brain stack:

```bash
# Connect observability network to main network
docker network connect secondbrain-network secondbrain-prometheus
```

Or update `prometheus.yml` to use the correct target:
- Local development: `host.docker.internal:5001`
- Docker network: `secondbrain-backend:8080`

## Data Retention

| Service | Retention |
|---------|-----------|
| Prometheus | 15 days |
| Loki | 7 days |
| Tempo | 7 days |

## Resource Limits

| Service | CPU | Memory |
|---------|-----|--------|
| Grafana | 1 | 512MB |
| Prometheus | 1 | 1GB |
| Loki | 1 | 1GB |
| Tempo | 1 | 1GB |

## Troubleshooting

### Grafana shows "No Data"

1. Check Prometheus is scraping: http://localhost:9090/targets
2. Verify backend metrics endpoint: `curl http://localhost:5001/metrics`
3. Check network connectivity between containers

### High Memory Usage

Reduce retention periods in config files or adjust resource limits.

### Traces Not Appearing

1. Verify OTLP endpoint is reachable: `curl http://localhost:4318/v1/traces`
2. Check backend OpenTelemetry configuration
3. Review Tempo logs: `docker logs secondbrain-tempo`
