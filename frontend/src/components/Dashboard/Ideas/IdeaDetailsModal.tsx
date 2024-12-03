import { EditIdeaModal } from './EditIdeaModal';
import { useNotes } from '../../../hooks/useNotes';

interface IdeaDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  ideaId: string | null;
}

export function IdeaDetailsModal({ isOpen, onClose, ideaId }: IdeaDetailsModalProps) {
  const { getNote } = useNotes();
  const idea = ideaId ? getNote(ideaId) : null;

  return (
    <EditIdeaModal
      isOpen={isOpen}
      onClose={onClose}
      idea={idea}
    />
  );
}