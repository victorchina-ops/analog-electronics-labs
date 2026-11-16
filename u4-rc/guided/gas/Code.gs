/**
 * @OnlyCurrentDoc
 *
 * Guided LP/HP activity - receives the students' work from the site and writes it to this Google Sheet.
 *
 * Sheets (created by setup, right to left):
 *   הגשות        - one row per student attempt (name, phone), updated while the student works; "מצב" turns to "הוגש" at the end
 *   צעדים        - one row per finished step: the answers typed, wrong attempts, hints opened, seconds, points
 *   ניתוח שלבים  - rebuilt: per step, how the class did (first-try success, hints, time). Hardest first inside a station
 *   מיומנויות    - rebuilt: per student and skill, points and percent. Weakest first
 *
 * Install: Extensions > Apps Script, paste this file, run setup once, then
 * Deploy > New deployment > Web app > Execute as: Me, Who has access: Anyone. Copy the /exec address
 * into guided/config.js on the site. After changing this file: Deploy > Manage deployments > edit >
 * Version: New version (the address stays the same).
 *
 * The two analysis sheets are rebuilt when a student submits, and from the menu "פעילות מודרכת" > "רענון ניתוח".
 * Nothing here reads data back to the site: the sheet is private to its owner.
 * Permissions: this spreadsheet only (@OnlyCurrentDoc) and its menu. The script sends no e-mail.
 */
const WEAK_BELOW = 60, GOOD_FROM = 85;   // percent: below 60 "לחזק", from 85 "מצוין", between "כמעט"
const MAX_EVENTS = 80, MAX_TEXT = 300;
const STATION_COLS = 5;             // the site has five stations; their titles arrive with the data

const HEAD = {
  'הגשות': ['עודכן', 'התחלה', 'שם', 'טלפון', 'ניסיון', 'מצב', 'ציון', 'מתוך', 'אחוז', 'שלבים שהושלמו', 'מתוך שלבים', 'רמזים', 'תשובות שגויות',
    'פתרונות שנחשפו', 'משך (דקות)', 'תחנה 1', 'תחנה 2', 'תחנה 3', 'תחנה 4', 'תחנה 5', 'לחזק', 'נתונים אישיים', 'מכשיר', 'מזהה ניסיון'],
  'צעדים': ['זמן', 'שם', 'תחנה', 'שלב', 'מיומנות', 'סוג', 'תשובות התלמיד', 'תשובה נכונה', 'ניסיונות שגויים', 'רמזים שנפתחו',
    'נחשף פתרון (1/0)', 'נקודות', 'מתוך', 'שניות', 'מזהה ניסיון', 'מזהה שלב'],
  'ניתוח שלבים': ['תחנה', 'שלב', 'מיומנות', 'תלמידים', 'הצליחו בניסיון ראשון בלי רמז (%)', 'ממוצע תשובות שגויות', 'ממוצע רמזים',
    'נחשף פתרון', 'ממוצע נקודות (%)', 'חציון שניות', 'מזהה שלב'],
  'מיומנויות': ['שם', 'מיומנות', 'נקודות', 'מתוך', 'אחוז', 'מצב'],
};
const SUB = {};   // column numbers of הגשות, by header
HEAD['הגשות'].forEach(function (h, i) { SUB[h] = i + 1; });
const STEP_ATT = HEAD['צעדים'].indexOf('מזהה ניסיון'), STEP_ID = HEAD['צעדים'].indexOf('מזהה שלב');
const KIND = { num: 'חישוב', mc: 'רב-ברירה', sim: 'הפעלת סימולטור', info: 'קריאה' };

/** Run once from the editor: creates the four sheets. Safe to run again. */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(HEAD).forEach(function (name) { sheet_(ss, name); });
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu('פעילות מודרכת').addItem('רענון ניתוח', 'refresh').addToUi();
}

/** Menu: rebuild the two analysis sheets from the raw step rows. */
function refresh() {
  rebuild_(SpreadsheetApp.getActiveSpreadsheet());
}

function sheet_(ss, name) {
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.setRightToLeft(true);
  }
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, HEAD[name].length).setValues([HEAD[name]]).setFontWeight('bold').setBackground('#e8f1fb');
    sh.setFrozenRows(1);
  }
  return sh;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Text from the public site: clipped, and never allowed to become a formula. */
function text_(v) {
  const s = String(v === undefined || v === null ? '' : v).slice(0, MAX_TEXT);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}
