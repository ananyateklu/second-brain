import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null
        };
    }

    static getDerivedStateFromError(error: Error): State {
        return {
            hasError: true,
            error
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        console.error('Error caught by ErrorBoundary:', error, errorInfo);
        this.props.onError?.(error, errorInfo);
    }

    resetError = (): void => {
        this.setState({
            hasError: false,
            error: null
        });
    };

    render(): ReactNode {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-red-50 dark:bg-red-900/20">
                    <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-lg dark:bg-gray-800">
                        <h2 className="mb-4 text-xl font-bold text-red-600 dark:text-red-400">
                            Something went wrong
                        </h2>
                        <div className="p-4 mb-4 overflow-auto text-sm bg-gray-100 rounded dark:bg-gray-700 dark:text-gray-300 max-h-48">
                            {this.state.error?.message || 'An unexpected error occurred'}
                        </div>
                        <div className="flex justify-end">
                            <button
                                onClick={this.resetError}
                                className="px-4 py-2 text-white bg-blue-500 rounded hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
                            >
                                Try again
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
} 