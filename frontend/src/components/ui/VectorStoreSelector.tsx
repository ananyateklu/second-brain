interface VectorStoreSelectorProps {
  selectedProvider: 'PostgreSQL' | 'Pinecone';
  onChange: (provider: 'PostgreSQL' | 'Pinecone') => void;
  disabled?: boolean;
}

export function VectorStoreSelector({ selectedProvider, onChange, disabled = false }: VectorStoreSelectorProps) {
  return (
    <div className="relative inline-flex rounded-xl p-1" style={{ backgroundColor: 'var(--border)' }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange('PostgreSQL')}
        className={`
          px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        style={{
          backgroundColor: selectedProvider === 'PostgreSQL' ? 'var(--color-brand-600)' : 'transparent',
          color: selectedProvider === 'PostgreSQL' ? 'white' : 'var(--text-secondary)',
        }}
      >
        PostgreSQL
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange('Pinecone')}
        className={`
          px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        style={{
          backgroundColor: selectedProvider === 'Pinecone' ? 'var(--color-brand-600)' : 'transparent',
          color: selectedProvider === 'Pinecone' ? 'white' : 'var(--text-secondary)',
        }}
      >
        Pinecone
      </button>
    </div>
  );
}
