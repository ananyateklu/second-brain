import type { TooltipProps } from 'recharts';
import { formatTokenCount } from '../utils/dashboard-utils';

interface PieChartTooltipProps extends TooltipProps<number, string> {
  isTokenUsage?: boolean;
  modelDataMap?: Map<string, { conversations: number; tokens: number }>;
  totalConversations?: number;
  totalTokens?: number;
}

export function PieChartTooltip({ 
  active, 
  payload, 
  label, 
  isTokenUsage = false,
  modelDataMap,
  totalConversations,
  totalTokens,
}: PieChartTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0];
  const modelName = data.name || label || '';
  const value = typeof data.value === 'number' ? data.value : 0;
  
  // Get full model data if available
  const modelData = modelDataMap?.get(modelName);
  const conversations = modelData?.conversations ?? (isTokenUsage ? 0 : value);
  const tokens = modelData?.tokens ?? (isTokenUsage ? value : 0);
  
  // Calculate percentages
  const conversationPercent = totalConversations && totalConversations > 0
    ? ((conversations / totalConversations) * 100).toFixed(1)
    : '0';
  const tokenPercent = totalTokens && totalTokens > 0
    ? ((tokens / totalTokens) * 100).toFixed(1)
    : '0';

  return (
    <div
      style={{
        backgroundColor: 'var(--surface-elevated)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '10px 14px',
        boxShadow: 'var(--shadow-lg)',
        minWidth: '180px',
      }}
    >
      <p style={{ color: 'var(--text-primary)', margin: '0 0 8px 0', fontWeight: 600, fontSize: '14px' }}>
        {modelName}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Conversations:</span>
          <span style={{ color: 'var(--text-primary)', fontSize: '12px', fontWeight: 500 }}>
            {conversations.toLocaleString()} ({conversationPercent}%)
          </span>
        </div>
        {tokens > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Tokens:</span>
            <span style={{ color: 'var(--text-primary)', fontSize: '12px', fontWeight: 500 }}>
              {formatTokenCount(tokens)} ({tokenPercent}%)
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

