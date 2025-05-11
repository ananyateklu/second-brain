import React, { useReducer, useEffect, useCallback } from 'react';
import { ideasService } from '../services/api/ideas.service';
import { Idea } from '../types/idea';
import { useAuth } from '../hooks/useAuth';
import { AxiosError } from 'axios';
import { IdeasContext, IdeasContextType } from './ideasContextUtils';

// Define the state interface
interface IdeasState {
  ideas: Idea[];
  loading: boolean;
  error: string | null;
}

// Define available actions
type IdeasAction =
  | { type: 'FETCH_IDEAS_START' }
  | { type: 'FETCH_IDEAS_SUCCESS'; payload: Idea[] }
  | { type: 'FETCH_IDEAS_FAILURE'; payload: string }
  | { type: 'CREATE_IDEA_SUCCESS'; payload: Idea }
  | { type: 'UPDATE_IDEA_SUCCESS'; payload: Idea }
  | { type: 'DELETE_IDEA_SUCCESS'; payload: string }
  | { type: 'TOGGLE_FAVORITE_SUCCESS'; payload: Idea }
  | { type: 'TOGGLE_PIN_SUCCESS'; payload: Idea }
  | { type: 'TOGGLE_ARCHIVE_SUCCESS'; payload: Idea }
  | { type: 'ADD_LINK_SUCCESS'; payload: Idea }
  | { type: 'REMOVE_LINK_SUCCESS'; payload: Idea }
  | { type: 'CLEAR_IDEAS' };

// Initial state
const initialState: IdeasState = {
  ideas: [],
  loading: false,
  error: null,
};

// Reducer function
const ideasReducer = (state: IdeasState, action: IdeasAction): IdeasState => {
  switch (action.type) {
    case 'FETCH_IDEAS_START':
      return { ...state, loading: true, error: null };
    case 'FETCH_IDEAS_SUCCESS':
      return { ...state, ideas: action.payload, loading: false };
    case 'FETCH_IDEAS_FAILURE':
      return { ...state, loading: false, error: action.payload };
    case 'CREATE_IDEA_SUCCESS':
      return { ...state, ideas: [...state.ideas, action.payload] };
    case 'UPDATE_IDEA_SUCCESS':
      return {
        ...state,
        ideas: state.ideas.map((idea) => (idea.id === action.payload.id ? action.payload : idea)),
      };
    case 'DELETE_IDEA_SUCCESS':
      return {
        ...state,
        ideas: state.ideas.filter((idea) => idea.id !== action.payload),
      };
    case 'TOGGLE_FAVORITE_SUCCESS':
    case 'TOGGLE_PIN_SUCCESS':
    case 'TOGGLE_ARCHIVE_SUCCESS':
    case 'ADD_LINK_SUCCESS':
    case 'REMOVE_LINK_SUCCESS':
      return {
        ...state,
        ideas: state.ideas.map((idea) => (idea.id === action.payload.id ? action.payload : idea)),
      };
    case 'CLEAR_IDEAS':
      return { ...initialState };
    default:
      return state;
  }
};

