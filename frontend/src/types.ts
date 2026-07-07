export interface Affiliate {
  id: number;
  member_name: string;
  business: string | null;
  code: string;
  commission_rate: string;
  status: 'active' | 'paused' | 'removed';
  joined_at: string;
  lifetime_earned: string;
}

export interface Campaign {
  id: number;
  name: string;
  status: 'active' | 'upcoming' | 'ended';
  start_date: string;
  end_date: string;
  codes_linked: number;
  conversions: number;
  revenue: string;
}

export interface Conversion {
  id: number;
  affiliate_id: number;
  member_name: string;
  commission_rate: string;
  promo_code: string;
  buyer_action: string;
  sale_amount: string;
  commission_amount: string;
  status: 'pending' | 'paid' | 'void';
  created_at: string;
}
