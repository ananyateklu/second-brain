/**
 * Tool Execution Card Utilities
 * JSON parsing helpers for tool execution results
 */

import type { AgentNotesResponse } from '../../types/agent-types';
import type {
  StatsResponse,
  SingleNoteResponse,
  GenericResponse,
  ImagesResponse,
} from './tool-execution-card.types';

/**
 * Parse note results from JSON
 */
export function parseNotesResult(result: string): AgentNotesResponse | null {
  try {
    const parsed: unknown = JSON.parse(result);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'type' in parsed &&
      parsed.type === 'notes' &&
      'notes' in parsed &&
      Array.isArray(parsed.notes)
    ) {
      return parsed as AgentNotesResponse;
    }
  } catch {
    // Not JSON or not a notes response
  }
  return null;
}

/**
 * Parse stats results from JSON
 * GetOverview returns type='overview' for full stats, type='stats' for stats-only
 */
export function parseStatsResult(result: string): StatsResponse | null {
  try {
    const parsed: unknown = JSON.parse(result);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'type' in parsed &&
      (parsed.type === 'stats' || parsed.type === 'overview') &&
      'statistics' in parsed
    ) {
      return parsed as StatsResponse;
    }
  } catch {
    // Not JSON or not a stats response
  }
  return null;
}

/**
 * Parse single note result from JSON
 */
export function parseSingleNoteResult(result: string): SingleNoteResponse | null {
  try {
    const parsed: unknown = JSON.parse(result);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'type' in parsed &&
      parsed.type === 'note' &&
      'note' in parsed
    ) {
      return parsed as SingleNoteResponse;
    }
  } catch {
    // Not JSON or not a single note response
  }
  return null;
}

/**
 * Parse generic JSON response
 */
export function parseGenericResult(result: string): GenericResponse | null {
  try {
    const parsed: unknown = JSON.parse(result);
    if (typeof parsed === 'object' && parsed !== null && 'type' in parsed) {
      return parsed as GenericResponse;
    }
  } catch {
    // Not JSON
  }
  return null;
}

/**
 * Parse images result from JSON
 */
export function parseImagesResult(result: string): ImagesResponse | null {
  try {
    const parsed: unknown = JSON.parse(result);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'type' in parsed &&
      parsed.type === 'images' &&
      'images' in parsed &&
      Array.isArray(parsed.images)
    ) {
      return parsed as ImagesResponse;
    }
  } catch {
    // Not JSON or not an images response
  }
  return null;
}
