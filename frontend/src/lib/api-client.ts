import { useAuthStore } from '../store/auth-store';

const API_BASE_URL = import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}`
    : '/api';

export class ApiError extends Error {
    constructor(
        message: string,
        public status?: number,
        public statusText?: string
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

async function handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        // Handle 401 Unauthorized - redirect to login
        if (response.status === 401) {
            const authStore = useAuthStore.getState();
            if (authStore.isAuthenticated) {
                // Token is invalid or expired, sign out
                authStore.signOut();
                window.location.href = '/login';
            } else {
                window.location.href = '/login';
            }
        }

        let errorMessage = `Failed to ${response.url.split('/').pop()?.split('?')[0] || 'complete request'
            }`;

        try {
            const errorData = await response.json();
            if (errorData.error) errorMessage = errorData.error;
            else if (errorData.message) errorMessage = errorData.message;
        } catch {
            // ignore json parse error
        }

        throw new ApiError(errorMessage, response.status, response.statusText);
    }

    // Handle empty responses (like DELETE)
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
        return response.json();
    }

    return undefined as T;
}

function getAuthHeaders(): HeadersInit {
    const authStore = useAuthStore.getState();
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };

    if (authStore.token) {
        headers['Authorization'] = `Bearer ${authStore.token}`;
    }

    return headers;
}

export const apiClient = {
    get: async <T>(endpoint: string, headers: HeadersInit = {}): Promise<T> => {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            headers: {
                ...getAuthHeaders(),
                ...headers,
            },
        });
        return handleResponse<T>(response);
    },

    post: async <T>(
        endpoint: string,
        body?: unknown,
        headers: HeadersInit = {}
    ): Promise<T> => {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                ...getAuthHeaders(),
                ...headers,
            },
            body: body ? JSON.stringify(body) : undefined,
        });
        return handleResponse<T>(response);
    },

    put: async <T>(
        endpoint: string,
        body: unknown,
        headers: HeadersInit = {}
    ): Promise<T> => {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'PUT',
            headers: {
                ...getAuthHeaders(),
                ...headers,
            },
            body: JSON.stringify(body),
        });
        return handleResponse<T>(response);
    },

    patch: async <T>(
        endpoint: string,
        body: unknown,
        headers: HeadersInit = {}
    ): Promise<T> => {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'PATCH',
            headers: {
                ...getAuthHeaders(),
                ...headers,
            },
            body: JSON.stringify(body),
        });
        return handleResponse<T>(response);
    },

    delete: async <T>(
        endpoint: string,
        headers: HeadersInit = {}
    ): Promise<T> => {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'DELETE',
            headers: {
                ...getAuthHeaders(),
                ...headers,
            },
        });
        return handleResponse<T>(response);
    },
};

