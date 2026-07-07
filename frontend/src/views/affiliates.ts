import { api } from '../api.js';
import type { Affiliate } from '../types.js';
import { fmtPHP } from '../main.js';

export async function renderAffiliates(): Promise<string> {
  const affiliates = await api.getAffiliates();

  const totalActive = affiliates.filter(a => a.status === 'active').length;
  const totalEarned = affiliates.reduce((s, a) => s + parseFloat(a.lifetime_earned), 0);
  const avgRate = affiliates.length
    ? (affiliates.reduce((s, a) => s + parseFloat(a.commission_rate), 0) / affiliates.length).toFixed(1)
    : '0';

  const rows = affiliates.map(a => `
    <tr>
      <td><strong style="color:var(--pine);">${a.member_name}</strong>${a.business ? `<br><span style="color:var(--muted);font-size:0.72rem;">${a.business}</span>` : ''}</td>
      <td><span class="code-tag">${a.code}</span></td>
      <td>${parseFloat(a.commission_rate)}%</td>
      <td><span class="pill ${a.status}">${a.status}</span></td>
      <td style="color:var(--muted);font-size:0.74rem;">${a.joined_at.slice(0, 10)}</td>
      <td>${fmtPHP(parseFloat(a.lifetime_earned))}</td>
      <td>
        ${a.status === 'active'
          ? `<button class="small-btn ghost" data-toggle="${a.id}">Pause</button>`
          : a.status === 'paused'
            ? `<button class="small-btn primary" data-toggle="${a.id}">Reactivate</button>`
            : ''}
      </td>
    </tr>
  `).join('');

  return `
    <div class="metric-strip">
      <div class="metric-card"><div class="metric-label">Active Affiliates</div><div class="metric-value">${totalActive}</div><div class="metric-sub">of ${affiliates.length} total</div></div>
      <div class="metric-card"><div class="metric-label">Lifetime Commission Paid</div><div class="metric-value">${fmtPHP(totalEarned)}</div></div>
      <div class="metric-card"><div class="metric-label">Avg. Commission Rate</div><div class="metric-value">${avgRate}%</div></div>
    </div>
    <table class="data-table">
      <thead><tr>
        <th>Member</th><th>Code</th><th>Commission Rate</th>
        <th>Status</th><th>Joined</th><th>Lifetime Earned</th><th></th>
      </tr></thead>
      <tbody>${rows || '<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:32px;">No affiliates yet</td></tr>'}</tbody>
    </table>
  `;
}

export function attachAffiliateHandlers(reload: () => void): void {
  document.querySelectorAll<HTMLButtonElement>('[data-toggle]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = Number(btn.dataset.toggle);
      btn.disabled = true;
      await api.toggleAffiliateStatus(id);
      reload();
    });
  });
}
