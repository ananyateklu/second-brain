export type FolderFilter = string | null;

export type ArchiveFilter = 'all' | 'not-archived' | 'archived';

export type FolderStats = {
  all: number;
  archived: number;
  active: number;
  unfiled: number;
  folders: Record<string, number>;
};
