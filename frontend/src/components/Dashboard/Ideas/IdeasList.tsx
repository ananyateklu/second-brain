import type { Note } from '../../../types/note';
import { IdeaCard } from './IdeaCard';

interface IdeasListProps {
  ideas: Note[];
  onIdeaClick: (ideaId: string) => void;
}

export function IdeasList({ ideas, onIdeaClick }: Readonly<IdeasListProps>) {
  return (
    <div className="space-y-4 px-0.5">
      {ideas.map(idea => (
        <div
          key={idea.id}
          onClick={() => onIdeaClick(idea.id)}
          className="cursor-pointer"
        >
          <IdeaCard 
            key={idea.id} 
            idea={idea} 
            viewMode="list"
          />
        </div>
      ))}
    </div>
  );
}