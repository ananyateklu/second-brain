import api from '../api/api';

export class RAGService {
  async uploadFile(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/api/ai/rag/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.fileId;
  }

  async createAssistant(fileId: string, instructions: string): Promise<string> {
    const response = await api.post('/api/ai/rag/assistant', {
      fileId,
      instructions,
    });

    return response.data.assistantId;
  }

  async queryAssistant(assistantId: string, prompt: string): Promise<string> {
    const response = await api.post('/api/ai/rag/query', {
      assistantId,
      prompt,
    });

    return response.data.response;
  }

  async deleteAssistant(assistantId: string): Promise<void> {
    await api.delete(`/api/ai/rag/assistant/${assistantId}`);
  }

  async deleteFile(fileId: string): Promise<void> {
    await api.delete(`/api/ai/rag/file/${fileId}`);
  }
} 