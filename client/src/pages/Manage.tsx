import { useEffect, useRef, useState } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { withMonotonicProgress, type ProgressReading } from '@/lib/translationProgress';
import { subscribeToTranslationStatus, type TranslationStatus } from '@/lib/translationStatus';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface DrawingFile {
  urn: string;
  name: string;
  size?: number;
  contentType?: string;
}

interface UploadStatus {
  status: 'n/a' | 'pending' | 'inprogress' | 'failed';
  progress?: string;
  messages?: unknown[];
}

function describeUploadStatus(status: UploadStatus): string {
  switch (status.status) {
    case 'n/a':
      return 'Not yet translated.';
    case 'pending':
      return 'Preparing to translate…';
    case 'inprogress':
      return status.progress === 'complete' ? 'Finishing up…' : `Translating (${status.progress})…`;
    case 'failed':
      return 'Translation failed.';
  }
}

function formatBytes(bytes?: number): string {
  if (bytes === undefined) return '—';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

export default function Manage() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<DrawingFile[]>([]);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [deletingUrn, setDeletingUrn] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<DrawingFile | null>(null);
  const [uploadStatuses, setUploadStatuses] = useState<Record<string, UploadStatus>>({});
  const statusUnsubscribesRef = useRef<Record<string, () => void>>({});
  const bestProgressRef = useRef<Record<string, ProgressReading>>({});

  useEffect(() => {
    fetchFiles();
    const unsubscribes = statusUnsubscribesRef.current;
    return () => {
      for (const unsubscribe of Object.values(unsubscribes)) {
        unsubscribe();
      }
    };
  }, []);

  function trackUploadStatus(urn: string) {
    statusUnsubscribesRef.current[urn]?.();
    statusUnsubscribesRef.current[urn] = subscribeToTranslationStatus(
      urn,
      (status) => handleUploadStatus(urn, status),
      (err) => {
        toast.error('Could not check translation status. See the console for more details.');
        console.error(err);
      }
    );
  }

  function handleUploadStatus(urn: string, status: TranslationStatus) {
    if (status.status === 'inprogress') {
      const best = withMonotonicProgress(bestProgressRef.current[urn], status.progress);
      if (best) bestProgressRef.current[urn] = best;
      setUploadStatuses((prev) => ({
        ...prev,
        [urn]: { status: 'inprogress', progress: best?.progress ?? status.progress },
      }));
    } else if (status.status === 'pending') {
      // The job has been accepted but hasn't started translating yet - keep watching rather
      // than treating this as a dead end.
      setUploadStatuses((prev) => ({ ...prev, [urn]: { status: 'pending' } }));
    } else if (status.status === 'failed' || status.status === 'timeout') {
      delete bestProgressRef.current[urn];
      delete statusUnsubscribesRef.current[urn];
      setUploadStatuses((prev) => ({ ...prev, [urn]: { status: 'failed', messages: status.messages } }));
    } else if (status.status === 'n/a') {
      // The manifest may not exist yet if the translation job was only just started - keep
      // watching rather than treating this as a dead end.
      setUploadStatuses((prev) => ({ ...prev, [urn]: { status: 'n/a' } }));
    } else {
      // status === 'success' - translation finished, no more need to track it.
      delete bestProgressRef.current[urn];
      delete statusUnsubscribesRef.current[urn];
      setUploadStatuses((prev) => {
        const next = { ...prev };
        delete next[urn];
        return next;
      });
    }
  }

  async function fetchFiles() {
    try {
      const resp = await fetch('/api/models');
      if (resp.status === 401) {
        window.location.href = '/login.html';
        return;
      }
      if (!resp.ok) {
        throw new Error(await resp.text());
      }
      const list: DrawingFile[] = await resp.json();
      list.sort((a, b) => a.name.localeCompare(b.name));
      setFiles(list);
    } catch (err) {
      toast.error('Could not list drawings. See the console for more details.');
      console.error(err);
    }
  }

  function handleUploadClick() {
    fileInputRef.current?.click();
  }

  async function handleFileChange() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;
    const data = new FormData();
    data.append('model-file', file);
    if (file.name.endsWith('.zip')) {
      const entrypoint = window.prompt('Please enter the filename of the main design inside the archive.');
      data.append('model-zip-entrypoint', entrypoint || '');
    }
    setBusy(true);
    try {
      const resp = await fetch('/api/models', { method: 'POST', body: data });
      if (!resp.ok) {
        throw new Error(await resp.text());
      }
      const model = await resp.json();
      await fetchFiles();
      trackUploadStatus(model.urn);
    } catch (err) {
      toast.error(`Could not upload ${file.name}. See the console for more details.`);
      console.error(err);
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleDelete(file: DrawingFile) {
    setDeletingUrn(file.urn);
    try {
      const resp = await fetch(`/api/models/${encodeURIComponent(file.name)}`, { method: 'DELETE' });
      if (!resp.ok) {
        throw new Error(await resp.text());
      }
      setFiles((prev) => prev.filter((f) => f.urn !== file.urn));
    } catch (err) {
      toast.error(`Could not delete ${file.name}. See the console for more details.`);
      console.error(err);
    } finally {
      setDeletingUrn(null);
    }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login.html';
  }

  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-svh flex-col bg-background">
      <Toaster position="top-right" />
      <header className="flex flex-none flex-col gap-2 bg-secondary px-4 py-2 text-secondary-foreground sm:h-14 sm:flex-row sm:items-center sm:gap-3 sm:py-0">
        <div className="flex items-center gap-3">
          <img
            src="https://cdn.autodesk.io/logo/white/stacked.png"
            alt="Autodesk Platform Services"
            className="h-8 shrink-0"
          />
          <span className="font-semibold tracking-wide">Manage Drawings</span>
        </div>
        <div className="flex flex-1 flex-wrap items-center gap-2 sm:flex-nowrap sm:justify-end sm:gap-3">
          <Button variant="secondary" className="border border-white/20" asChild>
            <a href="/">Viewer</a>
          </Button>
          <Button
            variant="secondary"
            className="border border-white/20"
            onClick={handleUploadClick}
            disabled={busy}
          >
            {busy ? 'Uploading…' : 'Upload'}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button variant="secondary" className="border border-white/20" onClick={handleLogout}>
            Log Out
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-4">
        <div className="mx-auto flex max-w-4xl flex-col gap-4">
          <Input
            placeholder="Search drawings..."
            value={search}
            onChange={(ev) => setSearch(ev.target.value)}
            className="max-w-sm focus-visible:border-foreground focus-visible:ring-foreground/20"
          />

          <div className="overflow-hidden rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Name</th>
                  <th className="px-4 py-2 text-left font-medium">Size</th>
                  <th className="px-4 py-2 text-left font-medium">Type</th>
                  <th className="px-4 py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredFiles.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                      {files.length === 0 ? 'No drawings uploaded yet.' : 'No drawings match your search.'}
                    </td>
                  </tr>
                )}
                {filteredFiles.map((file) => (
                  <tr key={file.urn} className="border-t border-border">
                    <td className="px-4 py-2">
                      <a href={`/#${file.urn}`} className="text-primary hover:underline">
                        {file.name}
                      </a>
                      {uploadStatuses[file.urn] && (
                        <div
                          className={cn(
                            'mt-1 text-xs',
                            uploadStatuses[file.urn].status === 'failed'
                              ? 'text-destructive'
                              : 'text-muted-foreground'
                          )}
                          title={
                            uploadStatuses[file.urn].messages
                              ? JSON.stringify(uploadStatuses[file.urn].messages)
                              : undefined
                          }
                        >
                          {describeUploadStatus(uploadStatuses[file.urn])}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{formatBytes(file.size)}</td>
                    <td className="px-4 py-2 text-muted-foreground">{file.contentType ?? '—'}</td>
                    <td className="px-4 py-2 text-right">
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={deletingUrn === file.urn}
                        onClick={() => setPendingDelete(file)}
                      >
                        {deletingUrn === file.urn ? 'Deleting…' : 'Delete'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <footer className="flex h-7 flex-none items-center justify-center border-t border-border bg-muted text-xs text-muted-foreground">
        &copy; sixfortyfour 2026
      </footer>

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete drawing?</AlertDialogTitle>
            <AlertDialogDescription>
              Delete "{pendingDelete?.name}"? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => pendingDelete && handleDelete(pendingDelete)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
