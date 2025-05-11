import { IdeaCard } from './IdeaCard';
import type { Idea } from '../../../types/idea';

interface IdeasGridProps {
  ideas: Idea[];
  onIdeaClick: (ideaId: string) => void;
}

export function IdeasGrid({ ideas, onIdeaClick }: IdeasGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-0.5">
      {ideas.map(idea => (
        <div
          key={idea.id}
          onClick={() => onIdeaClick(idea.id)}
          className="cursor-pointer w-full"
        >
          <IdeaCard
            key={idea.id}
            idea={idea}
            viewMode="grid"
          />
        </div>
      ))}
    </div>
  );
}