const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 18787;
const DATA = path.join(__dirname, 'accounts.json');
const CLIENT_ID = 'app_EMoamEEZ73f0CkXaXp7hrann';
let accounts = fs.existsSync(DATA) ? JSON.parse(fs.readFileSync(DATA, 'utf8')) : [];
const devices = new Map();

function save() { fs.writeFileSync(DATA, JSON.stringify(accounts, null, 2)); }
function send(res, status, data) { res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(data)); }
async function body(req) { let s = ''; for await (const c of req) s += c; return s ? JSON.parse(s) : {}; }
async function postJson(url, payload) {
  const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify(payload) });
  const text = await r.text(); let data; try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!r.ok) throw new Error(`${r.status}: ${text}`); return data;
}
function claim(idToken) { try { return JSON.parse(Buffer.from(idToken.split('.')[1], 'base64url')); } catch { return {}; } }

async function pollDevice(jobId) {
  const job = devices.get(jobId); if (!job || job.done) return;
  try {
    const result = await postJson('https://auth.openai.com/api/accounts/deviceauth/token', { device_auth_id: job.device_auth_id, user_code: job.user_code });
    if (!result.authorization_code) throw new Error('authorization_pending');
    const tokens = await postJson('https://auth.openai.com/oauth/token', {
      grant_type: 'authorization_code', code: result.authorization_code,
      redirect_uri: 'https://auth.openai.com/deviceauth/callback', client_id: CLIENT_ID,
      code_verifier: result.code_verifier
    });
    const claims = claim(tokens.id_token || '');
    accounts.push({ id: Date.now().toString(36), label: job.label, access_token: tokens.access_token, refresh_token: tokens.refresh_token || '', account_id: claims.chatgpt_account_id || claims['https://api.openai.com/auth']?.chatgpt_account_id || '' });
    save(); job.done = true; job.success = true;
  } catch (error) {
    if (!String(error.message).includes('authorization_pending') && !String(error.message).startsWith('403') && !String(error.message).startsWith('404')) { job.done = true; job.error = error.message; return; }
  }
  if (!job.done) setTimeout(() => pollDevice(jobId), Math.max(5000, (job.interval || 5) * 1000));
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    if (url.pathname === '/api/device/start' && req.method === 'POST') {
      const input = await body(req);
      const code = await postJson('https://auth.openai.com/api/accounts/deviceauth/usercode', { client_id: CLIENT_ID });
      const id = Date.now().toString(36);
      devices.set(id, { device_auth_id: code.device_auth_id, user_code: code.user_code || code.usercode, label: input.label || 'GPT账号', interval: Number(code.interval) || 5, done: false });
      pollDevice(id);
      return send(res, 200, { id, verification_url: 'https://auth.openai.com/codex/device', user_code: devices.get(id).user_code });
    }
    if (url.pathname.startsWith('/api/device/status/')) return send(res, 200, devices.get(url.pathname.split('/').pop()) || { done: true, error: '任务不存在' });
    if (url.pathname === '/api/accounts' && req.method === 'POST') { const x = await body(req); if (!x.label || !x.access_token) return send(res, 400, { error: 'label and access_token required' }); accounts.push({ id: Date.now().toString(36), label: x.label, access_token: x.access_token, refresh_token: x.refresh_token || '', account_id: x.account_id || '' }); save(); return send(res, 200, { ok: true }); }
    if (url.pathname === '/api/accounts/action' && req.method === 'POST') { const x = await body(req), i = accounts.findIndex(a => a.id === x.id); if (i < 0) return send(res, 404, { error: 'account not found' }); if (x.action === 'delete') accounts.splice(i, 1); else if (x.action === 'rename') accounts[i].label = x.label || accounts[i].label; else return send(res, 400, { error: 'unknown action' }); save(); return send(res, 200, { ok: true }); }
    if (url.pathname === '/api/accounts/reorder' && req.method === 'POST') { const x = await body(req), map = new Map(accounts.map(a => [a.id, a])); accounts = (x.ids || []).map(id => map.get(id)).filter(Boolean).concat(accounts.filter(a => !(x.ids || []).includes(a.id))); save(); return send(res, 200, { ok: true }); }
    if (url.pathname === '/api/usage') { const result = []; for (const a of accounts) { try { const r = await fetch('https://chatgpt.com/backend-api/wham/usage', { headers: { authorization: `Bearer ${a.access_token}`, 'ChatGPT-Account-Id': a.account_id || '', accept: 'application/json' } }); const d = await r.json(); const q = d.rate_limit || {}; result.push({ id: a.id, label: a.label, primary: q.primary_window, secondary: q.secondary_window, refreshed_at: new Date().toISOString() }); } catch (e) { result.push({ id: a.id, label: a.label, error: e.message, refreshed_at: new Date().toISOString() }); } } return send(res, 200, result); }
    if (url.pathname === '/') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return res.end(fs.readFileSync(path.join(__dirname, 'public/index.html'))); }
    res.writeHead(404); res.end();
  } catch (e) { send(res, 500, { error: e.message }); }
});
server.listen(PORT, '127.0.0.1');
