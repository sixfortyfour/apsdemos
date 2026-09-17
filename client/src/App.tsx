import { useEffect, useRef, useState } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { CheckIcon, ChevronsUpDownIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { initViewer, loadModel } from '@/lib/viewer';

interface Model {
  urn: string;
  name: string;
}

export default function App() {
  const previewRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [models, setModels] = useState<Model[]>([]);
  const [selectedUrn, setSelectedUrn] = useState<string>('');
  const [notification, setNotification] = useState<string>('');
  const [modelPickerOpen, setModelPickerOpen] = useState(false);

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
      list.sort((a, b) => a.name.localeCompare(b.name));
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

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login.html';
  }

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
          <span className="font-semibold tracking-wide">Simple Viewer</span>
        </div>
        <div className="flex flex-1 flex-wrap items-center gap-2 sm:flex-nowrap sm:justify-end sm:gap-3">
          <Popover open={modelPickerOpen} onOpenChange={setModelPickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={modelPickerOpen}
                className="min-w-40 flex-1 justify-between bg-white font-normal text-foreground hover:bg-white hover:text-foreground focus-visible:border-foreground focus-visible:ring-foreground/20 sm:flex-none"
              >
                <span className="truncate">
                  {models.find((m) => m.urn === selectedUrn)?.name ?? 'Select a model'}
                </span>
                <ChevronsUpDownIcon className="size-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="min-w-40 p-0" align="start">
              <Command>
                <CommandInput placeholder="Search models..." />
                <CommandList>
                  <CommandEmpty>No models found.</CommandEmpty>
                  <CommandGroup>
                    {models.map((model) => (
                      <CommandItem
                        key={model.urn}
                        value={model.name}
                        onSelect={() => {
                          handleModelChange(model.urn);
                          setModelPickerOpen(false);
                        }}
                      >
                        <CheckIcon
                          className={cn(
                            'size-4',
                            selectedUrn === model.urn ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        {model.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <Button variant="secondary" className="border border-white/20" asChild>
            <a href="/manage.html">Manage</a>
          </Button>
          <Button variant="secondary" className="border border-white/20" onClick={handleLogout}>
            Log Out
          </Button>
        </div>
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

      <footer className="flex h-7 flex-none items-center justify-center border-t border-border bg-muted text-xs text-muted-foreground">
        &copy; sixfortyfour 2026
      </footer>
    </div>
  );
}
