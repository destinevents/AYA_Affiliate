import { api } from '../api.js';
import { fmtPHP, esc } from '../utils.js';
import type { Conversion, PromoCode } from '../types.js';

export async function renderConversions(): Promise<string> {
  const [conversions, codes] = await Promise.all([
    api.getConversions(),
    api.getCodes(),
  ]);

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
      <td>${esc(c.member_name)}</td>
      <td><span class="code-tag">${esc(c.promo_code)}</span></td>
      <td style="font-size:0.74rem;">${esc(c.buyer_action)}</td>
      <td>${fmtPHP(parseFloat(c.sale_amount))}</td>
      <td>
        <strong style="color:var(--terra);">${fmtPHP(parseFloat(c.commission_amount))}</strong>
        <span style="color:var(--muted);font-size:0.66rem;">(${parseFloat(c.commission_rate)}%)</span>
      </td>
      <td><span class="pill ${c.status}">${esc(c.status)}</span></td>
      <td style="white-space:nowrap;">
        ${c.status === 'pending'
          ? `<button class="small-btn primary" data-pay="${c.id}">Mark Paid</button>`
          : ''}
        ${c.status !== 'void'
          ? `<button class="small-btn ghost" data-void="${c.id}" style="margin-left:6px;">Void</button>`
          : ''}
      </td>
    </tr>
  `).join('');

  const codeOptions = codes
    .map((p: PromoCode) => {
      const project = p.campaign_name ? esc(p.campaign_name) : 'Standing Code';
      const rate = parseFloat(p.commission_rate);
      return `<option value="${esc(p.code)}" data-affiliate="${p.affiliate_id}">${project} — ${esc(p.code)} (${rate}%)</option>`;
    })
    .join('');

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
      <tbody>${rows || '<tr><td colspan="8" style="text-align:center;color:var(--muted);padding:32px;">No conversions yet — record one below</td></tr>'}</tbody>
    </table>

    <div style="margin-top:32px;">
      <button class="small-btn gold" style="padding:10px 20px;font-size:0.6rem;margin-bottom:20px;" id="toggle-conv-form">
        + Record Conversion
      </button>

      <div id="conv-form-wrap" style="display:none;">
        <div class="form-card" style="max-width:560px;">
          <div class="field-group">
            <label class="field-label">Project — Referral Code</label>
            <select class="field-input" id="conv-code-sel">
              <option value="">— Select project &amp; code —</option>
              ${codeOptions}
            </select>
          </div>
          <div class="field-group">
            <label class="field-label">Buyer Action</label>
            <input type="text" class="field-input" id="conv-action"
              placeholder="e.g. Event Registration — DAYAW 2026">
          </div>
          <div class="field-group">
            <label class="field-label">Sale Amount (₱)</label>
            <input type="number" class="field-input" id="conv-amount" placeholder="e.g. 750" min="1">
          </div>
          <div id="conv-error" style="color:var(--terra);font-size:0.78rem;margin-bottom:12px;display:none;"></div>
          <div style="display:flex;gap:10px;">
            <button class="small-btn primary" style="padding:10px 20px;font-size:0.6rem;" id="conv-submit">Record Conversion</button>
            <button class="small-btn ghost" style="padding:10px 20px;font-size:0.6rem;" id="conv-cancel">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function attachConversionHandlers(reload: () => void): void {
  // Mark Paid buttons
  document.querySelectorAll<HTMLButtonElement>('[data-pay]').forEach(btn => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      await api.markPaid(Number(btn.dataset.pay));
      reload();
    });
  });

  // Void buttons — for refunded/cancelled purchases
  document.querySelectorAll<HTMLButtonElement>('[data-void]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Void this conversion? If it was already paid, the commission will be deducted from the affiliate\'s lifetime earnings.')) return;
      btn.disabled = true;
      await api.voidConversion(Number(btn.dataset.void));
      reload();
    });
  });

  // Record Conversion form toggle
  const toggleBtn = document.getElementById('toggle-conv-form')!;
  const formWrap = document.getElementById('conv-form-wrap')!;
  const errEl = document.getElementById('conv-error')!;

  toggleBtn?.addEventListener('click', () => {
    const isHidden = formWrap.style.display === 'none';
    formWrap.style.display = isHidden ? 'block' : 'none';
    toggleBtn.textContent = isHidden ? '✕ Cancel' : '+ Record Conversion';
  });

  document.getElementById('conv-cancel')?.addEventListener('click', () => {
    formWrap.style.display = 'none';
    toggleBtn.textContent = '+ Record Conversion';
  });

  document.getElementById('conv-submit')?.addEventListener('click', async () => {
    errEl.style.display = 'none';
    const codeSel = document.getElementById('conv-code-sel') as HTMLSelectElement;
    const promo_code = codeSel.value.trim();
    const affiliate_id = Number(codeSel.selectedOptions[0]?.dataset.affiliate);
    const buyer_action = (document.getElementById('conv-action') as HTMLInputElement).value.trim();
    const sale_amount = Number((document.getElementById('conv-amount') as HTMLInputElement).value);

    if (!promo_code || !affiliate_id || !buyer_action || !sale_amount) {
      errEl.textContent = 'All fields are required';
      errEl.style.display = 'block';
      return;
    }

    try {
      await api.createConversion({ affiliate_id, promo_code, buyer_action, sale_amount });
      reload();
    } catch (err) {
      errEl.textContent = err instanceof Error ? err.message : 'Failed to record conversion';
      errEl.style.display = 'block';
    }
  });
}
