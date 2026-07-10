import { api } from '../api.js';
import { fmtPHP } from '../utils.js';

export async function renderCampaigns(): Promise<string> {
  const campaigns = await api.getCampaigns();

  const rows = campaigns.map(c => {
    const statusClass = c.status === 'active' ? 'active' : c.status === 'upcoming' ? 'paused' : 'removed';
    return `
      <tr>
        <td><strong style="color:var(--pine);">${c.name}</strong></td>
        <td><span class="pill ${statusClass}">${c.status}</span></td>
        <td style="color:var(--muted);font-size:0.74rem;">${c.start_date} → ${c.end_date}</td>
        <td>${c.codes_linked}</td>
        <td>${c.conversions}</td>
        <td>${fmtPHP(parseFloat(c.revenue))}</td>
      </tr>
    `;
  }).join('');

  return `
    <table class="data-table">
      <thead><tr>
        <th>Campaign</th><th>Status</th><th>Window</th>
        <th>Codes Linked</th><th>Conversions</th><th>Revenue Generated</th>
      </tr></thead>
      <tbody>${rows || '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:32px;">No campaigns yet</td></tr>'}</tbody>
    </table>
  `;
}
