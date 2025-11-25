export interface AIProviderHealth {
  provider: string;
  isHealthy: boolean;
  checkedAt: string;
  status: string;
  responseTimeMs: number;
  version?: string;
  availableModels?: string[];
  errorMessage?: string;
}

export interface AIHealthResponse {
  checkedAt: string;
  providers: AIProviderHealth[];
}

