import { EditIdeaModal } from './EditIdeaModal';
import { useNotes } from '../../../hooks/useNotes';

interface IdeaDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  ideaId: string | null;
}

export function IdeaDetailsModal({ isOpen, onClose, ideaId }: IdeaDetailsModalProps) {
  const { notes } = useNotes();
  const idea = ideaId ? notes.find(note => note.id === ideaId) || null : null;

  if (!idea) {
    return null;
  }

  return (
    <EditIdeaModal
      isOpen={isOpen}
      onClose={onClose}
      idea={idea}
    />
  );
}