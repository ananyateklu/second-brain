import type { Idea } from '../../../types/idea';
import { IdeaCard } from './IdeaCard';

interface IdeasListProps {
  ideas: Idea[];
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