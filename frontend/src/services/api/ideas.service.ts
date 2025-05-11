import api from './api';
import { Idea } from '../../types/idea';

export interface IdeaResponse {
  id: string;
  title: string;
  content: string;
  tags: string[] | string;
  isFavorite: boolean;
  isPinned: boolean;
  isArchived: boolean;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
  linkedItems: Array<{
    id: string;
    type: string;
    title: string;
  }>;
  isDeleted?: boolean;
  deletedAt?: string;
}

export interface CreateIdeaData {
  title: string;
  content: string;
  tags?: string[];
  isFavorite?: boolean;
}

export interface UpdateIdeaData {
  title?: string;
  content?: string;
  tags?: string[];
  isPinned?: boolean;
  isFavorite?: boolean;
  isArchived?: boolean;
}

export interface AddLinkData {
  linkedItemId: string;
  linkedItemType: string;
  linkType?: string;
}

const processIdeaResponse = (idea: IdeaResponse): Idea => ({
  id: idea.id,
  title: idea.title,
  content: idea.content,
  tags: Array.isArray(idea.tags) ? idea.tags : idea.tags ? idea.tags.split(',').map(tag => tag.trim()) : [],
  isFavorite: idea.isFavorite,
  isPinned: idea.isPinned,
  isArchived: idea.isArchived || false,
  archivedAt: idea.archivedAt,
  createdAt: idea.createdAt,
  updatedAt: idea.updatedAt,
  linkedItems: (idea.linkedItems || []).map(item => ({
    id: item.id,
    title: item.title,
    type: item.type as 'Note' | 'Idea' | 'Task' | 'Reminder'
  })),
  isDeleted: idea.isDeleted || false,
  deletedAt: idea.deletedAt,
});

export const ideasService = {
  async createIdea(data: CreateIdeaData): Promise<Idea> {
    const response = await api.post<IdeaResponse>('/api/Ideas', data);
    return processIdeaResponse(response.data);
  },

  async getAllIdeas(): Promise<Idea[]> {
    const response = await api.get<IdeaResponse[]>('/api/Ideas');
    return response.data.map(processIdeaResponse);
  },

  async getIdea(id: string): Promise<Idea> {
    const response = await api.get<IdeaResponse>(`/api/Ideas/${id}`);
    return processIdeaResponse(response.data);
  },

  async updateIdea(id: string, data: UpdateIdeaData): Promise<Idea> {
    const response = await api.put<IdeaResponse>(`/api/Ideas/${id}`, data);
    return processIdeaResponse(response.data);
  },

  async deleteIdea(id: string): Promise<void> {
    await api.delete(`/api/Ideas/${id}`);
  },

  async deleteIdeaPermanently(id: string): Promise<void> {
    await api.delete(`/api/Ideas/${id}/permanent`);
  },

  async getDeletedIdeas(): Promise<Idea[]> {
    try {
      const response = await api.get<IdeaResponse[]>('/api/Ideas/deleted');
      return response.data.map(processIdeaResponse);
    } catch (error) {
      console.error('Failed to fetch deleted ideas:', error);
      return []; // Return empty array instead of throwing error
    }
  },

  async toggleFavorite(id: string): Promise<Idea> {
    const response = await api.put<IdeaResponse>(`/api/Ideas/${id}/favorite`, {});
    return processIdeaResponse(response.data);
  },

  async togglePin(id: string): Promise<Idea> {
    const response = await api.put<IdeaResponse>(`/api/Ideas/${id}/pin`, {});
    return processIdeaResponse(response.data);
  },

  async toggleArchive(id: string): Promise<Idea> {
    const response = await api.put<IdeaResponse>(`/api/Ideas/${id}/archive`, {});
    return processIdeaResponse(response.data);
  },

  async restoreIdea(id: string): Promise<Idea> {
    const response = await api.put<IdeaResponse>(`/api/Ideas/${id}/restore`, {});
    return processIdeaResponse(response.data);
  },

  async addLink(ideaId: string, data: AddLinkData): Promise<Idea> {
    const response = await api.post<IdeaResponse>(`/api/Ideas/${ideaId}/links`, data);
    return processIdeaResponse(response.data);
  },

  async removeLink(ideaId: string, linkedItemId: string, linkedItemType: string): Promise<Idea> {
    const response = await api.delete<IdeaResponse>(`/api/Ideas/${ideaId}/links/${linkedItemId}/${linkedItemType}`);
    return processIdeaResponse(response.data);
  }
};

export default ideasService;