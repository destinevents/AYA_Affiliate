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
