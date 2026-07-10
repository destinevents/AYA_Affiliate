import './style.css';
import { isLoggedIn, clearToken } from './auth.js';
import { renderLogin, attachLoginHandlers } from './views/login.js';
import { renderAffiliates, attachAffiliateHandlers } from './views/affiliates.js';
import { renderCampaigns } from './views/campaigns.js';
import { renderGenerate, attachGenerateHandlers } from './views/generate.js';
import { renderConversions, attachConversionHandlers } from './views/conversions.js';

type TabKey = 'affiliates' | 'campaigns' | 'generate' | 'conversions';

interface Tab {
  key: TabKey;
  label: string;
  hero: { eyebrow: string; title: string; sub: string };
  schemaTable?: string;
  schemaCopy?: string;
}

const TABS: Tab[] = [
  {
    key: 'affiliates', label: 'Affiliates',
    hero: { eyebrow: 'Affiliate Program', title: 'Affiliate <em>Partners</em>', sub: 'Members who earn commission for referring new registrations or memberships using their own code.' },
    schemaTable: 'affiliates', schemaCopy: 'One row per enrolled member — tracks code, commission rate, and status. Links to attendees.id.',
  },
  {
    key: 'campaigns', label: 'Campaigns',
    hero: { eyebrow: 'Affiliate Program', title: 'Active <em>Campaigns</em>', sub: 'Named pushes affiliates can attach their codes to — track which campaign drives the most conversions.' },
    schemaTable: 'affiliate_campaigns', schemaCopy: 'Has a name, start/end date, and status. Promo codes link via promo_codes.campaign_id.',
  },
  {
    key: 'generate', label: 'Generate Code',
    hero: { eyebrow: 'Affiliate Program', title: 'Generate a <em>Referral Code</em>', sub: 'Create a new affiliate and their personal code — extends the existing promo_codes table with affiliate attribution.' },
  },
  {
    key: 'conversions', label: 'Commissions',
    hero: { eyebrow: 'Affiliate Program', title: 'Referral <em>Conversions</em>', sub: 'Every registration or membership made using an affiliate code creates a conversion row here.' },
    schemaTable: 'referral_conversions', schemaCopy: 'Links affiliate → promo_code → registration, with sale amount, commission, and payout status.',
  },
];

let activeTab: TabKey = 'affiliates';

function navHTML(): string {
  const tabs = TABS.map(t => `
    <button class="nav-tab${t.key === activeTab ? ' active' : ''}" data-tab="${t.key}">${t.label}</button>
  `).join('');
  return `
    <nav class="nav">
      <div class="nav-brand"><em>asyouare</em>Baguio</div>
      <div class="nav-tabs">${tabs}</div>
      <button class="nav-logout" id="logout-btn">Sign out</button>
    </nav>
  `;
}

async function renderTab(tab: TabKey): Promise<string> {
  const t = TABS.find(x => x.key === tab)!;
  const schemaBlock = t.schemaTable ? `
    <div class="schema-note">
      <span class="tbl">${t.schemaTable}</span>
      <span>${t.schemaCopy}</span>
    </div>` : '';

  let body = '<div class="loading">Loading…</div>';
  try {
    if (tab === 'affiliates') body = await renderAffiliates();
    if (tab === 'campaigns') body = await renderCampaigns();
    if (tab === 'generate') body = await renderGenerate();
    if (tab === 'conversions') body = await renderConversions();
  } catch (e) {
    body = `<div class="error-msg">Failed to load data. ${e instanceof Error ? e.message : ''}</div>`;
  }

  return `
    <div class="view-hero">
      <div class="view-hero-inner">
        <div class="eyebrow">${t.hero.eyebrow}</div>
        <h1 class="view-title">${t.hero.title}</h1>
        <p class="view-sub">${t.hero.sub}</p>
      </div>
    </div>
    <div class="view-body">
      ${schemaBlock}
      ${body}
    </div>
  `;
}

async function renderDashboard(): Promise<void> {
  const app = document.getElementById('app')!;
  app.innerHTML = navHTML() + `<main id="view-content"><div class="loading">Loading…</div></main>`;
  attachNavHandlers();
  const content = document.getElementById('view-content')!;
  content.innerHTML = await renderTab(activeTab);
  attachTabHandlers();
}

function attachNavHandlers(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach(btn => {
    btn.addEventListener('click', async () => {
      activeTab = btn.dataset.tab as TabKey;
      document.querySelectorAll('[data-tab]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const content = document.getElementById('view-content')!;
      content.innerHTML = '<div class="loading">Loading…</div>';
      content.innerHTML = await renderTab(activeTab);
      attachTabHandlers();
    });
  });

  document.getElementById('logout-btn')?.addEventListener('click', () => {
    clearToken();
    location.reload();
  });
}

function attachTabHandlers(): void {
  const reload = () => renderDashboard();
  if (activeTab === 'affiliates') attachAffiliateHandlers(reload);
  if (activeTab === 'generate') attachGenerateHandlers(reload);
  if (activeTab === 'conversions') attachConversionHandlers(reload);
}

function boot(): void {
  if (!isLoggedIn()) {
    const app = document.getElementById('app')!;
    app.innerHTML = renderLogin();
    attachLoginHandlers(() => renderDashboard());
  } else {
    renderDashboard();
  }
}

boot();
