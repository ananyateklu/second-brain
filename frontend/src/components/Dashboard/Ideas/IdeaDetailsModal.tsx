import { EditIdeaModal } from './EditIdeaModal/index';
import { useIdeas } from '../../../contexts/ideasContextUtils';

interface IdeaDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  ideaId: string | null;
}

export function IdeaDetailsModal({ isOpen, onClose, ideaId }: IdeaDetailsModalProps) {
  const { state: { ideas } } = useIdeas();
  const idea = ideaId ? ideas.find(i => i.id === ideaId) || null : null;

  if (!idea) {
    return null;
  }

  // TODO: Ensure EditIdeaModal is adapted or created to accept an Idea prop
  // and use useIdeas context for its operations.
  return (
    <EditIdeaModal
      isOpen={isOpen}
      onClose={onClose}
      idea={idea}
    />
  );
}