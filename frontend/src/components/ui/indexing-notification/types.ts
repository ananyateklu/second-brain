/**
 * Indexing Notification Types
 */

import type { IndexingJobInfo } from '../../../store/slices/indexing-slice';

export interface IconProps {
  className?: string;
  style?: React.CSSProperties;
}

export interface JobCardProps {
  job: IndexingJobInfo;
  onClear: (vectorStore: string) => void;
  onRefreshStats: () => void;
}
