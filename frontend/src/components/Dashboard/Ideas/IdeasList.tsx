import { Note } from '../../../contexts/NotesContext';
import { IdeaCard } from './IdeaCard';

interface IdeasListProps {
  ideas: Note[];
  onIdeaClick: (ideaId: string) => void;
}

export function IdeasList({ ideas, onIdeaClick }: Readonly<IdeasListProps>) {
  return (
    <div className="space-y-4">
      {ideas.map(idea => (
        <IdeaCard 
          key={idea.id} 
          idea={idea} 
          viewMode="list"
          onClick={onIdeaClick}
        />
      ))}
    </div>
  );
}