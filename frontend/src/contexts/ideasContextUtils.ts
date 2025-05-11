import { createContext, useContext } from 'react';
import { Idea } from '../types/idea';

// Define the state interface
interface IdeasState {
    ideas: Idea[];
    archivedIdeas: Idea[];
    loading: boolean;
    error: string | null;
}

// Define the context interface
export interface IdeasContextType {
    state: IdeasState;
    fetchIdeas: () => Promise<void>;
    fetchArchivedIdeas: () => Promise<void>;
    createIdea: (title: string, content: string, tags?: string[], isFavorite?: boolean) => Promise<Idea>;
    updateIdea: (id: string, data: Partial<Idea>) => Promise<Idea>;
    deleteIdea: (id: string) => Promise<void>;
    toggleFavorite: (id: string) => Promise<Idea>;
    togglePin: (id: string) => Promise<Idea>;
    toggleArchive: (id: string) => Promise<Idea>;
    addLink: (ideaId: string, linkedItemId: string, linkedItemType: string, linkType?: string) => Promise<Idea>;
    removeLink: (ideaId: string, linkedItemId: string, linkedItemType: string) => Promise<Idea>;
}

// Create the context with a default value
export const IdeasContext = createContext<IdeasContextType | undefined>(undefined);

// Hook for accessing the context
export const useIdeas = () => {
    const context = useContext(IdeasContext);
    if (context === undefined) {
        throw new Error('useIdeas must be used within an IdeasProvider');
    }
    return context;
}; 