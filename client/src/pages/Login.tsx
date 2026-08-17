import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function Login() {
  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const resp = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passphrase }),
      });
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        setError(body.error || 'Login failed.');
        return;
      }
      const redirect = new URLSearchParams(window.location.search).get('redirect');
      window.location.href = redirect || '/';
    } catch (err) {
      setError('Login failed. See the console for more details.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <main className="flex flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="items-center text-center">
            <img
              src="https://cdn.autodesk.io/logo/black/stacked.png"
              alt="Autodesk Platform Services"
              className="h-12"
            />
            <CardTitle className="text-xl">Demos</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              <div className="flex flex-col gap-2">
                <Label htmlFor="passphrase">Passphrase</Label>
                <Input
                  id="passphrase"
                  name="passphrase"
                  type="password"
                  autoComplete="current-password"
                  autoFocus
                  required
                  value={passphrase}
                  onChange={(ev) => setPassphrase(ev.target.value)}
                />
              </div>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Logging in…' : 'Log In'}
              </Button>
              <p className="min-h-4 text-center text-sm text-destructive">{error}</p>
            </form>
          </CardContent>
        </Card>
      </main>
      <footer className="p-4 text-center text-sm text-muted-foreground">
        &copy; sixfortyfour 2026
      </footer>
    </div>
  );
}
