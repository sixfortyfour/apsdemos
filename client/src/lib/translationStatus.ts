export interface TranslationStatus {
  status: 'n/a' | 'pending' | 'inprogress' | 'success' | 'failed' | 'timeout';
  progress?: string;
  messages?: unknown[];
}

function isTerminal(status: string): boolean {
  return status === 'success' || status === 'failed' || status === 'timeout';
}

// Streams translation status for a urn via SSE, calling onStatus for the initial snapshot and
// every update after. Falls back to polling /api/models/:urn/status every 2s if the stream can't
// be established at all (e.g. a proxy that blocks streaming responses) - once at least one SSE
// message has arrived, the stream is trusted for the rest of this subscription's lifetime, since
// the server closes it itself once the status reaches a terminal state.
export function subscribeToTranslationStatus(
  urn: string,
  onStatus: (status: TranslationStatus) => void,
  onError: (err: unknown) => void
): () => void {
  let closed = false;
  let pollTimeout: ReturnType<typeof setTimeout> | undefined;
  let source: EventSource | undefined;
  let receivedAnyMessage = false;

  function cleanup() {
    closed = true;
    if (pollTimeout) clearTimeout(pollTimeout);
    source?.close();
  }

  async function pollOnce() {
    try {
      const resp = await fetch(`/api/models/${urn}/status`, { cache: 'no-store' });
      if (!resp.ok) throw new Error(await resp.text());
      const status: TranslationStatus = await resp.json();
      if (closed) return;
      onStatus(status);
      if (!isTerminal(status.status)) {
        pollTimeout = setTimeout(pollOnce, 2000);
      }
    } catch (err) {
      if (!closed) onError(err);
    }
  }

  source = new EventSource(`/api/models/${urn}/status/stream`);
  source.onmessage = (ev) => {
    receivedAnyMessage = true;
    if (closed) return;
    const status: TranslationStatus = JSON.parse(ev.data);
    onStatus(status);
    if (isTerminal(status.status)) {
      closed = true;
      source?.close();
    }
  };
  source.onerror = () => {
    if (closed) return;
    if (!receivedAnyMessage) {
      // The stream never opened - fall back to the old polling approach rather than leaving the
      // caller stuck (EventSource would otherwise retry the same stream indefinitely).
      source?.close();
      source = undefined;
      pollOnce();
    }
    // Otherwise this is just the connection closing after real updates (normal at a terminal
    // status, or a drop mid-stream) - nothing more for the client to do either way.
  };

  return cleanup;
}
