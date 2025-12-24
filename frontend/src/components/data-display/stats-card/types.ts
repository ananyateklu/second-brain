/**
 * Stats card types for indexing statistics display.
 */

import type { IndexStatsData, VectorStoreProvider } from '../../../types/rag';

export interface StatsCardProps {
  title: string;
  stats: IndexStatsData | undefined;
  userId: string;
  vectorStoreProvider: VectorStoreProvider;
  isIndexing: boolean;
}

export interface StatsCardHeaderProps {
  title: string;
  isHealthy: boolean;
  vectorStoreProvider: string;
  hasData: boolean;
  canDelete: boolean;
  isDeleting: boolean;
  onDelete: (e: React.MouseEvent) => void;
}

export interface StatsCardGridProps {
  stats: IndexStatsData;
  isIndexing: boolean;
}

export interface StatsCardFooterProps {
  stats: IndexStatsData;
}

export interface HealthIndicatorProps {
  isHealthy: boolean;
  hasData: boolean;
}

export interface DeleteButtonProps {
  isDeleting: boolean;
  onClick: (e: React.MouseEvent) => void;
  title: string;
}
