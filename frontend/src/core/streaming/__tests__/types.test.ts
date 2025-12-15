/**
 * Streaming Types Tests
 * Unit tests for type guards in the streaming types module
 */

import { describe, it, expect } from 'vitest';
import {
    isStreamEvent,
    isActivePhase,
    isStreamingStatus,
    StreamPhase,
    StreamStatus,
} from '../types';

describe('streaming types', () => {
    // ============================================
    // isStreamEvent Tests
    // ============================================
    describe('isStreamEvent', () => {
        it('should return true for valid stream event with type property', () => {
            const event = { type: 'message', content: 'test' };
            expect(isStreamEvent(event)).toBe(true);
        });

        it('should return true for minimal stream event', () => {
            const event = { type: 'start' };
            expect(isStreamEvent(event)).toBe(true);
        });

        it('should return false for null', () => {
            expect(isStreamEvent(null)).toBe(false);
        });

        it('should return false for undefined', () => {
            expect(isStreamEvent(undefined)).toBe(false);
        });

        it('should return false for non-object values', () => {
            expect(isStreamEvent('string')).toBe(false);
            expect(isStreamEvent(123)).toBe(false);
            expect(isStreamEvent(true)).toBe(false);
        });

        it('should return false for object without type property', () => {
            const event = { content: 'test' };
            expect(isStreamEvent(event)).toBe(false);
        });

        it('should return false for object with non-string type', () => {
            const event = { type: 123 };
            expect(isStreamEvent(event)).toBe(false);
        });

        it('should return false for array', () => {
            expect(isStreamEvent(['type', 'message'])).toBe(false);
        });
    });

    // ============================================
    // isActivePhase Tests
    // ============================================
    describe('isActivePhase', () => {
        it('should return true for connecting phase', () => {
            expect(isActivePhase('connecting')).toBe(true);
        });

        it('should return true for streaming phase', () => {
            expect(isActivePhase('streaming')).toBe(true);
        });

        it('should return true for tool-execution phase', () => {
            expect(isActivePhase('tool-execution')).toBe(true);
        });

        it('should return true for image-generation phase', () => {
            expect(isActivePhase('image-generation')).toBe(true);
        });

        it('should return true for finalizing phase', () => {
            expect(isActivePhase('finalizing')).toBe(true);
        });

        it('should return false for idle phase', () => {
            expect(isActivePhase('idle')).toBe(false);
        });

        it('should return false for complete phase', () => {
            expect(isActivePhase('complete')).toBe(false);
        });

        it('should return false for error phase', () => {
            expect(isActivePhase('error')).toBe(false);
        });

        // Test all active phases
        const activePhases: StreamPhase[] = ['connecting', 'streaming', 'tool-execution', 'image-generation', 'finalizing'];
        activePhases.forEach(phase => {
            it(`should identify ${phase} as active`, () => {
                expect(isActivePhase(phase)).toBe(true);
            });
        });

        // Test all inactive phases
        const inactivePhases: StreamPhase[] = ['idle', 'complete', 'error'];
        inactivePhases.forEach(phase => {
            it(`should identify ${phase} as inactive`, () => {
                expect(isActivePhase(phase)).toBe(false);
            });
        });
    });

    // ============================================
    // isStreamingStatus Tests
    // ============================================
    describe('isStreamingStatus', () => {
        it('should return true for connecting status', () => {
            expect(isStreamingStatus('connecting')).toBe(true);
        });

        it('should return true for streaming status', () => {
            expect(isStreamingStatus('streaming')).toBe(true);
        });

        it('should return false for idle status', () => {
            expect(isStreamingStatus('idle')).toBe(false);
        });

        it('should return false for complete status', () => {
            expect(isStreamingStatus('complete')).toBe(false);
        });

        it('should return false for error status', () => {
            expect(isStreamingStatus('error')).toBe(false);
        });

        // Test all streaming statuses
        const streamingStatuses: StreamStatus[] = ['connecting', 'streaming'];
        streamingStatuses.forEach(status => {
            it(`should identify ${status} as streaming`, () => {
                expect(isStreamingStatus(status)).toBe(true);
            });
        });

        // Test all non-streaming statuses
        const nonStreamingStatuses: StreamStatus[] = ['idle', 'complete', 'error'];
        nonStreamingStatuses.forEach(status => {
            it(`should identify ${status} as not streaming`, () => {
                expect(isStreamingStatus(status)).toBe(false);
            });
        });
    });
});
