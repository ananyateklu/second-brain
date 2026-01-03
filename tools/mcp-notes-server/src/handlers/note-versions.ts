import type { ApiClient } from '../api-client.js';

export async function handleGetVersions(
  client: ApiClient,
  args: Record<string, unknown>
): Promise<object> {
  const { noteId, skip, take } = args;

  if (!noteId || typeof noteId !== 'string') {
    return { success: false, error: 'Note ID is required', code: 'VALIDATION_ERROR' };
  }

  const result = await client.getVersionHistory(
    noteId,
    typeof skip === 'number' ? skip : 0,
    typeof take === 'number' ? take : 50
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      code: result.statusCode === 404 ? 'NOT_FOUND' : 'API_ERROR',
      hint: result.statusCode === 404
        ? 'Note not found. Use list_notes to find available notes.'
        : undefined,
    };
  }

  const { noteId: id, totalVersions, currentVersion, versions } = result.data;

  return {
    success: true,
    data: {
      noteId: id,
      totalVersions,
      currentVersion,
      versions: versions.map(v => ({
        versionNumber: v.versionNumber,
        isCurrent: v.isCurrent,
        validFrom: v.validFrom,
        validTo: v.validTo,
        title: v.title,
        contentPreview: v.content.length > 200
          ? v.content.substring(0, 200) + '...'
          : v.content,
        tags: v.tags,
        folder: v.folder,
        source: v.source,
        aiProvider: v.aiProvider,
        aiModel: v.aiModel,
        changeSummary: v.changeSummary,
      })),
      hint: 'Use restore_note_version to restore to a previous version',
    },
  };
}

export async function handleRestoreVersion(
  client: ApiClient,
  args: Record<string, unknown>
): Promise<object> {
  const { noteId, targetVersion } = args;

  if (!noteId || typeof noteId !== 'string') {
    return { success: false, error: 'Note ID is required', code: 'VALIDATION_ERROR' };
  }
  if (typeof targetVersion !== 'number' || targetVersion < 1) {
    return {
      success: false,
      error: 'Target version number is required (must be >= 1)',
      code: 'VALIDATION_ERROR',
    };
  }

  const result = await client.restoreVersion(noteId, targetVersion);

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      code: result.statusCode === 404 ? 'NOT_FOUND' : 'API_ERROR',
      hint: result.statusCode === 404
        ? 'Note or version not found. Use get_note_versions to see available versions.'
        : undefined,
    };
  }

  return {
    success: true,
    data: {
      message: result.data.message,
      noteId: result.data.noteId,
      restoredFromVersion: result.data.restoredFromVersion,
      newVersionNumber: result.data.newVersionNumber,
      changedFields: result.data.changedFields,
      hint: 'A new version was created with the restored content. The previous content is preserved in version history.',
    },
  };
}
