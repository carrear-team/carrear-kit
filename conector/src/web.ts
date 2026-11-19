// CarrEar · web B2C de prueba: alta → entrar con Google → pago en Stripe → licencia activa → instrucciones.
// Solo modo prueba: si la clave de Stripe no es de prueba, no se crea ningún pago.
// Guarda en el KV solo: correo, plan (extras), estado, fecha de fin e ids de Stripe. Nunca la tarjeta (la guarda Stripe).

export interface WebEnv {
  OAUTH_KV: KVNamespace;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  STRIPE_SECRET_KEY?: string;      // secreto, clave de PRUEBA (sk_test_… o rk_test_…)
  STRIPE_WEBHOOK_SECRET?: string;  // secreto, whsec_… del punto de aviso /stripe/webhook
  PUBLIC_URL?: string;
}

export const MARKETPLACE = 'carrear-team/carrear-kit';
export const PLUGIN = 'carrear-humo';

// Precios aprobados por Eric el 10-nov-2026 (céntimos, €/mes). Primer mes gratis.
export const PLANES = {
  base: { nombre: 'Membresía My CarrEar team', desc: 'Tu Coach (Helena), tu marca (Maya) y tu página CarrEar', cts: 290 },
  pro: { nombre: 'Día a día Pro', desc: 'Claire (tu jefa de gabinete) y Leo (tu agenda) cada día', cts: 290 },
  nina: { nombre: 'Nina · tu Hunter', desc: 'Vacantes con match, bolsas de empleo y headhunters', cts: 500 },
  marco: { nombre: 'Marco · tu Dealmaker', desc: 'Decisores, entrevistas y cierre de oferta', cts: 500 },
  ambos: { nombre: 'Nina + Marco', desc: 'Tu Hunter y tu Dealmaker juntos', cts: 800 },
} as const;
const DIAS_GRATIS = 30;

const esc = (v: any) => String(v ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const eur = (cts: number) => (cts / 100).toFixed(2).replace('.', ',') + ' €';

export function extrasValidos(raw: string): string[] {
  const s = new Set(String(raw || '').toLowerCase().split(/[\s,+|]+/).filter((x) => ['pro', 'nina', 'marco'].includes(x)));
  return ['pro', 'nina', 'marco'].filter((x) => s.has(x));
}
function lineas(extras: string[]) {
  const l: { k: keyof typeof PLANES }[] = [{ k: 'base' }];
  if (extras.includes('pro')) l.push({ k: 'pro' });
  if (extras.includes('nina') && extras.includes('marco')) l.push({ k: 'ambos' });
  else if (extras.includes('nina')) l.push({ k: 'nina' });
  else if (extras.includes('marco')) l.push({ k: 'marco' });
  return l.map((x) => ({ k: x.k, ...PLANES[x.k] }));
}

// ---------- Licencias en el KV («lic:<correo>») ----------
export type Lic = { estado: 'activa' | 'inactiva'; addons: string[]; hasta: string; subId?: string; customerId?: string; stripeStatus?: string; updatedAt: string };
export async function leerLic(env: WebEnv, email: string): Promise<Lic | null> {
  return (await env.OAUTH_KV.get('lic:' + email.toLowerCase(), 'json')) as Lic | null;
}
async function guardarLic(env: WebEnv, email: string, l: Partial<Lic>) {
  const prev = (await leerLic(env, email)) || ({} as any);
  const nue = { ...prev, ...l, updatedAt: new Date().toISOString() };
  await env.OAUTH_KV.put('lic:' + email.toLowerCase(), JSON.stringify(nue));
  if (nue.subId) await env.OAUTH_KV.put('sub:' + nue.subId, email.toLowerCase());
  return nue as Lic;
}
const ACTIVOS = ['trialing', 'active', 'past_due'];
function fecha(ts?: number | null) { return ts ? new Date(ts * 1000).toISOString().slice(0, 10) : ''; }

async function desdeSuscripcion(env: WebEnv, sub: any, emailHint?: string) {
  const email = String(sub?.metadata?.email || emailHint || (await env.OAUTH_KV.get('sub:' + sub.id)) || '').toLowerCase();
  if (!email) return null;
  const fin = sub.current_period_end || sub.items?.data?.[0]?.current_period_end || sub.trial_end;
  return guardarLic(env, email, {
    estado: ACTIVOS.includes(sub.status) ? 'activa' : 'inactiva',
    addons: extrasValidos(sub.metadata?.addons || ''),
    hasta: fecha(fin), subId: sub.id, customerId: typeof sub.customer === 'string' ? sub.customer : sub.customer?.id, stripeStatus: sub.status,
  });
}

// ---------- Stripe ----------
function esPrueba(env: WebEnv) { return /^(sk|rk)_test_/.test(String(env.STRIPE_SECRET_KEY || '')); }
function form(obj: Record<string, string | number>) { const p = new URLSearchParams(); for (const [k, v] of Object.entries(obj)) p.append(k, String(v)); return p; }
async function stripe(env: WebEnv, method: 'GET' | 'POST', path: string, body?: URLSearchParams) {
  if (!esPrueba(env)) throw new Error('Stripe no está en modo prueba: no se crea ningún pago.');
  const r = await fetch('https://api.stripe.com/v1/' + path, {
    method, body, headers: { Authorization: 'Bearer ' + env.STRIPE_SECRET_KEY, ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}) },
  });
  const j: any = await r.json();
  if (!r.ok) throw new Error(j?.error?.message || 'Stripe respondió ' + r.status);
  return j;
}
async function hmacHex(secret: string, msg: string) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const s = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(msg));
  return [...new Uint8Array(s)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
function igual(a: string, b: string) { if (a.length !== b.length) return false; let x = 0; for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i); return x === 0; }

