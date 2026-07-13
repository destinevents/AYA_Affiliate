export function fmtPHP(n: number): string {
  return '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function svgSparkline(data: { month: string; amount: number }[]): string {
  const BAR_W = 8, GAP = 3, H = 24;
  const max = Math.max(...data.map(d => d.amount), 1);
  const totalW = data.length * (BAR_W + GAP) - GAP;
  const bars = data.map((d, i) => {
    const h = Math.max(2, Math.round((d.amount / max) * H));
    const opacity = d.amount === 0 ? '0.15' : '1';
    return `<rect x="${i * (BAR_W + GAP)}" y="${H - h}" width="${BAR_W}" height="${h}" fill="#C9A84C" rx="1" opacity="${opacity}"/>`;
  }).join('');
  return `<svg width="${totalW}" height="${H}" viewBox="0 0 ${totalW} ${H}" xmlns="http://www.w3.org/2000/svg" style="display:block;" title="Last 6 months paid commissions">${bars}</svg>`;
}

export function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
