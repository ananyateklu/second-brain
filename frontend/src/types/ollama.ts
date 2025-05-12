export interface OllamaModelsResponse {
    models: OllamaModel[];
}

export interface OllamaModel {
    name: string;
    modified_at: string;
    size: number;
    digest: string;
    details: OllamaModelDetails;
}

export interface OllamaModelDetails {
    format: string;
    family: string;
    families: string[] | null;
    parameter_size: string;
    quantization_level: string;
} 