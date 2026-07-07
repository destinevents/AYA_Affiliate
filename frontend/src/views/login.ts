import { api } from '../api.js';
import { setToken } from '../auth.js';

export function renderLogin(onSuccess: () => void): string {
  return `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--pine-deep);">
      <div style="background:#fff;border-radius:12px;padding:40px;width:100%;max-width:380px;">
        <div style="font-family:'Fraunces',serif;font-size:1.5rem;color:var(--pine);margin-bottom:4px;">
          <em style="font-style:italic;color:var(--gold);">asyouare</em>Baguio
        </div>
        <div style="font-family:'DM Mono',monospace;font-size:0.6rem;letter-spacing:0.14em;text-transform:uppercase;color:var(--muted);margin-bottom:28px;">Affiliate Admin</div>
        <div style="margin-bottom:16px;">
          <label style="font-family:'DM Mono',monospace;font-size:0.6rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);display:block;margin-bottom:6px;">Username</label>
          <input id="login-user" type="text" autocomplete="username" style="width:100%;padding:10px 14px;border:1px solid var(--border-fog);border-radius:6px;font-size:0.9rem;outline:none;">
        </div>
        <div style="margin-bottom:24px;">
          <label style="font-family:'DM Mono',monospace;font-size:0.6rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);display:block;margin-bottom:6px;">Password</label>
          <input id="login-pass" type="password" autocomplete="current-password" style="width:100%;padding:10px 14px;border:1px solid var(--border-fog);border-radius:6px;font-size:0.9rem;outline:none;">
        </div>
        <div id="login-error" style="color:var(--terra);font-size:0.78rem;margin-bottom:12px;display:none;"></div>
        <button id="login-btn" style="width:100%;padding:12px;background:var(--pine);color:var(--fog);border:none;border-radius:6px;font-family:'DM Mono',monospace;font-size:0.62rem;letter-spacing:0.08em;text-transform:uppercase;cursor:pointer;">
          Sign In
        </button>
      </div>
    </div>
  `;
}

export function attachLoginHandlers(onSuccess: () => void): void {
  const btn = document.getElementById('login-btn')!;
  const errEl = document.getElementById('login-error')!;

  const attempt = async () => {
    const username = (document.getElementById('login-user') as HTMLInputElement).value.trim();
    const password = (document.getElementById('login-pass') as HTMLInputElement).value;
    btn.textContent = 'Signing in…';
    errEl.style.display = 'none';
    try {
      const { token } = await api.login(username, password);
      setToken(token);
      onSuccess();
    } catch {
      errEl.textContent = 'Invalid username or password';
      errEl.style.display = 'block';
      btn.textContent = 'Sign In';
    }
  };

  btn.addEventListener('click', attempt);
  document.getElementById('login-pass')!.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') attempt();
  });
}
