document.getElementById('login-form').addEventListener('submit', async function (ev) {
    ev.preventDefault();
    const errorEl = document.getElementById('error');
    errorEl.textContent = '';
    const passphrase = document.getElementById('passphrase').value;
    try {
        const resp = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ passphrase })
        });
        if (!resp.ok) {
            const body = await resp.json().catch(() => ({}));
            errorEl.textContent = body.error || 'Login failed.';
            return;
        }
        const redirect = new URLSearchParams(window.location.search).get('redirect');
        window.location.href = redirect || '/';
    } catch (err) {
        errorEl.textContent = 'Login failed. See the console for more details.';
        console.error(err);
    }
});
