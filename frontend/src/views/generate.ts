import { api } from '../api.js';
import { esc } from '../utils.js';

export async function renderGenerate(): Promise<string> {
  const campaigns = await api.getCampaigns();
  const campaignOptions = campaigns
    .filter(c => c.status !== 'ended')
    .map(c => `<option value="${c.id}">${esc(c.name)}</option>`)
    .join('');

  return `
    <div class="schema-note">
      <span class="tbl">promo_codes</span>
      <span>Creates both an affiliate record and a promo_code row linked to it. Code must be unique.</span>
    </div>
    <div class="form-card">
      <div class="field-group">
        <label class="field-label">Member Name</label>
        <input type="text" class="field-input" id="gen-name" placeholder="e.g. Maria Santos">
      </div>
      <div class="field-group">
        <label class="field-label">Business (optional)</label>
        <input type="text" class="field-input" id="gen-business" placeholder="e.g. Highland Threads">
      </div>
      <div style="display:flex;gap:14px;">
        <div class="field-group" style="flex:1;">
          <label class="field-label">Code</label>
          <input type="text" class="field-input" id="gen-code" placeholder="e.g. MARIA15">
          <div class="field-hint">Auto-suggested from name + campaign, editable</div>
        </div>
        <div class="field-group" style="flex:1;">
          <label class="field-label">Commission Rate (%)</label>
          <input type="number" class="field-input" id="gen-rate" value="10" min="1" max="50">
        </div>
      </div>
      <div class="field-group">
        <label class="field-label">Attach to Campaign (optional)</label>
        <select class="field-input" id="gen-campaign">
          <option value="">No campaign — standing code</option>
          ${campaignOptions}
        </select>
      </div>
      <div id="gen-error" style="color:var(--terra);font-size:0.78rem;margin-bottom:12px;display:none;"></div>
      <button class="small-btn gold" style="padding:11px 24px;font-size:0.62rem;" id="gen-submit">Generate Code</button>
      <div class="generated-result" id="gen-result">
        <div class="generated-code-display" id="gen-result-code"></div>
        <div class="generated-meta" id="gen-result-meta"></div>
      </div>
    </div>
  `;
}

export function attachGenerateHandlers(reload: () => void): void {
  const nameInput = document.getElementById('gen-name') as HTMLInputElement;
  const codeInput = document.getElementById('gen-code') as HTMLInputElement;
  const campaignSel = document.getElementById('gen-campaign') as HTMLSelectElement;
  const errEl = document.getElementById('gen-error')!;

  const suggestCode = () => {
    const firstName = nameInput.value.trim().split(' ')[0].replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (!firstName) return;
    const campaignText = campaignSel.selectedOptions[0]?.text ?? '';
    const hasCampaign = !!campaignSel.value;
    if (hasCampaign) {
      const shortName = campaignText.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 8);
      codeInput.value = (firstName + shortName).slice(0, 20);
    } else {
      codeInput.value = firstName + Math.floor(Math.random() * 20 + 5);
    }
  };

  nameInput?.addEventListener('input', suggestCode);
  campaignSel?.addEventListener('change', suggestCode);

  document.getElementById('gen-submit')?.addEventListener('click', async () => {
    errEl.style.display = 'none';
    const member_name = nameInput.value.trim();
    const business = (document.getElementById('gen-business') as HTMLInputElement).value.trim();
    const code = codeInput.value.trim();
    const commission_rate = Number((document.getElementById('gen-rate') as HTMLInputElement).value);
    const campaign_id = (document.getElementById('gen-campaign') as HTMLSelectElement).value;

    if (!member_name || !code) {
      errEl.textContent = 'Member name and code are required';
      errEl.style.display = 'block';
      return;
    }

    try {
      const result = await api.generateCode({
        member_name, business: business || undefined, code, commission_rate,
        campaign_id: campaign_id ? Number(campaign_id) : undefined,
      });

      const resultEl = document.getElementById('gen-result')!;
      resultEl.classList.add('show');
      document.getElementById('gen-result-code')!.textContent = result.affiliate.code;
      document.getElementById('gen-result-meta')!.innerHTML = `
        ${esc(result.affiliate.member_name)} · ${parseFloat(result.affiliate.commission_rate)}% commission
        ${campaign_id ? '' : ' · standing code'}<br>
        Saved — this affiliate now appears in the Affiliates tab.
      `;
    } catch (err) {
      errEl.textContent = err instanceof Error ? err.message : 'Failed to generate code';
      errEl.style.display = 'block';
    }
  });
}
