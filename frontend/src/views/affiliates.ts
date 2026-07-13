import { api } from '../api.js';
import type { Affiliate, Conversion } from '../types.js';
import { fmtPHP, esc, svgSparkline } from '../utils.js';

function buildSparklines(affiliates: Affiliate[], conversions: Conversion[]): Map<number, string> {
  const now = new Date();
  const months: { year: number; month: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth() });
  }
  const map = new Map<number, string>();
  for (const a of affiliates) {
    const data = months.map(m => {
      const amount = conversions
        .filter(c => c.affiliate_id === a.id && c.status === 'paid')
        .filter(c => { const d = new Date(c.created_at); return d.getFullYear() === m.year && d.getMonth() === m.month; })
        .reduce((s, c) => s + parseFloat(c.commission_amount), 0);
      return { month: `${m.year}-${m.month}`, amount };
    });
    map.set(a.id, svgSparkline(data));
  }
  return map;
}

export async function renderAffiliates(): Promise<string> {
  const [affiliates, conversions] = await Promise.all([api.getAffiliates(), api.getConversions()]);
  const sparklines = buildSparklines(affiliates, conversions);

  const totalActive = affiliates.filter(a => a.status === 'active').length;
  const totalEarned = affiliates.reduce((s, a) => s + parseFloat(a.lifetime_earned), 0);
  const totalPending = affiliates.reduce((s, a) => s + parseFloat(a.pending_commission), 0);
  const avgRate = affiliates.length
    ? (affiliates.reduce((s, a) => s + parseFloat(a.commission_rate), 0) / affiliates.length).toFixed(1)
    : '0';

  const rows = affiliates.map(a => {
    const pending = parseFloat(a.pending_commission);
    const minPayout = parseFloat(a.min_payout);
    const belowThreshold = minPayout > 0 && pending > 0 && pending < minPayout;
    const pendingCell = pending > 0
      ? `${fmtPHP(pending)}${belowThreshold ? `<br><span style="color:var(--terra);font-size:0.62rem;">below ₱${minPayout} min</span>` : ''}`
      : `<span style="color:var(--muted);">—</span>`;

    return `
    <tr>
      <td>
        <strong style="color:var(--pine);">${esc(a.member_name)}</strong>
        ${a.business ? `<br><span style="color:var(--muted);font-size:0.72rem;">${esc(a.business)}</span>` : ''}
      </td>
      <td><span class="code-tag">${esc(a.code)}</span></td>
      <td>${parseFloat(a.commission_rate)}%</td>
      <td><span class="pill ${a.status}">${esc(a.status)}</span></td>
      <td style="color:var(--muted);font-size:0.74rem;">${a.joined_at.slice(0, 10)}</td>
      <td>${fmtPHP(parseFloat(a.lifetime_earned))}</td>
      <td style="font-size:0.8rem;">${pendingCell}</td>
      <td>${sparklines.get(a.id) ?? ''}</td>
      <td style="white-space:nowrap;">
        <button class="small-btn ghost" data-edit-affiliate="${a.id}"
          data-name="${esc(a.member_name)}"
          data-business="${esc(a.business ?? '')}"
          data-rate="${parseFloat(a.commission_rate)}"
          data-min="${parseFloat(a.min_payout)}">Edit</button>
        ${a.status === 'active'
          ? `<button class="small-btn ghost" data-toggle="${a.id}" style="margin-left:4px;">Pause</button>`
          : a.status === 'paused'
            ? `<button class="small-btn primary" data-toggle="${a.id}" style="margin-left:4px;">Reactivate</button>`
            : ''}
        <button class="small-btn ghost" data-delete="${a.id}" data-name="${esc(a.member_name)}" style="margin-left:4px;">Delete</button>
      </td>
    </tr>`;
  }).join('');

  return `
    <div class="metric-strip">
      <div class="metric-card"><div class="metric-label">Active Affiliates</div><div class="metric-value">${totalActive}</div><div class="metric-sub">of ${affiliates.length} total</div></div>
      <div class="metric-card"><div class="metric-label">Lifetime Commission Paid</div><div class="metric-value">${fmtPHP(totalEarned)}</div></div>
      <div class="metric-card"><div class="metric-label">Pending Payout</div><div class="metric-value">${fmtPHP(totalPending)}</div><div class="metric-sub">across all affiliates</div></div>
      <div class="metric-card"><div class="metric-label">Avg. Commission Rate</div><div class="metric-value">${avgRate}%</div></div>
    </div>

    <div id="affiliate-edit-wrap" style="display:none;margin-bottom:20px;">
      <div class="form-card" style="max-width:560px;">
        <div style="font-family:'Fraunces',serif;font-size:1rem;color:var(--pine);margin-bottom:14px;font-weight:600;" id="aff-edit-title">Edit Affiliate</div>
        <div style="display:flex;gap:14px;">
          <div class="field-group" style="flex:2;">
            <label class="field-label">Name</label>
            <input type="text" class="field-input" id="aff-edit-name">
          </div>
          <div class="field-group" style="flex:2;">
            <label class="field-label">Business (optional)</label>
            <input type="text" class="field-input" id="aff-edit-business">
          </div>
        </div>
        <div style="display:flex;gap:14px;">
          <div class="field-group" style="flex:1;">
            <label class="field-label">Commission Rate (%)</label>
            <input type="number" class="field-input" id="aff-edit-rate" min="0" max="100" step="0.5">
          </div>
          <div class="field-group" style="flex:1;">
            <label class="field-label">Min. Payout (₱)</label>
            <input type="number" class="field-input" id="aff-edit-min" min="0" step="50" placeholder="0 = no minimum">
          </div>
        </div>
        <div id="aff-edit-error" style="color:var(--terra);font-size:0.78rem;margin-bottom:12px;display:none;"></div>
        <div style="display:flex;gap:10px;">
          <button class="small-btn primary" style="padding:10px 20px;font-size:0.6rem;" id="aff-edit-submit">Save Changes</button>
          <button class="small-btn ghost" style="padding:10px 20px;font-size:0.6rem;" id="aff-edit-cancel">Cancel</button>
        </div>
      </div>
    </div>

    <table class="data-table">
      <thead><tr>
        <th>Member</th><th>Code</th><th>Rate</th>
        <th>Status</th><th>Joined</th><th>Lifetime Earned</th><th>Pending</th><th>Activity</th><th></th>
      </tr></thead>
      <tbody>${rows || '<tr><td colspan="9" style="text-align:center;color:var(--muted);padding:32px;">No affiliates yet</td></tr>'}</tbody>
    </table>
  `;
}

