/* Runs the real guided/gas/Code.gs under Node with small stand-ins for the Google services it uses, behind a
   local HTTP server. The browser test talks to this instead of Google, so the sheet script itself is tested:
   step rows, the submission row that is updated in place, duplicates, and the two analysis sheets.

   usage: node guided/tools/gas_sim.js <port>
   extra routes for tests:  GET /__up?on=0|1  (sheet unreachable)   GET /__state  (sheet contents) */
'use strict';
const fs = require('fs'), http = require('http'), path = require('path'), vm = require('vm');
const port = Number(process.argv[2] || 8766);
let parentKey = process.argv[3] || '';     // empty = the report is open

const sheets = {}, mails = [], cache = {};
let up = true;

function Range(sh, r, c, nr, nc) {
  const self = {
    getValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => (sh.data[r - 1 + i] || [])[c - 1 + j] ?? '')),
    setValues(v) {
      if (v.length !== nr || v.some(row => row.length !== nc)) throw new Error('setValues: size does not match the range');
      v.forEach((row, i) => { sh.data[r - 1 + i] = sh.data[r - 1 + i] || []; row.forEach((x, j) => { sh.data[r - 1 + i][c - 1 + j] = x; }); });
      return self;
    },
    clearContent() { for (let i = 0; i < nr; i++) sh.data[r - 1 + i] = []; while (sh.data.length && !sh.data[sh.data.length - 1].length) sh.data.pop(); return self; },
    setBackgrounds(v) { if (v.length !== nr || v.some(row => row.length !== nc)) throw new Error('setBackgrounds: size'); return self; },
    setFontWeight: () => self, setBackground: () => self, getValue: () => (sh.data[r - 1] || [])[c - 1] ?? '',
  };
  return self;
}
function Sheet(name) {
  const sh = { name, data: [], rtl: false };
  sh.getLastRow = () => sh.data.length;
  sh.getLastColumn = () => Math.max(0, ...sh.data.map(r => r.length));
  sh.getRange = (r, c, nr, nc) => { if (r < 1 || c < 1 || nr < 1 || nc < 1) throw new Error('getRange: bad range ' + [r, c, nr, nc]); return Range(sh, r, c, nr, nc); };
  sh.appendRow = row => { sh.data.push(row.slice()); return sh; };
  sh.setRightToLeft = v => { sh.rtl = v; return sh; };
  sh.setFrozenRows = () => sh;
  return sh;
}
const ss = { getSheetByName: n => sheets[n] || null, insertSheet: n => (sheets[n] = Sheet(n)), getUrl: () => 'https://sheet.example/test' };
const sandbox = {
  SpreadsheetApp: { getActiveSpreadsheet: () => ss },
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
  ContentService: { MimeType: { JSON: 'json' }, createTextOutput: t => ({ text: t, setMimeType() { return this; } }) },
  PropertiesService: { getScriptProperties: () => ({ getProperty: k => (k === 'PARENT_KEY' ? parentKey || null : null) }) },
  CacheService: { getScriptCache: () => ({ get: k => cache[k] ?? null, put: (k, v) => { cache[k] = v; }, remove: k => { delete cache[k]; } }) },
  MailApp: { sendEmail: (to, subject, body) => mails.push({ to, subject, body }) },
  Session: { getEffectiveUser: () => ({ getEmail: () => 'owner@example.com' }) },
};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'gas', 'Code.gs'), 'utf8') + '\nthis.doPost = doPost; this.doGet = doGet; this.setup = setup;', sandbox);
sandbox.setup();

http.createServer((req, res) => {
  const send = (code, body) => { res.writeHead(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }); res.end(body); };
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/__up') { up = url.searchParams.get('on') === '1'; return send(200, '{}'); }
  if (url.pathname === '/__unlock') { delete cache.fails; return send(200, '{}'); }
  if (url.pathname === '/__key') { parentKey = url.searchParams.get('v') || ''; return send(200, '{}'); }
  if (url.pathname === '/__state') return send(200, JSON.stringify({ mails, sheets: Object.fromEntries(Object.entries(sheets).map(([k, v]) => [k, v.data])) }));
  if (!up) { res.writeHead(503); return res.end(); }
  if (req.method === 'GET') return send(200, sandbox.doGet().text);
  let body = '';
  req.on('data', d => { body += d; });
  req.on('end', () => send(200, sandbox.doPost({ postData: { contents: body } }).text));
}).listen(port, '127.0.0.1', () => console.log('gas_sim ready on ' + port));
