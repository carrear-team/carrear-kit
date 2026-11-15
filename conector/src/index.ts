// CarrEar · conector mínimo (prueba T2, doc «Instalación de cliente»).
// Un solo Worker: servidor de autorización (entrar con Google) + MCP en /mcp con 2 herramientas de solo lectura.
// Guarda solo: id y correo de Google (cifrados en el token, como props). Nunca contenido del usuario.
import { OAuthProvider, AuthorizationError, CimdFetchError } from '@cloudflare/workers-oauth-provider';
import type { ConsentDescription } from '@cloudflare/workers-oauth-provider';

interface Env {
  OAUTH_KV: KVNamespace;
  OAUTH_PROVIDER: any;
  GOOGLE_CLIENT_ID: string;      // variable (no secreta)
  GOOGLE_CLIENT_SECRET: string;  // secreto: se pone en Cloudflare › Settings › Variables, nunca en el código
  LICENCIAS_ACTIVAS: string;     // correos con licencia de prueba, separados por comas
  PAGO_URL: string;              // enlace de pago (piloto: página de prueba)
}
type Props = { sub: string; email: string };

const esc = (v: string) => String(v).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const VERSION = '0.1.0';

function page(title: string, body: string, status = 200, headers?: Headers) {
  const h = headers ?? new Headers();
  h.set('Content-Type', 'text/html; charset=utf-8');
  return new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><style>body{font:16px/1.5 system-ui,sans-serif;max-width:520px;margin:48px auto;padding:0 16px;color:#18234f}
h1{font-size:22px}button{font:600 15px system-ui;padding:10px 18px;border-radius:10px;border:0;background:#18234f;color:#fff;cursor:pointer}
button.sec{background:#eef1f8;color:#18234f;margin-left:8px}small{color:#737b93}</style>${body}`, { status, headers: h });
}

function consentPage(d: ConsentDescription, handle: string) {
  const name = esc(d.clientName || 'Claude');
  return `<h1>Conectar CarrEar con ${name}</h1>
<p>${name} podrá comprobar tu acceso a CarrEar con tu cuenta de Google. CarrEar solo ve tu correo; nunca tu Gmail, tu Drive ni tus chats.</p>
<p><small>Destino: ${esc(d.redirectHost)}${d.clientDomain ? ' · publicado por ' + esc(d.clientDomain) : ''}</small></p>
${d.redirectIsLoopback ? '<p><strong>Esto envía el acceso a una app de tu ordenador.</strong> Sigue solo si acabas de empezar a conectarte desde ella.</p>' : ''}
<form method="post"><input type="hidden" name="handle" value="${esc(handle)}">
${d.scope.map((s) => `<input type="hidden" name="scope" value="${esc(s)}">`).join('')}
<p><button name="decision" value="approve">Permitir</button><button class="sec" name="decision" value="deny">Cancelar</button></p></form>`;
}

async function s256(v: string) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v));
  return btoa(String.fromCharCode(...new Uint8Array(d))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const defaultHandler = {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const oauth = env.OAUTH_PROVIDER;
    try {
      if (url.pathname === '/') return page('CarrEar', `<h1>Conector CarrEar ${VERSION}</h1><p>Funciona. Añádelo desde el paquete CarrEar en Claude.</p>`);
      if (url.pathname === '/authorize' && req.method === 'GET') {
        const request = await oauth.parseAuthRequest(req);
        const details = await oauth.describeConsent(request);
        const consent = await oauth.beginConsent(request);
        return page('Conectar CarrEar', consentPage(details, consent.handle), 200, consent.headers);
      }
      if (url.pathname === '/authorize' && req.method === 'POST') {
        const form = await req.formData();
        const handle = String(form.get('handle'));
        if (form.get('decision') !== 'approve') {
          const denied = await oauth.denyConsent(req, handle);
          return new Response(null, { status: 302, headers: denied.headers });
        }
        const approved = await oauth.approveConsent(req, handle, { scope: form.getAll('scope').map(String) });
        const verifier = crypto.randomUUID() + crypto.randomUUID();
        const { state, headers } = await oauth.beginUpstream(approved.request, { data: { verifier }, headers: approved.headers });
        const g = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        g.searchParams.set('client_id', env.GOOGLE_CLIENT_ID);
        g.searchParams.set('redirect_uri', `${url.origin}/callback`);
        g.searchParams.set('response_type', 'code');
        g.searchParams.set('scope', 'openid email');
        g.searchParams.set('state', state);
        g.searchParams.set('code_challenge', await s256(verifier));
        g.searchParams.set('code_challenge_method', 'S256');
        g.searchParams.set('prompt', 'select_account');
        headers.set('Location', g.toString());
        return new Response(null, { status: 302, headers });
      }
      if (url.pathname === '/callback') {
        const { request: original, data, headers } = await oauth.finishUpstream(req);
        const code = url.searchParams.get('code');
        if (url.searchParams.get('error') || !code) {
          return page('CarrEar', '<h1>No se completó la conexión</h1><p>Vuelve a Claude e inténtalo otra vez.</p>', 400, headers);
        }
        const tok = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code, client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET,
            redirect_uri: `${url.origin}/callback`, grant_type: 'authorization_code', code_verifier: (data as any).verifier,
          }),
        });
        const t: any = await tok.json();
        if (!tok.ok || !t.access_token) return page('CarrEar', '<h1>Google no confirmó la cuenta</h1><p>Inténtalo otra vez.</p>', 502, headers);
        const ui: any = await (await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: `Bearer ${t.access_token}` } })).json();
        if (!ui.email || ui.email_verified === false) return page('CarrEar', '<h1>Esa cuenta no tiene un correo verificado</h1>', 400, headers);
        const props: Props = { sub: String(ui.sub), email: String(ui.email).toLowerCase() };
        const { redirectTo } = await oauth.completeAuthorization({ request: original, userId: props.sub, metadata: {}, scope: original.scope, props });
        headers.set('Location', redirectTo);
        return new Response(null, { status: 302, headers });
      }
      return new Response('No encontrado', { status: 404 });
    } catch (e: any) {
      if (e instanceof AuthorizationError && (e as any).redirectTo) return Response.redirect((e as any).redirectTo, 302);
      if (e instanceof AuthorizationError || e instanceof CimdFetchError) {
        return page('CarrEar', `<h1>No se pudo conectar</h1><p>${esc((e as any).description || 'La página caducó o se abrió en otro navegador.')} Vuelve a Claude e inténtalo otra vez.</p>`, 400);
      }
      throw e;
    }
  },
};

