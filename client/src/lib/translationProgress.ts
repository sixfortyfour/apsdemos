function parseProgressPercent(progress: string | undefined): number | null {
  if (!progress) return null;
  if (progress === 'complete') return 100;
  const match = /^(\d+)%/.exec(progress);
  return match ? Number(match[1]) : null;
}

export interface ProgressReading {
  percent: number;
  progress: string;
}

// The manifest's derivative/child breakdown can change shape between polls as
// translation proceeds, so the "current furthest along" progress computed by
// the server isn't guaranteed to increase from one poll to the next. Clamp
// what's shown to whatever's furthest along so far, so the UI never regresses
// (e.g. "Finishing up..." briefly reverting to "Translating (99%)...").
export function withMonotonicProgress(
  previous: ProgressReading | undefined,
  progress: string | undefined
): ProgressReading | undefined {
  const percent = parseProgressPercent(progress);
  if (percent === null) return previous;
  if (!previous || percent >= previous.percent) return { percent, progress: progress! };
  return previous;
}
