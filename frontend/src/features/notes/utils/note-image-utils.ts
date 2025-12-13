/**
 * Utility functions for note image handling
 */

import { type FileAttachment, parseDataUrl } from '../../../utils/multimodal-models';
import type { NoteImageInput } from '../../../types/notes';

/**
 * Convert FileAttachment array to NoteImageInput array for API submission
 */
export function fileAttachmentsToNoteImages(attachments: FileAttachment[]): NoteImageInput[] {
  return attachments.map(attachment => {
    const parsed = parseDataUrl(attachment.dataUrl);
    return {
      base64Data: parsed?.base64Data || attachment.dataUrl,
      mediaType: parsed?.mediaType || attachment.type,
      fileName: attachment.name,
    };
  });
}