// Provider component
export const IdeasProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(ideasReducer, initialState);
  const auth = useAuth();
  // We'll implement our own notification handling

  // Define actions
  const fetchIdeas = useCallback(async () => {
    if (!auth.user) return;

    dispatch({ type: 'FETCH_IDEAS_START' });
    try {
      const ideas = await ideasService.getAllIdeas();

      // Ensure all required properties are set for each idea
      const ideasWithDefaults = ideas.map(idea => ({
        ...idea,
        isDeleted: idea.isDeleted || false,
        isArchived: idea.isArchived || false,
      }));

      dispatch({ type: 'FETCH_IDEAS_SUCCESS', payload: ideasWithDefaults });
    } catch (error) {
      console.error('Error in fetchIdeas:', error);
      dispatch({ type: 'FETCH_IDEAS_FAILURE', payload: 'Failed to fetch ideas' });
    }
  }, [auth.user]);

  // Fetch ideas on mount if authenticated
  useEffect(() => {
    if (auth.user) {
      fetchIdeas();
    } else {
      dispatch({ type: 'CLEAR_IDEAS' });
    }
  }, [auth.user, fetchIdeas]);

  const createIdea = useCallback(
    async (title: string, content: string, tags: string[] = [], isFavorite = false) => {
      try {
        const newIdea = await ideasService.createIdea({
          title,
          content,
          tags,
          isFavorite,
        });

        // Ensure all required properties are set
        const ideaWithDefaults = {
          ...newIdea,
          isDeleted: newIdea.isDeleted || false,
          isArchived: newIdea.isArchived || false,
        };

        dispatch({ type: 'CREATE_IDEA_SUCCESS', payload: ideaWithDefaults });
        return ideaWithDefaults;
      } catch (error) {
        dispatch({ type: 'FETCH_IDEAS_FAILURE', payload: 'Failed to create idea' });
        throw error;
      }
    },
    []
  );

  const updateIdea = useCallback(async (id: string, data: Partial<Idea>) => {
    try {
      const updatedIdea = await ideasService.updateIdea(id, {
        title: data.title,
        content: data.content,
        tags: data.tags,
        isPinned: data.isPinned,
        isFavorite: data.isFavorite,
        isArchived: data.isArchived,
      });
      dispatch({ type: 'UPDATE_IDEA_SUCCESS', payload: updatedIdea });
      return updatedIdea;
    } catch (error) {
      dispatch({ type: 'FETCH_IDEAS_FAILURE', payload: 'Failed to update idea' });
      throw error;
    }
  }, []);

  const deleteIdea = useCallback(async (id: string) => {
    try {
      await ideasService.deleteIdea(id);
      dispatch({ type: 'DELETE_IDEA_SUCCESS', payload: id });
    } catch (error) {
      dispatch({ type: 'FETCH_IDEAS_FAILURE', payload: 'Failed to delete idea' });
      throw error;
    }
  }, []);

  const toggleFavorite = useCallback(async (id: string) => {
    try {
      const updatedIdea = await ideasService.toggleFavorite(id);
      dispatch({ type: 'TOGGLE_FAVORITE_SUCCESS', payload: updatedIdea });
      return updatedIdea;
    } catch (error) {
      dispatch({ type: 'FETCH_IDEAS_FAILURE', payload: 'Failed to toggle favorite' });
      throw error;
    }
  }, []);

  const togglePin = useCallback(async (id: string) => {
    try {
      const updatedIdea = await ideasService.togglePin(id);
      dispatch({ type: 'TOGGLE_PIN_SUCCESS', payload: updatedIdea });
      return updatedIdea;
    } catch (error) {
      dispatch({ type: 'FETCH_IDEAS_FAILURE', payload: 'Failed to toggle pin' });
      throw error;
    }
  }, []);

  const toggleArchive = useCallback(async (id: string) => {
    try {
      const updatedIdea = await ideasService.toggleArchive(id);
      dispatch({ type: 'TOGGLE_ARCHIVE_SUCCESS', payload: updatedIdea });
      return updatedIdea;
    } catch (error) {
      dispatch({ type: 'FETCH_IDEAS_FAILURE', payload: 'Failed to toggle archive' });
      throw error;
    }
  }, []);

  const addLink = useCallback(async (ideaId: string, linkedItemId: string, linkedItemType: string, linkType?: string) => {
    try {
      const updatedIdea = await ideasService.addLink(ideaId, {
        linkedItemId,
        linkedItemType,
        linkType
      });
      dispatch({ type: 'ADD_LINK_SUCCESS', payload: updatedIdea });
      return updatedIdea;
    } catch (err) {
      // Log more detailed error information
      const specificError = err as AxiosError<{ error?: string }>;
      const backendError = specificError.response?.data?.error || specificError.message;
      console.error('Failed to add link:', { ideaId, linkedItemId, linkedItemType, linkType, backendError }, specificError.response?.data || specificError);
      dispatch({ type: 'FETCH_IDEAS_FAILURE', payload: backendError });
      throw err;
    }
  }, []);

  const removeLink = useCallback(async (ideaId: string, linkedItemId: string, linkedItemType: string) => {
    try {
      const updatedIdea = await ideasService.removeLink(ideaId, linkedItemId, linkedItemType);
      dispatch({ type: 'REMOVE_LINK_SUCCESS', payload: updatedIdea });
      return updatedIdea;
    } catch (err) {
      const specificError = err as AxiosError<{ error?: string }>;
      const backendError = specificError.response?.data?.error || specificError.message;
      console.error('Failed to remove link:', { ideaId, linkedItemId, linkedItemType, backendError }, specificError.response?.data || specificError);
      dispatch({ type: 'FETCH_IDEAS_FAILURE', payload: backendError });
      throw err;
    }
  }, []);

  // Context value
  const value: IdeasContextType = {
    state,
    fetchIdeas,
    createIdea,
    updateIdea,
    deleteIdea,
    toggleFavorite,
    togglePin,
    toggleArchive,
    addLink,
    removeLink,
  };

  return <IdeasContext.Provider value={value}>{children}</IdeasContext.Provider>;
};