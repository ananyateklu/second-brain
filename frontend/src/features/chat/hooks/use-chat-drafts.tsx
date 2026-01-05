import { useState, useRef, useCallback, useEffect } from 'react';
import { useBoundStore } from '../../../store/bound-store';
import { NEW_CHAT_DRAFT_KEY } from '../../../store/slices/draft-slice';

interface UseChatDraftsProps {
  conversationId: string | null;
}

export function useChatDrafts({ conversationId }: UseChatDraftsProps) {
  const [inputValue, setInputValueInternal] = useState('');
  const previousConversationIdForDraftsRef = useRef<string | null>(null);
  
  // Store selectors
  const saveDraft = useBoundStore((state) => state.saveDraft);
  const loadDraft = useBoundStore((state) => state.loadDraft);
  const clearDraft = useBoundStore((state) => state.clearDraft);
  const transferNewChatDraft = useBoundStore((state) => state.transferNewChatDraft);
  const preloadDrafts = useBoundStore((state) => state.preloadDrafts);
  const flushPendingSaves = useBoundStore((state) => state.flushPendingSaves);

  // Preload all drafts on mount
  useEffect(() => {
    void preloadDrafts();
  }, [preloadDrafts]);

  // Flush pending saves before unmount
  useEffect(() => {
    const handleBeforeUnload = () => {
      flushPendingSaves();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      flushPendingSaves();
    };
  }, [flushPendingSaves]);

  // Draft-aware setInputValue
  const setInputValue = useCallback((value: string) => {
    setInputValueInternal(value);
    const draftKey = conversationId || NEW_CHAT_DRAFT_KEY;
    saveDraft(draftKey, value);
  }, [conversationId, saveDraft]);

  // Track current input value in ref - update in effect to avoid render-phase mutation
  const inputValueRef = useRef(inputValue);
  useEffect(() => {
    inputValueRef.current = inputValue;
  }, [inputValue]);

  // Load draft when conversation changes
  useEffect(() => {
    const currentKey = conversationId || NEW_CHAT_DRAFT_KEY;
    const previousKey = previousConversationIdForDraftsRef.current;

    if (currentKey !== previousKey) {
      const draftToSave = inputValueRef.current;
      if (previousKey && draftToSave.trim()) {
        saveDraft(previousKey, draftToSave);
      }

      previousConversationIdForDraftsRef.current = currentKey;
      const loadingForKey = currentKey;
      
      void loadDraft(currentKey).then((draftContent) => {
        if (previousConversationIdForDraftsRef.current === loadingForKey) {
          setInputValueInternal(draftContent);
        }
      });
    }
  }, [conversationId, loadDraft, saveDraft]);

  return {
    inputValue,
    setInputValue,
    setInputValueInternal,
    clearDraft,
    transferNewChatDraft,
    saveDraft
  };
}
