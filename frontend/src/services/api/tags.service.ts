import api from './api';
import { Note } from './notes.service';

export interface Tag {
  id: string;
  name: string;
  totalCount?: number;
}

export interface TagDetails extends Tag {
  notes: Note[];
}

// Fetch all tags with counts
export async function getAllTagsWithCounts(): Promise<Tag[]> {
  const response = await api.get<Tag[]>('/api/Tags/withCounts');
  return response.data;
}

// Fetch tag details
export async function getTagDetails(id: string): Promise<TagDetails> {
  const response = await api.get<TagDetails>(`/api/Tags/${id}/details`);
  return response.data;
} 