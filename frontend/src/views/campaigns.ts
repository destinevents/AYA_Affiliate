import { api } from '../api.js';
import { fmtPHP, esc } from '../utils.js';

export async function renderCampaigns(): Promise<string> {
  const campaigns = await api.getCampaigns();

  const rows = campaigns.map(c => {
    const statusClass = c.status === 'active' ? 'active' : c.status === 'upcoming' ? 'upcoming' : 'ended';
    const window = c.type === 'product'
      ? '<span style="color:var(--muted);font-size:0.74rem;">Ongoing</span>'
      : `<span style="color:var(--muted);font-size:0.74rem;">${esc(c.start_date!)} → ${esc(c.end_date!)}</span>`;
    return `
      <tr>
        <td>
          <strong style="color:var(--pine);">${esc(c.name)}</strong>
          <span style="margin-left:6px;font-family:'DM Mono',monospace;font-size:0.6rem;letter-spacing:0.08em;text-transform:uppercase;color:var(--muted);">${c.type}</span>
        </td>
        <td><span class="pill ${statusClass}">${esc(c.status)}</span></td>
        <td>${window}</td>
        <td>${c.codes_linked}</td>
        <td>${c.conversions}</td>
        <td>${fmtPHP(parseFloat(c.revenue))}</td>
        <td style="white-space:nowrap;">
          <button class="small-btn ghost" data-delete-campaign="${c.id}" data-name="${esc(c.name)}">Delete</button>
        </td>
      </tr>
    `;
  }).join('');

  return `
    <table class="data-table">
      <thead><tr>
        <th>Campaign</th><th>Status</th><th>Window</th>
        <th>Codes Linked</th><th>Conversions</th><th>Revenue Generated</th><th></th>
      </tr></thead>
      <tbody>${rows || '<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:32px;">No campaigns yet — create one below</td></tr>'}</tbody>
    </table>

    <div style="margin-top:32px;">
      <button class="small-btn gold" style="padding:10px 20px;font-size:0.6rem;margin-bottom:20px;" id="toggle-campaign-form">
        + New Campaign
      </button>

      <div id="campaign-form-wrap" style="display:none;">
        <div class="form-card" style="max-width:560px;">
          <div class="field-group">
            <label class="field-label">Name</label>
            <input type="text" class="field-input" id="camp-name" placeholder="e.g. DAYAW Launch Push or KusinaIQ">
          </div>
          <div style="display:flex;gap:14px;">
            <div class="field-group" style="flex:1;">
              <label class="field-label">Type</label>
              <select class="field-input" id="camp-type">
                <option value="event">Event</option>
                <option value="product">Product</option>
              </select>
            </div>
            <div class="field-group" style="flex:1;">
              <label class="field-label">Status</label>
              <select class="field-input" id="camp-status">
                <option value="upcoming">Upcoming</option>
                <option value="active">Active</option>
              </select>
            </div>
          </div>
          <div id="camp-dates-wrap" style="display:flex;gap:14px;">
            <div class="field-group" style="flex:1;">
              <label class="field-label">Start Date</label>
              <input type="date" class="field-input" id="camp-start">
            </div>
            <div class="field-group" style="flex:1;">
              <label class="field-label">End Date</label>
              <input type="date" class="field-input" id="camp-end">
            </div>
          </div>
          <div id="camp-error" style="color:var(--terra);font-size:0.78rem;margin-bottom:12px;display:none;"></div>
          <div style="display:flex;gap:10px;">
            <button class="small-btn primary" style="padding:10px 20px;font-size:0.6rem;" id="camp-submit">Create Campaign</button>
            <button class="small-btn ghost" style="padding:10px 20px;font-size:0.6rem;" id="camp-cancel">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function attachCampaignHandlers(reload: () => void): void {
  document.querySelectorAll<HTMLButtonElement>('[data-delete-campaign]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = Number(btn.dataset.deleteCampaign);
      const name = btn.dataset.name ?? 'this campaign';
      if (!confirm(`Delete "${name}"? Any codes linked to it will become standing codes.`)) return;
      btn.disabled = true;
      try {
        await api.deleteCampaign(id);
        reload();
      } catch (err) {
        btn.disabled = false;
        const msg = err instanceof Error ? err.message : 'Failed to delete';
        try { alert(JSON.parse(msg).error ?? msg); } catch { alert(msg); }
      }
    });
  });

  const toggleBtn = document.getElementById('toggle-campaign-form')!;
  const formWrap = document.getElementById('campaign-form-wrap')!;
  const errEl = document.getElementById('camp-error')!;

  toggleBtn.addEventListener('click', () => {
    const isHidden = formWrap.style.display === 'none';
    formWrap.style.display = isHidden ? 'block' : 'none';
    toggleBtn.textContent = isHidden ? '✕ Cancel' : '+ New Campaign';
  });

  document.getElementById('camp-cancel')?.addEventListener('click', () => {
    formWrap.style.display = 'none';
    toggleBtn.textContent = '+ New Campaign';
  });

  const typeSel = document.getElementById('camp-type') as HTMLSelectElement;
  const datesWrap = document.getElementById('camp-dates-wrap')!;
  typeSel?.addEventListener('change', () => {
    datesWrap.style.display = typeSel.value === 'product' ? 'none' : 'flex';
  });

  document.getElementById('camp-submit')?.addEventListener('click', async () => {
    errEl.style.display = 'none';
    const name = (document.getElementById('camp-name') as HTMLInputElement).value.trim();
    const type = typeSel.value as 'event' | 'product';
    const start_date = (document.getElementById('camp-start') as HTMLInputElement).value;
    const end_date = (document.getElementById('camp-end') as HTMLInputElement).value;
    const status = (document.getElementById('camp-status') as HTMLSelectElement).value as 'active' | 'upcoming' | 'ended';

    if (!name) {
      errEl.textContent = 'Name is required';
      errEl.style.display = 'block';
      return;
    }
    if (type === 'event' && (!start_date || !end_date)) {
      errEl.textContent = 'Start and end dates are required for events';
      errEl.style.display = 'block';
      return;
    }
    if (type === 'event' && end_date < start_date) {
      errEl.textContent = 'End date must be after start date';
      errEl.style.display = 'block';
      return;
    }

    try {
      await api.createCampaign({
        name, type, status,
        ...(type === 'event' ? { start_date, end_date } : {}),
      });
      reload();
    } catch (err) {
      errEl.textContent = err instanceof Error ? err.message : 'Failed to create campaign';
      errEl.style.display = 'block';
    }
  });
}
