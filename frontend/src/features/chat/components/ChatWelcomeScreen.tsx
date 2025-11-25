import brainTop from '../../../assets/brain-top-tab.png';

/**
 * Welcome screen shown when no conversation is active.
 */
export function ChatWelcomeScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] p-8 animate-in fade-in zoom-in-95 duration-500">
      <div className="mb-8 relative group">
        <div className="absolute inset-0 bg-green-500/20 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <img
          src={brainTop}
          alt="Second Brain"
          className="w-32 h-32 object-contain relative z-10 drop-shadow-2xl transition-transform duration-500 group-hover:scale-110"
        />
      </div>

      <div className="text-center max-w-md space-y-4 relative z-10">
        <h2
          className="text-4xl font-bold tracking-tight drop-shadow-lg"
          style={{ color: 'var(--text-primary)' }}
        >
          Start a conversation
        </h2>
        <p className="text-lg drop-shadow-md" style={{ color: 'var(--text-secondary)' }}>
          Select a model and send a message to begin
        </p>
      </div>
    </div>
  );
}

