/**
 * Insights Skeleton
 * Loading skeleton for the Insights page
 */

import { memo } from 'react';
import { DashboardSkeleton } from '../../dashboard/components/DashboardSkeleton';

export const InsightsSkeleton = memo(function InsightsSkeleton() {
  // Use the existing DashboardSkeleton as the default loading state
  // since Overview tab is the default and most commonly loaded
  return <DashboardSkeleton />;
});
