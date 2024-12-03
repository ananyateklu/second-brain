import { useTrash } from '../contexts/trashContextUtils';
import { useEffect } from 'react';

export function useTrashNotifications() {
  const { trashedItems } = useTrash();
  
  useEffect(() => {
    const nearExpiration = trashedItems.filter(item => {
      const daysUntilExpiration = Math.ceil(
        (new Date(item.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      return daysUntilExpiration <= 7; // Items expiring within 7 days
    });

    if (nearExpiration.length > 0) {
      // Show notification
      // You can use your preferred notification system here
    }
  }, [trashedItems]);
} 