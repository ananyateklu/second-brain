import { IdeaCard } from './IdeaCard';

interface IdeasGridProps {
  ideas: Note[];
  onIdeaClick: (ideaId: string) => void;
}

export function IdeasGrid({ ideas, onIdeaClick }: IdeasGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {ideas.map(idea => (
        <IdeaCard 
          key={idea.id} 
          idea={idea} 
          viewMode="grid"
          onClick={onIdeaClick}
        />
      ))}
    </div>
  );
}