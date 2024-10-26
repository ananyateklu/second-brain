import React from 'react';
import { EditIdeaModal } from './EditIdeaModal';

interface IdeaDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  ideaId: string | null;
}

export function IdeaDetailsModal({ isOpen, onClose, ideaId }: IdeaDetailsModalProps) {
  return (
    <EditIdeaModal
      isOpen={isOpen}
      onClose={onClose}
      ideaId={ideaId}
    />
  );
}