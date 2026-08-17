import { useEffect, useRef, useState } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { initViewer, loadModel } from '@/lib/viewer';

interface Model {
  urn: string;
  name: string;
}

export default function App() {
  const previewRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const viewerRef = useRef<any>(null);
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [models, setModels] = useState<Model[]>([]);
  const [selectedUrn, setSelectedUrn] = useState<string>('');
  const [notification, setNotification] = useState<string>('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!previewRef.current) return;
    let cancelled = false;
    initViewer(previewRef.current).then((viewer) => {
      if (cancelled) return;
      viewerRef.current = viewer;
      const urn = window.location.hash?.substring(1) || '';
      fetchModels(viewer, urn);
    });
    return () => {
      cancelled = true;
      if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchModels(viewer: any, selected: string) {
    try {
      const resp = await fetch('/api/models');
      if (resp.status === 401) {
        window.location.href = '/login.html';
        return;
      }
      if (!resp.ok) {
        throw new Error(await resp.text());
      }
      const list: Model[] = await resp.json();
      setModels(list);
      const initial = list.some((m) => m.urn === selected) ? selected : '';
      setSelectedUrn(initial);
      if (initial) {
        onModelSelected(viewer, initial);
      }
    } catch (err) {
      toast.error('Could not list models. See the console for more details.');
      console.error(err);
    }
  }

  function handleModelChange(urn: string) {
    setSelectedUrn(urn);
    if (viewerRef.current) {
      onModelSelected(viewerRef.current, urn);
    }
  }

  async function onModelSelected(viewer: any, urn: string) {
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = undefined;
    }
    window.location.hash = urn;
    try {
      const resp = await fetch(`/api/models/${urn}/status`);
      if (!resp.ok) {
        throw new Error(await resp.text());
      }
      const status = await resp.json();
      switch (status.status) {
        case 'n/a':
          setNotification('Model has not been translated.');
          break;
        case 'inprogress':
          setNotification(`Model is being translated (${status.progress})...`);
          pollTimeoutRef.current = setTimeout(() => onModelSelected(viewer, urn), 5000);
          break;
        case 'failed':
          setNotification(
            `Translation failed. ${status.messages.map((msg: unknown) => JSON.stringify(msg)).join(' ')}`
          );
          break;
        default:
          setNotification('');
          loadModel(viewer, urn);
          break;
      }
    } catch (err) {
      toast.error('Could not load model. See the console for more details.');
      console.error(err);
    }
  }

  async function handleUploadClick() {
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
    setNotification(`Uploading model ${file.name}. Do not reload the page.`);
    try {
      const resp = await fetch('/api/models', { method: 'POST', body: data });
      if (!resp.ok) {
        throw new Error(await resp.text());
      }
      const model: Model = await resp.json();
      await fetchModels(viewerRef.current, model.urn);
    } catch (err) {
      toast.error(`Could not upload model ${file.name}. See the console for more details.`);
      console.error(err);
    } finally {
      setNotification('');
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login.html';
  }

  return (
    <div className="flex h-svh flex-col bg-background">
      <Toaster position="top-right" />
      <header className="flex h-14 flex-none items-center gap-3 bg-secondary px-4 text-secondary-foreground">
        <img
          src="https://cdn.autodesk.io/logo/white/stacked.png"
          alt="Autodesk Platform Services"
          className="h-8"
        />
        <span className="font-semibold tracking-wide">Simple Viewer</span>
        <div className="flex-1" />
        <Select value={selectedUrn} onValueChange={handleModelChange} disabled={busy}>
          <SelectTrigger className="min-w-40 bg-white text-foreground">
            <SelectValue placeholder="Select a model" />
          </SelectTrigger>
          <SelectContent>
            {models.map((model) => (
              <SelectItem key={model.urn} value={model.urn}>
                {model.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={handleUploadClick} disabled={busy}>
          Upload
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
      </header>

      <div className="relative flex-1">
        <div ref={previewRef} className="absolute inset-0" />
        {notification && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 p-4">
            <div className="max-w-lg rounded-md bg-card p-4 text-card-foreground shadow-lg">
              {notification}
            </div>
          </div>
        )}
      </div>

      <footer className="flex h-7 flex-none items-center justify-center bg-secondary text-xs text-secondary-foreground/70">
        &copy; sixfortyfour 2026
      </footer>
    </div>
  );
}
