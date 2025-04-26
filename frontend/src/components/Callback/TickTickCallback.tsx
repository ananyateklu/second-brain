import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { integrationsService } from '../../services/api/integrations.service';
import { useTasks } from '../../contexts/tasksContextUtils';

// Exchanges the authorization code for TickTick tokens via backend
const exchangeTickTickCodeForTokens = async (code: string): Promise<{ success: boolean }> => {
    try {
        await integrationsService.exchangeTickTickCode(code);
        return { success: true };
    } catch (error) {
        console.error('TickTick code exchange failed:', error);
        return { success: false };
    }
};

export function TickTickCallback() {
    const location = useLocation();
    const navigate = useNavigate();
    const { refreshTickTickConnection } = useTasks();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const handleCallback = async () => {
            const params = new URLSearchParams(location.search);
            const code = params.get('code');
            const state = params.get('state');
            const storedState = localStorage.getItem('ticktick_oauth_state');

            // Clear the state from local storage immediately
            localStorage.removeItem('ticktick_oauth_state');

            if (!code) {
                setError('Authorization code not found in callback URL.');
                setStatus('error');
                return;
            }

            if (!state || state !== storedState) {
                setError('Invalid state parameter. Potential CSRF attack detected.');
                setStatus('error');
                return;
            }

            // State is valid, proceed to exchange code
            try {
                const result = await exchangeTickTickCodeForTokens(code);
                if (result.success) {
                    setStatus('success');
                    // Update global state or context to reflect connection status
                    await refreshTickTickConnection();
                    console.log('TickTick connected successfully and context updated!');
                    // Redirect back to settings page after a short delay
                    setTimeout(() => {
                        navigate('/dashboard/settings?integration_status=ticktick_success'); // Add param to potentially show success message
                    }, 2000);
                } else {
                    throw new Error('Backend failed to exchange code for tokens.');
                }
            } catch (err: unknown) {
                console.error('Error exchanging TickTick code:', err);
                let errorMessage = 'An unexpected error occurred during TickTick connection.';
                if (err instanceof Error) {
                    errorMessage = err.message;
                } else if (typeof err === 'string') {
                    errorMessage = err;
                }
                setError(errorMessage);
                setStatus('error');
            }
        };

        handleCallback();
    }, [location, navigate, refreshTickTickConnection]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--color-background)] text-[var(--color-text)]">
            {status === 'loading' && (
                <>
                    <Loader2 className="w-12 h-12 animate-spin text-[var(--color-accent)]" />
                    <p className="mt-4 text-lg">Connecting to TickTick...</p>
                    <p className="text-sm text-[var(--color-textSecondary)]">Please wait while we finalize the connection.</p>
                </>
            )}
            {status === 'success' && (
                <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <h2 className="mt-4 text-2xl font-semibold">TickTick Connected!</h2>
                    <p className="mt-2 text-[var(--color-textSecondary)]">Redirecting you back to settings...</p>
                </>
            )}
            {status === 'error' && (
                <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <h2 className="mt-4 text-2xl font-semibold">Connection Failed</h2>
                    <p className="mt-2 text-[var(--color-textSecondary)]">Could not connect to TickTick.</p>
                    <p className="mt-1 text-sm text-red-400">{error}</p>
                    <button
                        onClick={() => navigate('/dashboard/settings')}
                        className="mt-6 px-4 py-2 bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent)]/90 transition-colors"
                    >
                        Return to Settings
                    </button>
                </>
            )}
        </div>
    );
} 