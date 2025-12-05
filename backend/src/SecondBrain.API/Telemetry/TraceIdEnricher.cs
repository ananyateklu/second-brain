using System.Diagnostics;
using Serilog.Core;
using Serilog.Events;

namespace SecondBrain.API.Telemetry;

/// <summary>
/// Serilog enricher that adds OpenTelemetry trace context (TraceId, SpanId) to log events.
/// This enables correlation between distributed traces and logs.
/// </summary>
public class TraceIdEnricher : ILogEventEnricher
{
    public void Enrich(LogEvent logEvent, ILogEventPropertyFactory propertyFactory)
    {
        var activity = Activity.Current;
        if (activity != null)
        {
            logEvent.AddPropertyIfAbsent(propertyFactory.CreateProperty("TraceId", activity.TraceId.ToString()));
            logEvent.AddPropertyIfAbsent(propertyFactory.CreateProperty("SpanId", activity.SpanId.ToString()));

            if (activity.ParentSpanId != default)
            {
                logEvent.AddPropertyIfAbsent(propertyFactory.CreateProperty("ParentSpanId", activity.ParentSpanId.ToString()));
            }
        }
        else
        {
            // Provide empty values when there's no active trace
            logEvent.AddPropertyIfAbsent(propertyFactory.CreateProperty("TraceId", ""));
            logEvent.AddPropertyIfAbsent(propertyFactory.CreateProperty("SpanId", ""));
        }
    }
}
