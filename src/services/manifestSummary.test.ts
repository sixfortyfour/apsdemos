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
});
