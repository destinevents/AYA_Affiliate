import { isLoggedIn } from './auth.js';
import { renderLogin, attachLoginHandlers } from './views/login.js';
import { renderAffiliates, attachAffiliateHandlers } from './views/affiliates.js';
import { renderCampaigns } from './views/campaigns.js';
import { renderGenerate, attachGenerateHandlers } from './views/generate.js';
import { renderConversions, attachConversionHandlers } from './views/conversions.js';

export function fmtPHP(n: number): string {
  return '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const CSS = `
:root {
  --pine:#2B3228; --pine-deep:#1D2219; --pine-mid:#3A4436; --pine-light:#4E5C49;
  --fog:#F0EDE6; --fog-2:#E8E4DC; --fog-warm:#FAF8F4;
  --gold:#C9A84C; --gold-lt:#DEC270; --moss:#7A9B6A; --terra:#8B4A35;
  --ink:#1A1E18; --muted:#6B7864; --border-fog:rgba(43,50,40,0.12);
}
* { margin:0; padding:0; box-sizing:border-box; }
html { scroll-behavior:smooth; }
body { font-family:'DM Sans',sans-serif; font-weight:300; background:var(--fog-warm); color:var(--ink); -webkit-font-smoothing:antialiased; }
button { font-family:inherit; cursor:pointer; border:none; background:none; }
input, select { font-family:inherit; }

.nav {
  position:sticky; top:0; z-index:200; height:56px; background:rgba(29,34,25,0.97);
  backdrop-filter:blur(16px); border-bottom:1px solid rgba(240,237,230,0.08);
  display:flex; align-items:center; padding:0 2rem; gap:2rem; flex-wrap:wrap;
}
.nav-brand { font-family:'Fraunces',serif; font-size:1.1rem; color:var(--fog); }
.nav-brand em { font-style:italic; color:var(--gold-lt); }
.nav-tabs { margin-left:auto; display:flex; gap:0.4rem; flex-wrap:wrap; }
.nav-tab {
  font-family:'DM Mono',monospace; font-size:0.58rem; letter-spacing:0.08em; text-transform:uppercase;
  color:rgba(240,237,230,0.5); padding:8px 14px; border-radius:3px; transition:all 0.2s; white-space:nowrap;
}
.nav-tab:hover { color:var(--fog); }
.nav-tab.active { background:var(--gold); color:var(--pine-deep); font-weight:500; }
.nav-logout { font-family:'DM Mono',monospace; font-size:0.55rem; letter-spacing:0.08em; text-transform:uppercase; color:rgba(240,237,230,0.35); padding:8px 12px; cursor:pointer; }
.nav-logout:hover { color:rgba(240,237,230,0.7); }

.view-hero { background:var(--pine-deep); padding:44px 2rem 36px; position:relative; overflow:hidden; }
.view-hero::before { content:'AYA'; position:absolute; right:-30px; top:-20px; font-family:'Fraunces',serif; font-size:13rem; font-style:italic; color:rgba(255,255,255,0.025); line-height:1; pointer-events:none; }
.view-hero-inner { max-width:1100px; margin:0 auto; position:relative; z-index:2; }
.eyebrow { font-family:'DM Mono',monospace; font-size:0.58rem; letter-spacing:0.22em; text-transform:uppercase; color:var(--gold-lt); display:flex; align-items:center; gap:10px; margin-bottom:14px; }
.eyebrow::before { content:''; width:26px; height:1px; background:var(--gold); }
.view-title { font-family:'Fraunces',serif; font-weight:300; font-size:clamp(1.8rem,3.6vw,2.7rem); color:var(--fog); line-height:1.15; margin-bottom:8px; }
.view-title em { font-style:italic; color:var(--gold-lt); }
.view-sub { font-size:0.88rem; color:rgba(240,237,230,0.6); max-width:600px; line-height:1.6; }
.view-body { max-width:1100px; margin:0 auto; padding:36px 2rem 80px; }

.schema-note { display:flex; align-items:flex-start; gap:10px; background:#fff; border:1px dashed var(--border-fog); border-radius:8px; padding:12px 16px; margin-bottom:24px; font-size:0.76rem; color:var(--muted); }
.schema-note .tbl { font-family:'DM Mono',monospace; font-size:0.68rem; color:var(--terra); background:rgba(139,74,53,0.07); padding:2px 8px; border-radius:4px; flex-shrink:0; }

.metric-strip { display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:12px; margin-bottom:28px; }
.metric-card { background:#fff; border:1px solid var(--border-fog); border-radius:8px; padding:16px 18px; }
.metric-label { font-family:'DM Mono',monospace; font-size:0.52rem; letter-spacing:0.1em; text-transform:uppercase; color:var(--muted); margin-bottom:6px; }
.metric-value { font-family:'Fraunces',serif; font-size:1.7rem; color:var(--pine); line-height:1; }
.metric-sub { font-size:0.66rem; color:var(--muted); margin-top:4px; }

.data-table { width:100%; border-collapse:collapse; background:#fff; border-radius:8px; overflow:hidden; border:1px solid var(--border-fog); }
.data-table th { text-align:left; font-family:'DM Mono',monospace; font-size:0.56rem; letter-spacing:0.08em; text-transform:uppercase; color:var(--muted); background:var(--fog-2); padding:10px 14px; border-bottom:1px solid var(--border-fog); }
.data-table td { padding:12px 14px; font-size:0.8rem; border-bottom:1px solid var(--border-fog); vertical-align:middle; }
.data-table tr:last-child td { border-bottom:none; }
.data-table tr:hover td { background:rgba(201,168,76,0.04); }

.pill { display:inline-flex; align-items:center; gap:4px; font-size:0.66rem; padding:3px 10px; border-radius:20px; font-family:'DM Mono',monospace; letter-spacing:0.04em; }
.pill.active { background:rgba(122,155,106,0.15); color:#3F6B33; }
.pill.paused { background:rgba(201,168,76,0.15); color:#9A6E10; }
.pill.removed, .pill.void { background:rgba(192,57,43,0.1); color:var(--terra); }
.pill.pending { background:rgba(201,168,76,0.15); color:#9A6E10; }
.pill.paid { background:rgba(122,155,106,0.15); color:#3F6B33; }
.pill.upcoming { background:rgba(43,50,40,0.1); color:var(--pine-mid); }
.pill.ended { background:rgba(192,57,43,0.1); color:var(--terra); }

.code-tag { font-family:'DM Mono',monospace; font-size:0.78rem; background:var(--fog-2); padding:3px 10px; border-radius:4px; color:var(--pine); letter-spacing:0.04em; }

.small-btn { font-family:'DM Mono',monospace; font-size:0.55rem; letter-spacing:0.06em; text-transform:uppercase; padding:5px 11px; border-radius:4px; transition:all 0.15s; white-space:nowrap; }
.small-btn.primary { background:var(--pine); color:var(--fog); }
.small-btn.primary:hover { background:var(--pine-mid); }
.small-btn.ghost { border:1px solid var(--border-fog); color:var(--muted); }
.small-btn.ghost:hover { border-color:var(--terra); color:var(--terra); }
.small-btn.gold { background:var(--gold); color:var(--pine-deep); }
.small-btn.gold:hover { background:var(--gold-lt); }
.small-btn:disabled { opacity:0.4; pointer-events:none; }

.form-card { background:#fff; border:1px solid var(--border-fog); border-radius:10px; padding:28px; max-width:520px; }
.field-group { margin-bottom:18px; }
.field-label { font-family:'DM Mono',monospace; font-size:0.6rem; letter-spacing:0.1em; text-transform:uppercase; color:var(--muted); margin-bottom:7px; display:block; }
.field-hint { font-size:0.72rem; color:var(--muted); margin-top:5px; }
.field-input { width:100%; padding:11px 14px; border:1px solid var(--border-fog); border-radius:6px; background:#fff; font-size:0.85rem; outline:none; transition:border-color 0.2s; }
.field-input:focus { border-color:var(--pine-mid); }

.generated-result { margin-top:20px; padding:20px; background:var(--fog-2); border-radius:8px; border-left:3px solid var(--gold); display:none; }
.generated-result.show { display:block; }
.generated-code-display { font-family:'Fraunces',serif; font-size:1.6rem; color:var(--pine); letter-spacing:0.02em; margin-bottom:8px; }
.generated-meta { font-size:0.74rem; color:var(--muted); line-height:1.7; }

.flow-row { display:flex; align-items:stretch; gap:0; margin-bottom:28px; flex-wrap:wrap; }
.flow-step { flex:1; min-width:150px; background:#fff; border:1px solid var(--border-fog); padding:16px 18px; position:relative; }
.flow-step:not(:last-child)::after { content:'→'; position:absolute; right:-14px; top:50%; transform:translateY(-50%); z-index:2; color:var(--gold); font-size:1.1rem; background:var(--fog-warm); width:24px; text-align:center; }
.flow-step-label { font-family:'DM Mono',monospace; font-size:0.5rem; letter-spacing:0.1em; text-transform:uppercase; color:var(--terra); margin-bottom:5px; }
.flow-step-title { font-family:'Fraunces',serif; font-size:0.95rem; color:var(--pine); margin-bottom:4px; }
.flow-step-desc { font-size:0.68rem; color:var(--muted); line-height:1.4; }

.loading { text-align:center; padding:60px; color:var(--muted); font-size:0.82rem; }
.error-msg { background:rgba(139,74,53,0.08); border:1px solid rgba(139,74,53,0.2); border-radius:8px; padding:16px; color:var(--terra); font-size:0.82rem; margin-bottom:20px; }

@media (max-width:680px) {
  .nav { padding:0 1rem; }
  .view-hero, .view-body { padding-left:1rem; padding-right:1rem; }
  .data-table { display:block; overflow-x:auto; white-space:nowrap; }
  .flow-step:not(:last-child)::after { display:none; }
}
`;

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
    import('./auth.js').then(({ clearToken }) => { clearToken(); location.reload(); });
  });
}

function attachTabHandlers(): void {
  const reload = () => renderDashboard();
  if (activeTab === 'affiliates') attachAffiliateHandlers(reload);
  if (activeTab === 'generate') attachGenerateHandlers(reload);
  if (activeTab === 'conversions') attachConversionHandlers(reload);
}

async function boot(): Promise<void> {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  if (!isLoggedIn()) {
    const app = document.getElementById('app')!;
    app.innerHTML = renderLogin(() => renderDashboard());
    attachLoginHandlers(() => renderDashboard());
  } else {
    await renderDashboard();
  }
}

boot();
