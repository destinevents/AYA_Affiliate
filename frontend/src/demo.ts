import type { Affiliate, Campaign, Conversion } from './types.js';

export const DEMO_AFFILIATES: Affiliate[] = [
  { id: 1, member_name: 'Maria Santos',          business: 'Highland Threads',           code: 'MARIA15',    commission_rate: '15.00', status: 'active',  joined_at: '2026-06-10T00:00:00Z', lifetime_earned: '1850.00' },
  { id: 2, member_name: 'Monica Joy Fernandez',  business: 'As You Are Baguio',          code: 'MONICA10',   commission_rate: '10.00', status: 'active',  joined_at: '2026-06-08T00:00:00Z', lifetime_earned: '3200.00' },
  { id: 3, member_name: 'Carlo Reyes',           business: 'Pine Bloom Florals',         code: 'CARLO20',    commission_rate: '20.00', status: 'paused',  joined_at: '2026-06-12T00:00:00Z', lifetime_earned: '400.00'  },
  { id: 4, member_name: 'Frame & Fog Studios',   business: 'Frame & Fog Studios',        code: 'FRAMEFOG10', commission_rate: '10.00', status: 'active',  joined_at: '2026-06-15T00:00:00Z', lifetime_earned: '0.00'    },
];

export const DEMO_CAMPAIGNS: Campaign[] = [
  { id: 1, name: 'DAYAW Launch Push',     status: 'active',   start_date: '2026-06-01', end_date: '2026-08-22', codes_linked: 3, conversions: 14, revenue: '18500.00' },
  { id: 2, name: 'RE:BLOOM Early Bird',   status: 'active',   start_date: '2026-06-01', end_date: '2026-07-11', codes_linked: 2, conversions: 6,  revenue: '4500.00'  },
  { id: 3, name: 'Founding Member Drive', status: 'upcoming', start_date: '2026-07-01', end_date: '2026-09-30', codes_linked: 0, conversions: 0,  revenue: '0.00'     },
];

export const DEMO_CONVERSIONS: Conversion[] = [
  { id: 1, affiliate_id: 1, member_name: 'Maria Santos',         commission_rate: '15.00', promo_code: 'MARIA15',    buyer_action: "Event Registration — Builder's Circle", sale_amount: '500.00', commission_amount: '75.00',  status: 'paid',    created_at: '2026-06-18T00:00:00Z' },
  { id: 2, affiliate_id: 2, member_name: 'Monica Joy Fernandez', commission_rate: '10.00', promo_code: 'MONICA10',   buyer_action: 'Event Registration — RE:BLOOM',         sale_amount: '750.00', commission_amount: '75.00',  status: 'paid',    created_at: '2026-06-19T00:00:00Z' },
  { id: 3, affiliate_id: 1, member_name: 'Maria Santos',         commission_rate: '15.00', promo_code: 'MARIA15',    buyer_action: 'Membership — Founding',                 sale_amount: '200.00', commission_amount: '30.00',  status: 'pending', created_at: '2026-06-19T00:00:00Z' },
  { id: 4, affiliate_id: 2, member_name: 'Monica Joy Fernandez', commission_rate: '10.00', promo_code: 'MONICA10',   buyer_action: 'Event Registration — RE:BLOOM',         sale_amount: '750.00', commission_amount: '75.00',  status: 'pending', created_at: '2026-06-20T00:00:00Z' },
  { id: 5, affiliate_id: 3, member_name: 'Carlo Reyes',          commission_rate: '20.00', promo_code: 'CARLO20',    buyer_action: "Event Registration — Builder's Circle", sale_amount: '500.00', commission_amount: '100.00', status: 'void',    created_at: '2026-06-20T00:00:00Z' },
  { id: 6, affiliate_id: 1, member_name: 'Maria Santos',         commission_rate: '15.00', promo_code: 'MARIA15',    buyer_action: 'Membership — Founding',                 sale_amount: '200.00', commission_amount: '30.00',  status: 'pending', created_at: '2026-06-21T00:00:00Z' },
];