export function attachAffiliateHandlers(reload: () => void): void {
  let editingId: number | null = null;
  const editWrap = document.getElementById('affiliate-edit-wrap')!;
  const errEl = document.getElementById('aff-edit-error')!;

  document.querySelectorAll<HTMLButtonElement>('[data-edit-affiliate]').forEach(btn => {
    btn.addEventListener('click', () => {
      editingId = Number(btn.dataset.editAffiliate);
      (document.getElementById('aff-edit-title') as HTMLElement).textContent = `Edit — ${btn.dataset.name}`;
      (document.getElementById('aff-edit-name') as HTMLInputElement).value = btn.dataset.name ?? '';
      (document.getElementById('aff-edit-business') as HTMLInputElement).value = btn.dataset.business ?? '';
      (document.getElementById('aff-edit-rate') as HTMLInputElement).value = btn.dataset.rate ?? '';
      (document.getElementById('aff-edit-min') as HTMLInputElement).value = btn.dataset.min ?? '0';
      errEl.style.display = 'none';
      editWrap.style.display = 'block';
      editWrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  });

  document.getElementById('aff-edit-cancel')?.addEventListener('click', () => {
    editWrap.style.display = 'none';
    editingId = null;
  });

  document.getElementById('aff-edit-submit')?.addEventListener('click', async () => {
    if (editingId === null) return;
    errEl.style.display = 'none';
    const name = (document.getElementById('aff-edit-name') as HTMLInputElement).value.trim();
    const business = (document.getElementById('aff-edit-business') as HTMLInputElement).value.trim() || null;
    const commission_rate = Number((document.getElementById('aff-edit-rate') as HTMLInputElement).value);
    const min_payout = Number((document.getElementById('aff-edit-min') as HTMLInputElement).value);

    if (!name || isNaN(commission_rate) || commission_rate < 0) {
      errEl.textContent = 'Name and a valid commission rate are required';
      errEl.style.display = 'block';
      return;
    }
    try {
      await api.updateAffiliate(editingId, { member_name: name, business, commission_rate, min_payout });
      reload();
    } catch (err) {
      errEl.textContent = err instanceof Error ? err.message : 'Failed to update affiliate';
      errEl.style.display = 'block';
    }
  });

  document.querySelectorAll<HTMLButtonElement>('[data-toggle]').forEach(btn => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      await api.toggleAffiliateStatus(Number(btn.dataset.toggle));
      reload();
    });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-delete]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = Number(btn.dataset.delete);
      const name = btn.dataset.name ?? 'this affiliate';
      if (!confirm(`Delete ${name}? This also removes their promo code and cannot be undone.`)) return;
      btn.disabled = true;
      try {
        await api.deleteAffiliate(id);
        reload();
      } catch (err) {
        btn.disabled = false;
        const msg = err instanceof Error ? err.message : 'Failed to delete';
        try { alert(JSON.parse(msg).error ?? msg); } catch { alert(msg); }
      }
    });
  });
}