// ---------- Páginas ----------
const CSS = `:root{--ink:#18234f;--mut:#5c6584;--line:#e3e6ef;--bg:#f6f5f1;--card:#fff;--acc:#e8a04a;--acc2:#c97e2a;--ok:#2f8f6a}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.55 "Inter",system-ui,-apple-system,sans-serif}
.w{max-width:720px;margin:0 auto;padding:28px 16px 64px}.top{display:flex;align-items:center;justify-content:space-between;margin-bottom:28px}
.logo{font-weight:800;font-size:19px;letter-spacing:-.2px;white-space:nowrap;margin-right:10px}.logo b{color:var(--acc2)}.test{font-size:12px;background:#fff3e0;color:#8a5413;border:1px solid #f3d3a6;padding:4px 10px;border-radius:99px}
h1{font-size:clamp(30px,6vw,44px);line-height:1.08;letter-spacing:-.8px;margin:0 0 12px}h2{font-size:20px;margin:0 0 6px}p{margin:0 0 12px}.mut{color:var(--mut)}
.card{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:22px;margin:18px 0;box-shadow:0 6px 24px -18px rgba(24,35,79,.35)}
.opts{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-top:12px}
.opt{position:relative}.opt input{position:absolute;opacity:0}.opt span{display:block;border:1.5px solid var(--line);border-radius:12px;padding:12px 14px;cursor:pointer;font-weight:600;font-size:15px;background:#fff}
.opt input:checked+span{border-color:var(--ink);background:#eef1f8}.opt input:focus-visible+span{outline:2px solid var(--acc)}
.plan{display:flex;gap:14px;align-items:flex-start;border:1.5px solid var(--line);border-radius:14px;padding:14px;margin-top:10px;cursor:pointer;background:#fff}
.plan input{margin-top:4px;width:20px;height:20px;accent-color:var(--ink)}.plan .t{flex:1;min-width:0}.plan .t b{display:block}.plan .t small{color:var(--mut)}.plan .p{font-weight:700;white-space:nowrap}
.plan.fijo{background:#f3f5fa;cursor:default}.tot{display:flex;justify-content:space-between;align-items:baseline;margin-top:16px;padding-top:14px;border-top:1px dashed var(--line);font-size:18px}
.tot b{font-size:26px}.note{font-size:14px;color:var(--mut)}.aviso{background:#fff8ec;border:1px solid #f3d9b0;border-radius:12px;padding:12px 14px;font-size:14px;margin-top:12px}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;width:100%;border:0;border-radius:14px;padding:16px 20px;font-family:inherit;font-weight:700;font-size:17px;background:var(--ink);color:#fff;cursor:pointer;text-decoration:none;margin-top:16px}
.btn[disabled]{opacity:.45;cursor:not-allowed}.btn.sec{background:#fff;color:var(--ink);border:1.5px solid var(--line)}
.chk{display:flex;gap:10px;align-items:flex-start;margin-top:14px;font-size:14px}.chk input{width:18px;height:18px;margin-top:2px}
ol.pasos{counter-reset:p;list-style:none;padding:0;margin:0}ol.pasos>li{counter-increment:p;position:relative;padding:0 0 18px 48px}
ol.pasos>li:before{content:counter(p);position:absolute;left:0;top:-2px;width:34px;height:34px;border-radius:50%;background:var(--ink);color:#fff;display:grid;place-items:center;font-weight:700}
code.cp{display:inline-block;background:#eef1f8;border-radius:8px;padding:6px 10px;font:600 15px ui-monospace,monospace;word-break:break-all}
.copy{border:1px solid var(--line);background:#fff;border-radius:8px;padding:6px 10px;font-family:inherit;font-weight:600;font-size:13px;cursor:pointer;margin-left:6px}
.ok{color:var(--ok);font-weight:700}footer{margin-top:40px;font-size:13px;color:var(--mut)}`;

