CREATE TABLE IF NOT EXISTS affiliates (
  id SERIAL PRIMARY KEY,
  member_name TEXT NOT NULL,
  business TEXT,
  code TEXT UNIQUE NOT NULL,
  commission_rate DECIMAL(5,2) NOT NULL DEFAULT 10.00,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','removed')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  lifetime_earned DECIMAL(10,2) DEFAULT 0,
  min_payout DECIMAL(10,2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS affiliate_campaigns (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'event' CHECK (type IN ('event','product')),
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('active','upcoming','ended')),
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS promo_codes (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT DEFAULT 'percentage',
  affiliate_id INTEGER REFERENCES affiliates(id),
  campaign_id INTEGER REFERENCES affiliate_campaigns(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS referral_conversions (
  id SERIAL PRIMARY KEY,
  affiliate_id INTEGER NOT NULL REFERENCES affiliates(id),
  promo_code TEXT NOT NULL,
  buyer_action TEXT NOT NULL,
  sale_amount DECIMAL(10,2) NOT NULL,
  commission_amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','void')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
