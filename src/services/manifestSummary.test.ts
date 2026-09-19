import { describe, it, expect } from 'vitest';
import manifestSummaryModule from './manifestSummary.js';

const { summarizeManifest } = manifestSummaryModule as unknown as {
  summarizeManifest: (manifest: any) => { status: string; progress?: string; messages?: any[] };
};

describe('summarizeManifest', () => {
  it('reports "n/a" when there is no manifest yet', () => {
    expect(summarizeManifest(null)).toEqual({ status: 'n/a' });
    expect(summarizeManifest(undefined)).toEqual({ status: 'n/a' });
  });

  it('passes through status and progress with no messages when there are no derivatives', () => {
    const manifest = { status: 'inprogress', progress: '50%' };
    expect(summarizeManifest(manifest)).toEqual({ status: 'inprogress', progress: '50%', messages: [] });
  });

  it('collects messages from top-level derivatives', () => {
    const manifest = {
      status: 'failed',
      progress: 'complete',
      derivatives: [{ messages: ['error A'] }, { messages: ['error B'] }],
    };
    expect(summarizeManifest(manifest).messages).toEqual(['error A', 'error B']);
  });

  it('collects messages from nested derivative children too', () => {
    const manifest = {
      status: 'success',
      progress: 'complete',
      derivatives: [
        {
          messages: ['top-level warning'],
          children: [{ messages: ['child warning 1'] }, { messages: ['child warning 2'] }],
        },
      ],
    };
    expect(summarizeManifest(manifest).messages).toEqual([
      'top-level warning',
      'child warning 1',
      'child warning 2',
    ]);
  });

  it('treats missing messages arrays as empty rather than throwing', () => {
    const manifest = {
      status: 'success',
      derivatives: [{ children: [{}] }],
    };
    expect(summarizeManifest(manifest).messages).toEqual([]);
  });

  it('prefers a more advanced derivative progress over a lagging root progress', () => {
    const manifest = {
      status: 'inprogress',
      progress: '0% complete',
      derivatives: [{ progress: '45% complete', children: [{ progress: '60% complete' }] }],
    };
    expect(summarizeManifest(manifest).progress).toBe('60% complete');
  });

  it('reports "complete" derivative progress even while the root is still stuck below 100%', () => {
    const manifest = {
      status: 'inprogress',
      progress: '99% complete',
      derivatives: [{ status: 'success', progress: 'complete' }],
    };
    expect(summarizeManifest(manifest).progress).toBe('complete');
  });

  it('keeps the root progress when no derivative/child is further along', () => {
    const manifest = {
      status: 'inprogress',
      progress: '50% complete',
      derivatives: [{ progress: '10% complete' }],
    };
    expect(summarizeManifest(manifest).progress).toBe('50% complete');
  });

  it('falls back to the root progress when derivatives report no progress at all', () => {
    const manifest = {
      status: 'inprogress',
      progress: '20% complete',
      derivatives: [{ children: [{}] }],
    };
    expect(summarizeManifest(manifest).progress).toBe('20% complete');
  });
});
