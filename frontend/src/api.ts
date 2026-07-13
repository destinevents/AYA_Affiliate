import { clearToken } from './auth.js';
import type { Affiliate, Campaign, Conversion, PromoCode } from './types.js';
import { DEMO_AFFILIATES, DEMO_CAMPAIGNS, DEMO_CONVERSIONS, DEMO_CODES } from './demo.js';

const BASE = import.meta.env.VITE_API_URL ?? '';
export const IS_DEMO = !BASE;

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('aya_admin_token');
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (res.status === 401) { clearToken(); location.reload(); }
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

export const api = {
  login: (username: string, password: string) =>
    req<{ token: string }>('/api/auth/login', {
      method: 'POST', body: JSON.stringify({ username, password }),
    }),

  getAffiliates: (): Promise<Affiliate[]> =>
    IS_DEMO ? Promise.resolve(DEMO_AFFILIATES) : req('/api/affiliates'),

  createAffiliate: (data: Partial<Affiliate>) =>
    req<Affiliate>('/api/affiliates', { method: 'POST', body: JSON.stringify(data) }),

  deleteAffiliate: (id: number): Promise<{ deleted: boolean }> => {
    if (IS_DEMO) {
      const i = DEMO_AFFILIATES.findIndex(x => x.id === id);
      if (i !== -1) DEMO_AFFILIATES.splice(i, 1);
      return Promise.resolve({ deleted: true });
    }
    return req(`/api/affiliates/${id}`, { method: 'DELETE' });
  },

  toggleAffiliateStatus: (id: number): Promise<Affiliate> => {
    if (IS_DEMO) {
      const a = DEMO_AFFILIATES.find(x => x.id === id)!;
      a.status = a.status === 'active' ? 'paused' : 'active';
      return Promise.resolve(a);
    }
    return req(`/api/affiliates/${id}/status`, { method: 'PATCH' });
  },

  getCampaigns: (): Promise<Campaign[]> =>
    IS_DEMO ? Promise.resolve(DEMO_CAMPAIGNS) : req('/api/campaigns'),

  createCampaign: (data: Partial<Campaign>) =>
    req<Campaign>('/api/campaigns', { method: 'POST', body: JSON.stringify(data) }),

  deleteCampaign: (id: number): Promise<{ deleted: boolean }> => {
    if (IS_DEMO) {
      const i = DEMO_CAMPAIGNS.findIndex(x => x.id === id);
      if (i !== -1) DEMO_CAMPAIGNS.splice(i, 1);
      return Promise.resolve({ deleted: true });
    }
    return req(`/api/campaigns/${id}`, { method: 'DELETE' });
  },

  generateCode: (data: {
    member_name: string; business?: string; code: string;
    commission_rate: number; campaign_id?: number;
  }) => req<{ affiliate: Affiliate; promo_code: unknown }>('/api/codes/generate', {
    method: 'POST', body: JSON.stringify(data),
  }),

  updateAffiliate: (id: number, data: { member_name?: string; business?: string | null; commission_rate?: number; min_payout?: number }): Promise<Affiliate> => {
    if (IS_DEMO) {
      const i = DEMO_AFFILIATES.findIndex(a => a.id === id);
      if (i !== -1) Object.assign(DEMO_AFFILIATES[i], data);
      return Promise.resolve(DEMO_AFFILIATES[i]);
    }
    return req<Affiliate>(`/api/affiliates/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  },

  updateCampaign: (id: number, data: Partial<Campaign>): Promise<Campaign> => {
    if (IS_DEMO) {
      const i = DEMO_CAMPAIGNS.findIndex(c => c.id === id);
      if (i !== -1) Object.assign(DEMO_CAMPAIGNS[i], data);
      return Promise.resolve(DEMO_CAMPAIGNS[i]);
    }
    return req<Campaign>(`/api/campaigns/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  },

  payAllPending: (affiliate_id: number): Promise<{ paid: number; total_commission: string }> => {
    if (IS_DEMO) {
      const pending = DEMO_CONVERSIONS.filter(c => c.affiliate_id === affiliate_id && c.status === 'pending');
      const total = pending.reduce((s, c) => s + parseFloat(c.commission_amount), 0);
      pending.forEach(c => { c.status = 'paid'; });
      const aff = DEMO_AFFILIATES.find(a => a.id === affiliate_id);
      if (aff) aff.lifetime_earned = (parseFloat(aff.lifetime_earned) + total).toFixed(2);
      return Promise.resolve({ paid: pending.length, total_commission: total.toFixed(2) });
    }
    return req('/api/conversions/pay-all', { method: 'POST', body: JSON.stringify({ affiliate_id }) });
  },

  exportCSV: (): Promise<void> => {
    const download = (csv: string) => {
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'aya-commissions.csv'; a.click();
      URL.revokeObjectURL(url);
    };
    if (IS_DEMO) {
      const header = 'ID,Affiliate,Code,Buyer Action,Sale Amount,Commission,Status,Date\n';
      const rows = DEMO_CONVERSIONS.map(c => {
        const name = DEMO_AFFILIATES.find(a => a.id === c.affiliate_id)?.member_name ?? '';
        return `${c.id},"${name}",${c.promo_code},"${c.buyer_action}",${c.sale_amount},${c.commission_amount},${c.status},${c.created_at.slice(0, 10)}`;
      }).join('\n');
      download(header + rows);
      return Promise.resolve();
    }
    const token = localStorage.getItem('aya_admin_token');
    return fetch(`${BASE}/api/conversions/export`, {
      headers: { Authorization: `Bearer ${token ?? ''}` },
    }).then(r => r.blob()).then(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'aya-commissions.csv'; a.click();
      URL.revokeObjectURL(url);
    });
  },

  getCodes: (): Promise<PromoCode[]> =>
    IS_DEMO ? Promise.resolve(DEMO_CODES) : req('/api/codes'),

  getConversions: (): Promise<Conversion[]> =>
    IS_DEMO ? Promise.resolve(DEMO_CONVERSIONS) : req('/api/conversions'),

  createConversion: (data: { affiliate_id: number; promo_code: string; buyer_action: string; sale_amount: number }) =>
    req<Conversion>('/api/conversions', { method: 'POST', body: JSON.stringify(data) }),

  markPaid: (id: number): Promise<Conversion> => {
    if (IS_DEMO) {
      const c = DEMO_CONVERSIONS.find(x => x.id === id)!;
      c.status = 'paid';
      return Promise.resolve(c);
    }
    return req(`/api/conversions/${id}/pay`, { method: 'PATCH' });
  },

  voidConversion: (id: number): Promise<Conversion> => {
    if (IS_DEMO) {
      const c = DEMO_CONVERSIONS.find(x => x.id === id)!;
      c.status = 'void';
      return Promise.resolve(c);
    }
    return req(`/api/conversions/${id}/void`, { method: 'PATCH' });
  },
};