function html(title: string, body: string, status = 200, headers?: HeadersInit) {
  const h = new Headers(headers);
  h.set('Content-Type', 'text/html; charset=utf-8');
  h.set('Cache-Control', 'no-store');
  return new Response(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="robots" content="noindex"><style>${CSS}</style></head><body><div class="w">
<div class="top"><div class="logo">My <b>CarrEar</b> team</div><div class="test">Versión de prueba · no se cobra nada</div></div>
${body}<footer>My CarrEar team by CarrEar Works · versión de prueba privada.</footer></div></body></html>`, { status, headers: h });
}

function empezarPage(err = '') {
  const filas = (['pro', 'nina', 'marco'] as const).map((k) => `<label class="plan"><input type="checkbox" name="x" value="${k}" data-cts="${PLANES[k].cts}"><span class="t"><b>${esc(PLANES[k].nombre)}</b><small>${esc(PLANES[k].desc)}</small></span><span class="p">+${eur(PLANES[k].cts)}</span></label>`).join('');
  return `<h1>Your career now has a team!</h1>
<p class="mut">Tus agentes trabajan tu carrera y tu día dentro de tu propio Claude. Tú ocúpate de brillar.</p>
${err ? `<div class="aviso">${esc(err)}</div>` : ''}
<form method="get" action="/web/entrar" id="f">
<div class="card"><h2>1 · ¿Qué quieres lograr primero?</h2>
<div class="opts">${[['trabajo', 'Encontrar trabajo'], ['crecer', 'Crecer en mi puesto'], ['dia', 'Ordenar mi día'], ['marca', 'Mi marca personal']].map(([v, t], i) => `<label class="opt"><input type="radio" name="meta" value="${v}"${i === 0 ? ' checked' : ''}><span>${t}</span></label>`).join('')}</div></div>
<div class="card"><h2>2 · ¿Qué plan de Claude tienes?</h2>
<p class="note">My CarrEar team funciona dentro de tu Claude, con tu cuenta. Claude se paga aparte, a Anthropic.</p>
<div class="opts">${[['no', 'No tengo'], ['free', 'Gratis'], ['pro', 'Pro'], ['max', 'Max']].map(([v, t]) => `<label class="opt"><input type="radio" name="claude" value="${v}"${v === 'pro' ? ' checked' : ''}><span>${t}</span></label>`).join('')}</div>
<div class="aviso" id="cl"></div></div>
<div class="card"><h2>3 · Tu equipo</h2>
<label class="plan fijo"><input type="checkbox" checked disabled><span class="t"><b>${esc(PLANES.base.nombre)}</b><small>${esc(PLANES.base.desc)}</small></span><span class="p">${eur(PLANES.base.cts)}</span></label>
${filas}
<div class="tot"><span>Total al mes</span><b id="tot">${eur(PLANES.base.cts)}</b></div>
<p class="note">Primer mes gratis (${DIAS_GRATIS} días). Después se cobra cada mes; cancelas cuando quieras desde «Mi cuenta». Precios con IVA.</p>
<input type="hidden" name="extras" id="ex" value="">
<label class="chk"><input type="checkbox" id="acepto"><span>Acepto las condiciones de uso y la política de privacidad (versión de prueba).</span></label>
<button class="btn" id="go" disabled>Continuar con Google</button>
<p class="note" style="margin-top:10px">Usa la misma cuenta de Google que tu Claude: así tu equipo te reconoce al instalarlo.</p></div>
</form>
<p class="note">¿Ya eres cliente? <a href="/cuenta">Mi cuenta</a></p>
<script>(function(){var f=document.getElementById('f'),go=document.getElementById('go'),ac=document.getElementById('acepto');
function eur(c){return (c/100).toFixed(2).replace('.',',')+' €'}
function upd(){var x=[].slice.call(f.querySelectorAll('input[name=x]:checked')).map(function(i){return i.value});
var n=x.indexOf('nina')>-1,m=x.indexOf('marco')>-1,c=${PLANES.base.cts}+(x.indexOf('pro')>-1?${PLANES.pro.cts}:0)+(n&&m?${PLANES.ambos.cts}:(n?${PLANES.nina.cts}:0)+(m?${PLANES.marco.cts}:0));
document.getElementById('tot').textContent=eur(c);document.getElementById('ex').value=x.join(',');
var cl=(f.querySelector('input[name=claude]:checked')||{}).value,t='';
if(cl==='no'||cl==='free')t='Necesitas Claude Pro (unos 20 $ al mes) para instalar tu equipo. Puedes contratarlo después de este paso.';
else if(x.indexOf('pro')>-1&&cl!=='max')t='Día a día Pro trabaja cada día: te recomendamos Claude Max. Con Pro funciona, pero gastarás tu límite antes.';
else t='Perfecto: tu plan de Claude basta para este equipo.';
document.getElementById('cl').textContent=t;go.disabled=!ac.checked;}
f.addEventListener('change',upd);upd();})();</script>`;
}

function graciasPage(email: string, l: Lic | null, base: string) {
  const mcp = base + '/mcp';
  return `<h1>¡Bienvenido a tu equipo!</h1>
<p class="ok">${l && l.estado === 'activa' ? '✓ Acceso activo para ' + esc(email) + (l.hasta ? ' · primer cobro el ' + esc(l.hasta) : '') : 'Estamos confirmando tu pago… recarga en unos segundos.'}</p>
<p class="mut">Te tomará unos 10 minutos. Hazlo en tu ordenador, en claude.ai, con la cuenta de ${esc(email)}.</p>
<div class="card"><ol class="pasos">
<li><b>Añade CarrEar a tu Claude.</b><br>En claude.ai: <b>Personalizar › Plug-ins › Añadir › Gestionar marketplaces › Añadir</b> y pega:<br>
<code class="cp" id="mk">${MARKETPLACE}</code><button class="copy" data-c="mk">Copiar</button><br>Luego instala <b>«${PLUGIN}»</b>.</li>
<li><b>Conecta tu acceso.</b><br>En el plug-in, abre <b>Conectores › carrear › Conectar</b>, entra con Google (<b>${esc(email)}</b>) y pulsa <b>Permitir</b>.</li>
<li><b>Crea tu proyecto.</b><br><b>Proyectos › Nuevo proyecto</b>, llámalo <b>Digital Brain</b> y abre un chat dentro.</li>
<li><b>Escribe «Instala CarrEar».</b><br>Tu instalador hace el resto: carpetas en tu Drive, tu página CarrEar y tu primer agente.</li>
</ol></div>
<p class="note">¿Dudas? Responde al correo de bienvenida o escríbenos desde tu página CarrEar. Para cambiar de plan o cancelar: <a href="/cuenta">Mi cuenta</a>.</p>
<script>document.querySelectorAll('.copy').forEach(function(b){b.onclick=function(){var t=document.getElementById(b.dataset.c).textContent;navigator.clipboard&&navigator.clipboard.writeText(t);b.textContent='Copiado';}});</script>`;
}

// ---------- Entrar con Google (mismo cliente y misma vuelta /callback que el conector; state «web.») ----------
async function s256(v: string) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v));
  return btoa(String.fromCharCode(...new Uint8Array(d))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function googleLogin(env: WebEnv, origin: string, next: { para: 'pagar' | 'cuenta'; extras?: string; meta?: string; claude?: string }) {
  const state = 'web.' + crypto.randomUUID();
  const verifier = crypto.randomUUID() + crypto.randomUUID();
  await env.OAUTH_KV.put('webst:' + state, JSON.stringify({ verifier, ...next }), { expirationTtl: 900 });
  const g = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  g.searchParams.set('client_id', env.GOOGLE_CLIENT_ID);
  g.searchParams.set('redirect_uri', `${origin}/callback`);
  g.searchParams.set('response_type', 'code');
  g.searchParams.set('scope', 'openid email');
  g.searchParams.set('state', state);
  g.searchParams.set('code_challenge', await s256(verifier));
  g.searchParams.set('code_challenge_method', 'S256');
  g.searchParams.set('prompt', 'select_account');
  return Response.redirect(g.toString(), 302);
}
async function googleVuelta(env: WebEnv, url: URL) {
  const state = String(url.searchParams.get('state'));
  const st: any = await env.OAUTH_KV.get('webst:' + state, 'json');
  await env.OAUTH_KV.delete('webst:' + state);
  const code = url.searchParams.get('code');
  if (!st || !code) return { error: 'La página caducó. Empieza otra vez.' };
  const tok = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, redirect_uri: `${url.origin}/callback`, grant_type: 'authorization_code', code_verifier: st.verifier }),
  });
  const t: any = await tok.json();
  if (!tok.ok || !t.access_token) return { error: 'Google no confirmó la cuenta. Inténtalo otra vez.' };
  const ui: any = await (await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: `Bearer ${t.access_token}` } })).json();
  if (!ui.email || ui.email_verified === false) return { error: 'Esa cuenta de Google no tiene un correo verificado.' };
  return { email: String(ui.email).toLowerCase(), st };
}

// ---------- Router ----------
export async function webRoute(req: Request, env: WebEnv, url: URL): Promise<Response | null> {
  const p = url.pathname;
  const base = String(env.PUBLIC_URL || url.origin).replace(/\/$/, '');

  if (p === '/' || p === '/empezar') return html('My CarrEar team · Empezar', empezarPage(url.searchParams.get('e') || ''));

  if (p === '/web/entrar') {
    if (!esPrueba(env)) return html('My CarrEar team', empezarPage('El pago de prueba aún no está activado. Vuelve en un rato.'), 503);
    return googleLogin(env, url.origin, { para: 'pagar', extras: extrasValidos(url.searchParams.get('extras') || '').join(','), meta: String(url.searchParams.get('meta') || ''), claude: String(url.searchParams.get('claude') || '') });
  }
  if (p === '/cuenta') return googleLogin(env, url.origin, { para: 'cuenta' });

  if (p === '/callback' && String(url.searchParams.get('state') || '').startsWith('web.')) {
    const r: any = await googleVuelta(env, url);
    if (r.error) return Response.redirect(base + '/empezar?e=' + encodeURIComponent(r.error), 302);
    const { email, st } = r;
    if (st.para === 'cuenta') {
      const l = await leerLic(env, email);
      if (!l?.customerId) return Response.redirect(base + '/empezar?e=' + encodeURIComponent(`No encontramos una suscripción para ${email}.`), 302);
      try {
        const s = await stripe(env, 'POST', 'billing_portal/sessions', form({ customer: l.customerId, return_url: base + '/empezar', locale: 'es' }));
        return Response.redirect(s.url, 303);
      } catch (e: any) { return html('Mi cuenta', `<h1>Mi cuenta</h1><div class="aviso">No se pudo abrir tu cuenta: ${esc(e.message)}</div>`, 502); }
    }
    const prev = await leerLic(env, email);
    if (prev?.estado === 'activa' && prev.subId) {
      const g = crypto.randomUUID();
      await env.OAUTH_KV.put('gr:' + g, email, { expirationTtl: 900 });
      return Response.redirect(base + '/gracias?g=' + g, 302);
    }
    const extras = extrasValidos(st.extras || '');
    const f: Record<string, string | number> = {
      mode: 'subscription', customer_email: email, locale: 'es', client_reference_id: email,
      success_url: base + '/gracias?session_id={CHECKOUT_SESSION_ID}', cancel_url: base + '/empezar',
      'subscription_data[trial_period_days]': DIAS_GRATIS,
      'subscription_data[metadata][email]': email, 'subscription_data[metadata][addons]': extras.join(','),
      'metadata[email]': email, 'metadata[addons]': extras.join(','), 'metadata[meta]': st.meta || '', 'metadata[claude]': st.claude || '',
      payment_method_collection: 'always', billing_address_collection: 'auto',
    };
    lineas(extras).forEach((l, i) => {
      f[`line_items[${i}][quantity]`] = 1;
      f[`line_items[${i}][price_data][currency]`] = 'eur';
      f[`line_items[${i}][price_data][unit_amount]`] = l.cts;
      f[`line_items[${i}][price_data][tax_behavior]`] = 'inclusive';
      f[`line_items[${i}][price_data][recurring][interval]`] = 'month';
      f[`line_items[${i}][price_data][product_data][name]`] = l.nombre;
      f[`line_items[${i}][price_data][product_data][metadata][plan]`] = l.k;
    });
    try {
      const s = await stripe(env, 'POST', 'checkout/sessions', form(f));
      return Response.redirect(s.url, 303);
    } catch (e: any) { return Response.redirect(base + '/empezar?e=' + encodeURIComponent('No se pudo abrir el pago: ' + e.message), 302); }
  }

  if (p === '/gracias') {
    const sid = url.searchParams.get('session_id');
    let email = '';
    let l: Lic | null = null;
    if (sid) {
      try {
        const s = await stripe(env, 'GET', `checkout/sessions/${encodeURIComponent(sid)}?expand[]=subscription`);
        email = String(s.metadata?.email || s.customer_details?.email || s.customer_email || '').toLowerCase();
        if (s.status === 'complete' && s.subscription && typeof s.subscription === 'object') l = await desdeSuscripcion(env, s.subscription, email);
      } catch (e: any) { return html('Gracias', `<h1>Casi listo</h1><div class="aviso">No pudimos confirmar el pago todavía: ${esc(e.message)}. Recarga en unos segundos.</div>`, 502); }
    } else if (url.searchParams.get('g')) {
      email = String((await env.OAUTH_KV.get('gr:' + url.searchParams.get('g'))) || '');
      if (email) l = await leerLic(env, email);
    }
    if (!email) return Response.redirect(base + '/empezar', 302);
    return html('My CarrEar team · Bienvenido', graciasPage(email, l, base));
  }

  if (p === '/stripe/webhook' && req.method === 'POST') {
    const sig = req.headers.get('Stripe-Signature') || '';
    const body = await req.text();
    const secret = String(env.STRIPE_WEBHOOK_SECRET || '');
    if (!secret) return new Response('sin secreto', { status: 503 });
    const parts = Object.fromEntries(sig.split(',').map((x) => x.split('=') as [string, string]).filter((x) => x.length === 2 && x[0] === 't')) as any;
    const v1s = sig.split(',').filter((x) => x.startsWith('v1=')).map((x) => x.slice(3));
    const t = Number(parts.t);
    if (!t || Math.abs(Date.now() / 1000 - t) > 300) return new Response('firma caducada', { status: 400 });
    const esperada = await hmacHex(secret, `${t}.${body}`);
    if (!v1s.some((v) => igual(v, esperada))) return new Response('firma no válida', { status: 400 });
    const ev: any = JSON.parse(body);
    if (ev.livemode) return new Response('solo modo prueba', { status: 200 });
    const o = ev.data?.object;
    if (ev.type === 'checkout.session.completed' && o?.subscription) {
      const sub = await stripe(env, 'GET', 'subscriptions/' + encodeURIComponent(typeof o.subscription === 'string' ? o.subscription : o.subscription.id));
      await desdeSuscripcion(env, sub, o.metadata?.email || o.customer_details?.email);
    } else if (ev.type?.startsWith('customer.subscription.')) {
      await desdeSuscripcion(env, o);
    }
    return Response.json({ ok: true });
  }
  return null;
}