/** A phone number is kept as text (the leading apostrophe is not shown in the sheet), so its first 0 survives. */
function phone_(v) {
  const d = String(v === undefined || v === null ? '' : v).replace(/\D/g, '').slice(0, 15);
  return d ? "'" + d : '';
}
function num_(v) {
  const n = Number(v);
  return isFinite(n) ? n : 0;
}

function doGet() {
  return json_({ ok: true, app: 'u4-lp-hp-guided' });
}

function doPost(e) {
  let p;
  try {
    p = JSON.parse(e.postData.contents);
    if (p.type === 'ping') return json_({ ok: true, ping: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(25000);
    const h = p.head || {};
    const events = Array.isArray(p.events) ? p.events : [];
    if (p.type !== 'batch' || !h.attemptId || !h.student || events.length > MAX_EVENTS) return json_({ ok: false, error: 'bad payload' });

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const id = text_(h.attemptId), name = text_(h.student);
    const titles = {};
    (Array.isArray(h.stationTitles) ? h.stationTitles : []).forEach(function (t) { titles[String(t[0])] = text_(t[1]); });

    // 1. step rows. The site re-sends until it gets an answer, so a step may arrive twice: keep one copy.
    const steps = sheet_(ss, 'צעדים');
    let added = 0;
    if (events.length) {
      const n = steps.getLastRow() - 1;
      const seen = {};
      if (n > 0) {
        steps.getRange(2, STEP_ATT + 1, n, 2).getValues().forEach(function (r) { seen[r[0] + '|' + r[1]] = true; });
      }
      const rows = [];
      events.forEach(function (ev) {
        const stepId = text_(ev.stepId);
        if (!stepId || seen[id + '|' + stepId]) return;
        seen[id + '|' + stepId] = true;
        rows.push([new Date(num_(ev.at) || Date.now()), name, titles[String(ev.station)] || text_(ev.station), text_(ev.title), text_(ev.skill),
          KIND[ev.kind] || text_(ev.kind), text_(ev.attempts), text_(ev.expected), num_(ev.wrong), num_(ev.hints), ev.revealed ? 1 : 0,
          num_(ev.earned), num_(ev.pts), num_(ev.sec), id, stepId]);
      });
      if (rows.length) steps.getRange(steps.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
      added = rows.length;
    }

    // 2. the attempt's row in הגשות: found by its id and overwritten, or appended the first time
    const s = p.summary;
    let finished = false;
    if (s) {
      const sub = sheet_(ss, 'הגשות');
      const stationIds = (Array.isArray(h.stationTitles) ? h.stationTitles : []).map(function (t) { return String(t[0]); });
      const st = [];
      for (let i = 0; i < STATION_COLS; i++) {
        const x = s.stations && s.stations[stationIds[i]];
        st.push(x && x.max ? num_(x.earned) + ' / ' + num_(x.max) : x ? (x.done === x.total ? 'בוצע' : '') : '');
      }
      finished = Boolean(s.finished);
      const row = [new Date(), new Date(num_(h.startedAt) || Date.now()), name, phone_(h.phone), num_(h.attemptNo) || 1, finished ? 'הוגש' : 'בתהליך',
        num_(s.score), num_(s.max), num_(s.pct), num_(s.done), num_(s.total), num_(s.hints), num_(s.wrong), num_(s.revealed),
        Math.round(num_(s.durationSec) / 6) / 10].concat(st, [text_((s.weak || []).join(', ')), text_(h.params), text_(h.device), id]);
      const n = sub.getLastRow() - 1;
      let at = -1;
      if (n > 0) {
        const ids = sub.getRange(2, SUB['מזהה ניסיון'], n, 1).getValues();
        for (let i = 0; i < ids.length; i++) if (ids[i][0] === id) { at = i + 2; break; }
      }
      // a late, stale batch must not turn a submitted attempt back to "in progress"
      if (at > 0 && !finished && sub.getRange(at, SUB['מצב'], 1, 1).getValues()[0][0] === 'הוגש') {
        // keep the submitted row as it is
      } else if (at > 0) {
        sub.getRange(at, 1, 1, row.length).setValues([row]);
        colour_(sub, at, row.length, finished, num_(s.pct));
      } else {
        sub.appendRow(row);
        colour_(sub, sub.getLastRow(), row.length, finished, num_(s.pct));
      }
    }

    // 3. the analysis sheets are rebuilt only when a student submits: cheap for everyone else
    if (finished) rebuild_(ss);
    return json_({ ok: true, added: added });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function colour_(sh, rowNo, width, finished, pct) {
  const c = !finished ? '#ffffff' : pct < WEAK_BELOW ? '#fbe9e7' : pct < GOOD_FROM ? '#fdf2d8' : '#e3f4ea';
  sh.getRange(rowNo, 1, 1, width).setBackground(c);
}

/** Rebuilds ניתוח שלבים and מיומנויות from צעדים. One pass over the data; fine for thousands of rows. */
function rebuild_(ss) {
  const src = sheet_(ss, 'צעדים');
  const n = src.getLastRow() - 1;
  const data = n > 0 ? src.getRange(2, 1, n, HEAD['צעדים'].length).getValues() : [];
  // columns of צעדים: 0 time, 1 name, 2 station, 3 step, 4 skill, 5 kind, 6 answers, 7 expected, 8 wrong, 9 hints, 10 revealed, 11 points, 12 of, 13 sec, 14 attempt, 15 step id
  const sum = function (a) { return a.reduce(function (x, y) { return x + y; }, 0); };
  const median = function (a) {
    const b = a.slice().sort(function (x, y) { return x - y; });
    return b.length ? (b.length % 2 ? b[(b.length - 1) / 2] : Math.round((b[b.length / 2 - 1] + b[b.length / 2]) / 2)) : 0;
  };

  const bySteps = {}, order = [];
  data.forEach(function (r) {
    const key = r[15];
    if (!bySteps[key]) { bySteps[key] = { station: r[2], title: r[3], skill: r[4], rows: [] }; order.push(key); }
    bySteps[key].rows.push(r);
  });
  order.sort();   // step ids are s1-..., s2-...: the stations stay in order
  const stepRows = order.map(function (key) {
    const g = bySteps[key], rows = g.rows, scored = rows.filter(function (r) { return r[12] > 0; });
    const clean = scored.filter(function (r) { return r[8] === 0 && r[9] === 0 && r[10] === 0; }).length;
    return [g.station, g.title, g.skill, rows.length,
      scored.length ? Math.round(100 * clean / scored.length) : '',
      Math.round(10 * sum(rows.map(function (r) { return r[8]; })) / rows.length) / 10,
      Math.round(10 * sum(rows.map(function (r) { return r[9]; })) / rows.length) / 10,
      sum(rows.map(function (r) { return r[10]; })),
      scored.length ? Math.round(100 * sum(scored.map(function (r) { return r[11]; })) / sum(scored.map(function (r) { return r[12]; }))) : '',
      median(rows.map(function (r) { return r[13]; })), key];
  });
  write_(sheet_(ss, 'ניתוח שלבים'), stepRows, function (r) {
    return r[8] === '' ? null : r[8] < WEAK_BELOW ? '#fbe9e7' : r[8] < GOOD_FROM ? '#fdf2d8' : '#e3f4ea';
  });

  // per student and skill; when a student has several attempts, all of them count
  const groups = {};
  data.forEach(function (r) {
    if (!(r[12] > 0) || !r[4]) return;
    const key = r[1] + '\u0001' + r[4];
    const g = groups[key] || (groups[key] = [0, 0]);
    g[0] += r[11];
    g[1] += r[12];
  });
  const skills = Object.keys(groups).map(function (key) {
    const g = groups[key], pct = Math.round(100 * g[0] / g[1]);
    return key.split('\u0001').concat([g[0], g[1], pct, pct < WEAK_BELOW ? 'לחזק' : pct < GOOD_FROM ? 'כמעט' : 'מצוין']);
  }).sort(function (x, y) { return x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : x[4] - y[4]; });
  write_(sheet_(ss, 'מיומנויות'), skills, function (r) {
    return r[5] === 'לחזק' ? '#fbe9e7' : r[5] === 'כמעט' ? '#fdf2d8' : '#e3f4ea';
  });
}

/** Replaces everything under the header row; optional row colour. */
function write_(sh, rows, colour) {
  const width = sh.getLastColumn();
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, width).clearContent().setBackground(null);
  if (!rows.length) return;
  const range = sh.getRange(2, 1, rows.length, rows[0].length);
  range.setValues(rows);
  if (colour) range.setBackgrounds(rows.map(function (r) { return r.map(function () { return colour(r); }); }));
}
