import { getToken, clearToken } from './auth.js';
import type { Affiliate, Campaign, Conversion } from './types.js';

const BASE = import.meta.env.VITE_API_URL ?? '';
if (!BASE) console.warn('[AYA] VITE_API_URL is not set — API calls will fail. Add it to your .env.local or Vercel environment variables.');

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
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

  getAffiliates: () => req<Affiliate[]>('/api/affiliates'),
  createAffiliate: (data: Partial<Affiliate>) =>
    req<Affiliate>('/api/affiliates', { method: 'POST', body: JSON.stringify(data) }),
  toggleAffiliateStatus: (id: number) =>
    req<Affiliate>(`/api/affiliates/${id}/status`, { method: 'PATCH' }),

  getCampaigns: () => req<Campaign[]>('/api/campaigns'),
  createCampaign: (data: Partial<Campaign>) =>
    req<Campaign>('/api/campaigns', { method: 'POST', body: JSON.stringify(data) }),

  generateCode: (data: {
    member_name: string; business?: string; code: string;
    commission_rate: number; campaign_id?: number;
  }) => req<{ affiliate: Affiliate; promo_code: unknown }>('/api/codes/generate', {
    method: 'POST', body: JSON.stringify(data),
  }),

  getConversions: () => req<Conversion[]>('/api/conversions'),
  createConversion: (data: { affiliate_id: number; promo_code: string; buyer_action: string; sale_amount: number }) =>
    req<Conversion>('/api/conversions', { method: 'POST', body: JSON.stringify(data) }),
  markPaid: (id: number) =>
    req<Conversion>(`/api/conversions/${id}/pay`, { method: 'PATCH' }),
};