// ---------- MCP mínimo (JSON-RPC sobre HTTP, respuestas JSON) ----------
const TOOLS = [
  { name: 'hola', title: 'Hola CarrEar', description: 'Comprueba la conexión con CarrEar y devuelve con qué cuenta estás conectado.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true, openWorldHint: false } },
  { name: 'licencia', title: 'Mi acceso a CarrEar', description: 'Dice si el acceso a CarrEar de esta cuenta está activo y hasta cuándo. Si no lo está, da el enlace para activarlo. Llámala al empezar cualquier trabajo de CarrEar.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true, openWorldHint: false } },
];

function finDeMes(d = new Date()) { return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).toISOString().slice(0, 10); }

function licencia(env: Env, email: string) {
  const lista = String(env.LICENCIAS_ACTIVAS || '').toLowerCase().split(/[\s,;]+/).filter(Boolean);
  if (lista.includes(email)) return { estado: 'activa', hasta: finDeMes(), cuenta: email };
  return { estado: 'inactiva', cuenta: email, enlacePago: env.PAGO_URL || 'https://mycarrearteam.com',
    mensaje: 'Tu acceso a CarrEar no está activo. Actívalo en el enlace y vuelve a intentarlo.' };
}

const rpc = (id: any, result: any) => Response.json({ jsonrpc: '2.0', id, result });
const rpcErr = (id: any, code: number, message: string) => Response.json({ jsonrpc: '2.0', id, error: { code, message } });

const apiHandler = {
  async fetch(req: Request, env: Env, ctx: any): Promise<Response> {
    if (req.method === 'GET') return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'POST' } });
    if (req.method === 'DELETE') return new Response(null, { status: 204 });
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
    const props = ctx.props as Props;
    let msg: any;
    try { msg = await req.json(); } catch { return rpcErr(null, -32700, 'Parse error'); }
    if (Array.isArray(msg)) return rpcErr(null, -32600, 'Batch no soportado');
    const { id, method, params } = msg || {};
    if (id === undefined || id === null) return new Response(null, { status: 202 }); // notificación
    switch (method) {
      case 'initialize':
        return rpc(id, { protocolVersion: params?.protocolVersion || '2025-06-18', capabilities: { tools: { listChanged: false } },
          serverInfo: { name: 'carrear', title: 'CarrEar', version: VERSION },
          instructions: 'Conector de CarrEar. Antes de cualquier trabajo de CarrEar llama a «licencia». Si está inactiva, muestra su mensaje y el enlace, y para.' });
      case 'ping': return rpc(id, {});
      case 'tools/list': return rpc(id, { tools: TOOLS });
      case 'tools/call': {
        const name = params?.name;
        let out: any;
        if (name === 'hola') out = { ok: true, mensaje: `Hola, estás conectado a CarrEar ${VERSION} con ${props.email}.`, cuenta: props.email };
        else if (name === 'licencia') out = licencia(env, props.email);
        else return rpcErr(id, -32602, `Herramienta desconocida: ${name}`);
        return rpc(id, { content: [{ type: 'text', text: JSON.stringify(out) }], structuredContent: out });
      }
      default: return rpcErr(id, -32601, `Método no soportado: ${method}`);
    }
  },
};

let provider: any = null;
export default {
  fetch(req: Request, env: Env & { PUBLIC_URL: string }, ctx: ExecutionContext) {
    // La dirección pública del Worker (variable PUBLIC_URL) solo se conoce al desplegar: el proveedor se crea en la primera petición.
    if (!provider) {
      const base = String(env.PUBLIC_URL || new URL(req.url).origin).replace(/\/$/, '');
      provider = new OAuthProvider<Env>({
        apiRoute: '/mcp',
        apiHandler: apiHandler as any,
        defaultHandler: defaultHandler as any,
        authorizeEndpoint: '/authorize',
        tokenEndpoint: '/token',
        clientRegistrationEndpoint: '/register',
        scopesSupported: ['carrear'],
        requiredScopes: ['carrear'],
        resourceMetadata: { resource: `${base}/mcp`, authorization_servers: [base] },
        clientIdMetadataDocumentEnabled: true,
      } as any);
    }
    return provider.fetch(req, env, ctx);
  },
};
