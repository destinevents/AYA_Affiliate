import { api } from '../api.js';
import { fmtPHP } from '../utils.js';
import type { Conversion } from '../types.js';

export async function renderConversions(): Promise<string> {
  const conversions = await api.getConversions();

  const totalRevenue = conversions
    .filter(c => c.status !== 'void')
    .reduce((s, c) => s + parseFloat(c.sale_amount), 0);
  const commissionPaid = conversions
    .filter(c => c.status === 'paid')
    .reduce((s, c) => s + parseFloat(c.commission_amount), 0);
  const commissionPending = conversions
    .filter(c => c.status === 'pending')
    .reduce((s, c) => s + parseFloat(c.commission_amount), 0);
  const pendingCount = conversions.filter(c => c.status === 'pending').length;

  const rows = conversions.map((c: Conversion) => `
    <tr>
      <td style="color:var(--muted);font-size:0.74rem;">${c.created_at.slice(0, 10)}</td>
      <td>${c.member_name}</td>
      <td><span class="code-tag">${c.promo_code}</span></td>
      <td style="font-size:0.74rem;">${c.buyer_action}</td>
      <td>${fmtPHP(parseFloat(c.sale_amount))}</td>
      <td><strong style="color:var(--terra);">${fmtPHP(parseFloat(c.commission_amount))}</strong>
        <span style="color:var(--muted);font-size:0.66rem;">(${parseFloat(c.commission_rate)}%)</span></td>
      <td><span class="pill ${c.status}">${c.status}</span></td>
      <td>${c.status === 'pending'
        ? `<button class="small-btn primary" data-pay="${c.id}">Mark Paid</button>`
        : ''}</td>
    </tr>
  `).join('');

  return `
    <h3 style="font-family:'Fraunces',serif;font-size:1.1rem;color:var(--pine);margin-bottom:14px;font-weight:400;">How a Conversion Is Created</h3>
    <div class="flow-row">
      <div class="flow-step"><div class="flow-step-label">1. Trigger</div><div class="flow-step-title">Buyer uses code</div><div class="flow-step-desc">A registration or membership payment uses an affiliate's promo code at checkout.</div></div>
      <div class="flow-step"><div class="flow-step-label">2. Auto-detect</div><div class="flow-step-title">DB trigger fires</div><div class="flow-step-desc">Checks if the code has an affiliate_id — same pattern as promo_codes.used_count.</div></div>
      <div class="flow-step"><div class="flow-step-label">3. Record</div><div class="flow-step-title">Conversion row created</div><div class="flow-step-desc">sale_amount × commission_rate = commission_amount, status = pending.</div></div>
      <div class="flow-step"><div class="flow-step-label">4. Payout</div><div class="flow-step-title">Admin marks Paid</div><div class="flow-step-desc">Admin reviews and pays out — lifetime_earned updates on the affiliate.</div></div>
    </div>
    <div class="metric-strip">
      <div class="metric-card"><div class="metric-label">Total Revenue (via codes)</div><div class="metric-value">${fmtPHP(totalRevenue)}</div></div>
      <div class="metric-card"><div class="metric-label">Commission Paid</div><div class="metric-value">${fmtPHP(commissionPaid)}</div></div>
      <div class="metric-card"><div class="metric-label">Commission Pending</div><div class="metric-value">${fmtPHP(commissionPending)}</div><div class="metric-sub">${pendingCount} awaiting payout</div></div>
    </div>
    <table class="data-table">
      <thead><tr>
        <th>Date</th><th>Affiliate</th><th>Code Used</th><th>Buyer Action</th>
        <th>Sale Amount</th><th>Commission</th><th>Status</th><th></th>
      </tr></thead>
      <tbody>${rows || '<tr><td colspan="8" style="text-align:center;color:var(--muted);padding:32px;">No conversions yet</td></tr>'}</tbody>
    </table>
  `;
}

export function attachConversionHandlers(reload: () => void): void {
  document.querySelectorAll<HTMLButtonElement>('[data-pay]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = Number(btn.dataset.pay);
      btn.disabled = true;
      await api.markPaid(id);
      reload();
    });
  });
}
