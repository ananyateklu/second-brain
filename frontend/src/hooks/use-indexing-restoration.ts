/**
 * Hook to restore active indexing jobs on app initialization
 * Supports multiple simultaneous jobs
 * This runs independently and handles the restoration logic robustly
 */

import { useEffect, useRef } from 'react';
import { useBoundStore } from '../store/bound-store';
import { ragService } from '../services';

// LocalStorage key - must match the one in indexing-slice
const ACTIVE_INDEXING_JOBS_KEY = 'indexing_active_jobs_v3';

interface StoredIndexingJob {
    jobId: string;
    vectorStore: string;
    embeddingProvider: string;
    userId: string;
    startedAt: number;
}

function getStoredJobs(): Record<string, StoredIndexingJob> {
    try {
        const stored = localStorage.getItem(ACTIVE_INDEXING_JOBS_KEY);
        if (!stored) return {};
        return JSON.parse(stored) as Record<string, StoredIndexingJob>;
    } catch {
        return {};
    }
}

function removeStoredJob(vectorStore: string): void {
    try {
        const jobs = getStoredJobs();
        delete jobs[vectorStore];
        localStorage.setItem(ACTIVE_INDEXING_JOBS_KEY, JSON.stringify(jobs));
    } catch {
        // Ignore errors
    }
}

/**
 * Hook that runs once on app mount to restore any active indexing jobs
 * This is independent of auth state to ensure restoration happens early
 */
export function useIndexingRestoration() {
    const hasRestoredRef = useRef(false);
    const {
        activeJobs,
        isRestoring,
        restoreIndexingJob,
        setIsRestoring,
    } = useBoundStore();

    useEffect(() => {
        // Only run once
        if (hasRestoredRef.current) return;

        // Don't run if already have active jobs or already restoring
        if (Object.keys(activeJobs).length > 0 || isRestoring) return;

        hasRestoredRef.current = true;

        const restoreJobs = async () => {
            const storedJobs = getStoredJobs();
            const jobEntries = Object.entries(storedJobs);

            if (jobEntries.length === 0) {
                return;
            }

            setIsRestoring(true);

            // Extended timeout - 30 minutes for longer indexing jobs
            const THIRTY_MINUTES = 30 * 60 * 1000;

            try {
                // Restore each job
                for (const [vectorStore, storedJob] of jobEntries) {
                    // Check if job is too old
                    if (Date.now() - storedJob.startedAt > THIRTY_MINUTES) {
                        removeStoredJob(vectorStore);
                        continue;
                    }

                    try {
                        // Fetch current status from backend
                        const jobStatus = await ragService.getIndexingStatus(storedJob.jobId);

                        if (jobStatus.status === 'running' || jobStatus.status === 'pending') {
                            // Job is still active - restore it
                            restoreIndexingJob(
                                jobStatus,
                                storedJob.vectorStore,
                                storedJob.embeddingProvider,
                                storedJob.userId
                            );
                        } else {
                            // Job is complete/failed, clean up localStorage
                            removeStoredJob(vectorStore);
                        }
                    } catch (error) {
                        console.warn(`Failed to restore indexing job for ${vectorStore}:`, error);
                        // Job not found or error - clean up localStorage
                        removeStoredJob(vectorStore);
                    }
                }
            } finally {
                setIsRestoring(false);
            }
        };

        void restoreJobs();
    }, [activeJobs, isRestoring, restoreIndexingJob, setIsRestoring]);
}
