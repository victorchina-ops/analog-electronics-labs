/**
 * guided/content.js - the guided bagrut activity for unit U4 (the capacitor, LP and HP networks).
 *
 * Five stations. Stations 1-2 are a reminder with full simulator read-outs; stations 3-4 walk through two
 * original bagrut questions (815381: 2021 Q5, 2016 Q2), where the student computes first and the simulator
 * confirms; station 5 is the same kind of question with personal component values derived from the name.
 *
 * No number is typed by hand: every expected value is computed from RCEngine when the page loads, and
 * tools/check_guided.js recomputes all of them independently in closed form.
 *
 * BiDi: every formula, number with a unit and Latin term goes through L() / T() (isolated LTR <bdi>).
 */
(function (global) {
  'use strict';

  const E = global.RCEngine;
  const L = E.L;
  const T = E.T;

  const ms = (x) => x * 1e-3;
  const f2 = (x) => E.fmtFixed(x, 2);
  const g = (x) => String(Number(Number(x).toFixed(3)));   // 4, 2.5, 0.75: no trailing zeros
  const neg = (x) => (x < 0 ? '(' + f2(x) + ')' : f2(x));

  const SKILLS = {
    tau: 'קבוע הזמן',
    kvl: 'קירכהוף בחוג',
    read: 'קריאה מהסימולטור',
    concept: 'הבנת צורת הגל',
    charge: 'טעינה ברשת LP',
    discharge: 'פריקה ברשת LP',
    rchange: 'השפעת שינוי הנגד',
    hpjump: 'קפיצת המוצא ברשת HP',
    hpdecay: 'דעיכה ברשת HP',
    time: 'נוסחת הזמן'
  };

  // ---------------------------------------------------------------- circuits
  /** The scope prints "t [ms]" at the right end of the time axis. If the last tick lands there the two
   *  overlap, so the view is stretched a little until the last tick is at least 16% away from the end
   *  (enough for the label on a phone-width graph as well).
   *  The tick step is computed exactly as visuals.js does. */
  function niceEnd(start, end) {
    for (let i = 0; i < 12; i++) {
      const span = end - start;
      const raw = span / 7;
      const mag = Math.pow(10, Math.floor(Math.log10(raw)));
      const norm = raw / mag;
      const step = (norm <= 1.2 ? 1 : norm <= 2.2 ? 2 : norm <= 5.5 ? 5 : 10) * mag;
      const last = Math.floor(end / step + 1e-9) * step;
      if ((end - last) / span >= 0.16) return end;
      end = Number((end + span * 0.03).toFixed(6));
    }
    return end;
  }

  function cfg(network, R_kohm, C_uF, view, transitions) {
    view = [view[0], niceEnd(view[0], view[1])];
    return {
      network,
      R1_ohm: R_kohm * 1e3,
      C_F: C_uF * 1e-6,
      timeUnit: 'ms',
      tViewStart_s: ms(view[0]),
      tViewEnd_s: ms(view[1]),
      preVi: 0,
      steadyState: true,
      transitions: transitions.map((tr) => ({ t_s: ms(tr[0]), Vi: tr[1] }))
    };
  }

  /** Output of the network at t [ms]; side 'before' / 'after' matters only exactly on a jump. */
  function vo(c, net, t_ms, side) {
    const ev = E.evaluateAt(E.compileTimeline(c), ms(t_ms), side || 'after');
    return net === 'HP' ? ev.VoHP : ev.VoLP;
  }

  /** Time [ms] at which the output of `net` reaches v inside the segment that contains tInside_ms. */
  function tHit(c, net, v, tInside_ms) {
    const tl = E.compileTimeline(c);
    const seg = E.evaluateAt(tl, ms(tInside_ms), 'after').segment;
    const res = E.solveTimeForVoltage(tl, net, v, seg.index);
    if (!res.hits || !res.hits.length) throw new Error('guided content: no time solution for ' + v + ' V');
    return { t: res.hits[0].t_s * 1e3, dt: res.hits[0].dt_s * 1e3, t0: seg.tStart * 1e3 };
  }

  const WARM = cfg('LP', 10, 1, [-5, 60], [[0, 10]]);
  const BOTH = cfg('BOTH', 10, 1, [-8, 90], [[0, 10], [30, 0]]);
  const Q2021 = cfg('LP', 4, 2, [-2, 32], [[0, 5], [10, 0]]);
  const Q2021_HALF = cfg('LP', 2, 2, [-2, 32], [[0, 5], [10, 0]]);
  const Q2016 = cfg('HP', 1, 2, [-1, 10], [[0, 6], [3, 0]]);

  // ---------------------------------------------------------------- formula sheet (always free)
  const FORMULAS = {
    rows: [
      { f: 'τ = R · C', what: 'קבוע הזמן של הרשת', when: `תמיד הצעד הראשון. ${L('kΩ · µF = ms')}` },
      { f: 'Vi = VR + VC', what: 'קירכהוף בחוג: המבוא מתחלק בין הנגד לקבל', when: 'נכון בכל רגע, בכל רשת' },
      { f: 'Vo(t) = Vf + (V0 - Vf) · e^(-Δt/τ)', what: `הנוסחה הכללית: ${L('V0')} הערך בתחילת הקטע, ${L('Vf')} לאן המוצא שואף, ${L('Δt')} הזמן מתחילת הקטע`, when: 'כל קטע, טעינה או פריקה' },
      { f: 'Vo = Vi · (1 - e^(-Δt/τ))', what: `טעינה מאפס ברשת ${T('LP')}`, when: 'הקבל ריק והמבוא קפץ לערך קבוע' },
      { f: 'Vo = V0 · e^(-Δt/τ)', what: 'פריקה, או דעיכה אל אפס', when: `${T('LP')} אחרי שהמבוא חזר לאפס; ${T('HP')} בכל קטע` },
      { f: 'Vo(t⁺) = Vo(t⁻) + ΔVi', what: `כלל הקפיצה ברשת ${T('HP')}: המוצא קופץ בדיוק כמו המבוא`, when: `בכל רגע שבו המבוא קופץ. ב-${T('LP')} המוצא לא קופץ` },
      { f: 'Δt = τ · ln((V0 - Vf) / (V - Vf))', what: `כמה זמן עובר מתחילת הקטע עד שהמוצא מגיע למתח ${L('V')}`, when: `שאלות "מתי". בסוף: ${L('t = t0 + Δt')}` }
    ],
    compare: [
      ['', `רשת ${T('LP')}`, `רשת ${T('HP')}`],
      ['המוצא נלקח מ-', 'הקבל', 'הנגד'],
      ['ברגע שהמבוא קופץ', 'המוצא לא קופץ', `המוצא קופץ ב-${L('ΔVi')}`],
      [`לאן המוצא שואף (${L('Vf')})`, `אל ${L('Vi')}`, `אל ${L('0 V')}`],
      ['הקשר ביניהם', `${L('Vo(LP) + Vo(HP) = Vi')}`, 'בכל רגע']
    ],
    table: [['Δt/τ', '0.5', '1', '1.5', '2', '3', '5'], ['e^(-Δt/τ)', '0.607', '0.368', '0.223', '0.135', '0.050', '≈ 0']]
  };

  // ---------------------------------------------------------------- personal values (station 5)
  function hashSeed(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  }
  function rng(seed) {
    let a = (seed >>> 0) || 1;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const normName = (s) => String(s || '').trim().replace(/\s+/g, ' ').toLowerCase();

  // R [kΩ], C [µF] pairs with a round τ between 2 and 20 ms
  const RC_PAIRS = [[1, 2], [1, 4], [2, 1], [2, 2], [2, 4], [2.5, 2], [2.5, 4], [4, 0.5], [4, 1], [4, 2], [5, 1], [5, 2], [5, 4], [10, 0.5], [10, 1], [10, 2]];
  const E_VALUES = [4, 6, 8, 9, 10, 12, 15];
  const PULSE_K = [0.5, 0.75, 1, 1.25, 1.5];      // pulse width in units of τ
  const AFTER_K = [0.5, 0.75, 1];                 // t2 - Tp in units of τ
  const TARGET_PCT = [0.2, 0.25, 0.3];            // every one is below the smallest peak, E·(1 - e^-0.5) = 0.39·E

  /** Deterministic: the same name always gets the same circuit, on every device. */
  function makePersonal(fullName) {
    const seed = hashSeed('u4-guided-v1|' + normName(fullName));
    const r = rng(seed);
    const pick = (arr) => arr[Math.floor(r() * arr.length)];
    const pair = pick(RC_PAIRS);
    const R = pair[0], C = pair[1];
    const tau = R * C;
    const Ev = pick(E_VALUES);
    const Tp = Number((tau * pick(PULSE_K)).toFixed(3));
    const t2 = Number((Tp + tau * pick(AFTER_K)).toFixed(3));
    const Vt = Number((Ev * pick(TARGET_PCT)).toFixed(2));
    return { seed, R, C, E: Ev, tau, Tp, t2, Vt };
  }

  // ---------------------------------------------------------------- small builders
  const sol = (f, s, r) => ({ f, s, r });
  const hint = (cost, html) => ({ cost, html });
  const opt = (html, fb, correct) => ({ html, fb, correct: Boolean(correct) });

  // ================================================================ the activity
  function build(personal) {
    const P = personal;

    // ---------- station 1: the capacitor charges ----------
    const vc_tau = vo(WARM, 'LP', 10);
    const vr_tau = vo(WARM, 'HP', 10);
    const s1 = {
      id: 's1', short: 'חימום', title: 'חימום: הקבל נטען דרך נגד', img: 'stopwatch',
      introHe: 'חמש דקות של תזכורת. כאן הסימולטור פתוח לגמרי: מפעילים, גוררים את הסמן וקוראים ערכים.',
      steps: [
        {
          id: 's1-idea', type: 'info', titleHe: 'הרעיון בתמונה אחת', img: 'st-intro',
          bodyHe: `<p>קבל שנטען דרך נגד דומה למכל שמתמלא דרך צינור דק: בהתחלה המים זורמים מהר, וככל שהמכל מתמלא הזרימה נחלשת.</p>
            <p>במעגל, מתח המקור מתחלק בכל רגע בין הנגד לקבל:</p>
            <div class="eq">${L('E = VR + VC')}</div>
            <p>כשהקבל ריק כל המתח נופל על הנגד והזרם מרבי. כשהקבל מלא אין זרם.</p>`,
          sim: { cfg: WARM, network: 'LP', mode: 'full', hidden: true }
        },
        {
          id: 's1-play', type: 'sim', task: 'play', titleHe: 'מפעילים את המעגל',
          bodyHe: `<p>בסימולטור: נגד ${L('R = 10 kΩ')}, קבל ריק ${L('C = 1 µF')}, וב-${L('t = 0')} מחברים מקור ${L('E = 10 V')}.</p>
            <p class="do">לחצו על <b>▶ הפעל</b> וצפו. הקו הירוק הוא המתח על הקבל.</p>`,
          afterHe: 'שמתם לב? העלייה מהירה בהתחלה ואחר כך מאטה. זו עקומה מעריכית, לא קו ישר.',
          sim: { cfg: WARM, network: 'LP', mode: 'full', hidden: true }
        },
        {
          id: 's1-tau', type: 'num', skill: 'tau', pts: 2, titleHe: 'קבוע הזמן',
          bodyHe: `<p>כמה מהר הקבל נטען? את זה קובע קבוע הזמן ${L('τ = R · C')}.</p><p class="ask">חשבו את ${L('τ')} של המעגל.</p>`,
          unit: 'ms', expected: 10,
          traps: [{ value: 0.01, messageHe: `זה הערך בשניות. התשובה מבוקשת ב-${L('ms')}: ${L('kΩ · µF = ms')}.` }],
          hints: [hint(1, `קילו-אוהם כפול מיקרו-פאראד נותן מילי-שניות: ${L('10 kΩ · 1 µF = ? ms')}`)],
          solution: [sol('τ = R · C', 'τ = 10 kΩ · 1 µF', 'τ = 10 ms')],
          afterHe: `הקווים המקווקווים בגרף מסמנים עכשיו את ${L('τ')} ואת ${L('5τ')}.`,
          sim: { cfg: WARM, network: 'LP', mode: 'full', showTau: true }
        },
        {
          id: 's1-read', type: 'num', skill: 'read', pts: 2, titleHe: 'מודדים אחרי קבוע זמן אחד',
          bodyHe: `<p class="do">גררו את הסמן בגרף (או את המחוון שמתחתיו) אל ${L('t = 10 ms')}, כלומר אחרי ${L('τ')} אחד.</p>
            <p class="ask">מה המתח על הקבל ${L('VC')} ברגע הזה? קראו מלוח המדידות.</p>`,
          unit: 'V', expected: vc_tau, tolAbs: 0.12,
          hints: [hint(1, `הקלידו ${L('10')} בתיבה ${L('t =')} שמתחת לגרף, וקראו את השורה ${L('VC')} בלוח המדידות.`)],
          solution: [sol('VC = E · (1 - e^(-Δt/τ))', 'VC = 10 V · (1 - e^(-10/10))', 'VC = ' + f2(vc_tau) + ' V')],
          afterHe: `אחרי ${L('τ')} אחד הקבל עובר תמיד 63 אחוז מהדרך: ${L('0.63 · 10 V = 6.3 V')}. כדאי לזכור.`,
          sim: { cfg: WARM, network: 'LP', mode: 'full', showTau: true }
        },
        {
          id: 's1-kvl', type: 'num', skill: 'kvl', pts: 2, titleHe: 'ומה נשאר על הנגד?',
          bodyHe: `<p class="ask">באותו רגע, ${L('t = 10 ms')}: מה המתח על הנגד ${L('VR')}?</p><p>אפשר לקרוא מהסימולטור, ואפשר לחשב מחוק קירכהוף.</p>`,
          unit: 'V', expected: vr_tau, tolAbs: 0.12,
          traps: [{ value: vc_tau, messageHe: `זה המתח על הקבל. ביקשו את המתח על הנגד: ${L('VR = E - VC')}.` }],
          hints: [hint(1, `${L('E = VR + VC')}, ולכן ${L('VR = E - VC = 10 - ' + f2(vc_tau))}`)],
          solution: [sol('VR = E - VC', 'VR = 10 V - ' + f2(vc_tau) + ' V', 'VR = ' + f2(vr_tau) + ' V')],
          sim: { cfg: WARM, network: 'LP', mode: 'full', showTau: true, cursor: 10 }
        },
        {
          id: 's1-full', type: 'mc', skill: 'concept', pts: 2, titleHe: 'אחרי חמישה קבועי זמן',
          bodyHe: `<p class="do">גררו את הסמן אל ${L('t = 50 ms')}, כלומר ${L('5τ')}.</p><p class="ask">מה נכון לגבי המעגל ברגע הזה?</p>`,
          options: [
            opt(`הקבל כמעט מלא (${L('VC ≈ 10 V')}), כמעט אין זרם, והקבל מתנהג כמו נתק`, `נכון. אחרי ${L('5τ')} מתייחסים לקבל כטעון במלואו.`, true),
            opt('הקבל מלא, ולכן הזרם בחוג מרבי', `להפך: כשהקבל מלא ${L('VR = 0')}, ולכן אין זרם.`),
            opt(`המתח על הקבל ממשיך לעלות מעבר ל-${L('10 V')}`, 'הקבל לא יכול להיטען מעבר למתח המקור.')
          ],
          sim: { cfg: WARM, network: 'LP', mode: 'full', showTau: true }
        }
      ]
    };

    // ---------- station 2: LP and HP ----------
    const hp10 = vo(BOTH, 'HP', 10);
    const lp10 = vo(BOTH, 'LP', 10);
    const hp30b = vo(BOTH, 'HP', 30, 'before');
    const hp30a = vo(BOTH, 'HP', 30, 'after');
    const s2 = {
      id: 's2', short: `${T('LP')} ו-${T('HP')}`, title: 'אותו מעגל, שני מוצאים', img: 'st-sim',
      introHe: 'ההבדל בין שתי הרשתות הוא רק מאיפה לוקחים את המוצא.',
      steps: [
        {
          id: 's2-idea', type: 'info', titleHe: 'מאיפה לוקחים את המוצא?',
          bodyHe: `<p>במעגל ${T('RC')} טורי יש שתי אפשרויות:</p>
            <ul><li>המוצא על <b>הקבל</b>: רשת ${T('LP')}.</li><li>המוצא על <b>הנגד</b>: רשת ${T('HP')}.</li></ul>
            <p>זה אותו מעגל ואותו זרם, ולכן בכל רגע:</p>
            <div class="eq">${L('Vo(LP) + Vo(HP) = Vi')}</div>`,
          sim: { cfg: BOTH, network: 'BOTH', mode: 'full', hidden: true }
        },
        {
          id: 's2-play', type: 'sim', task: 'play', titleHe: 'דופק במבוא',
          bodyHe: `<p>הפעם המבוא הוא דופק: ${L('10 V')} מ-${L('t = 0')} עד ${L('t = 30 ms')}, ואז חזרה לאפס.</p>
            <p class="do">לחצו על <b>▶ הפעל</b>. ירוק הוא המוצא של ${T('LP')}, אדום הוא המוצא של ${T('HP')}.</p>`,
          afterHe: 'שני המוצאים נראים שונים מאוד, אף שזה אותו מעגל בדיוק.',
          sim: { cfg: BOTH, network: 'BOTH', mode: 'full', hidden: true }
        },
        {
          id: 's2-jump', type: 'mc', skill: 'hpjump', pts: 2, titleHe: 'מה קורה ברגע הקפיצה?',
          bodyHe: `<p class="ask">ברגע שהמבוא קופץ מאפס אל ${L('10 V')}, מה קורה למוצאים?</p>`,
          options: [
            opt(`מוצא ${T('HP')} קופץ מיד אל ${L('10 V')}; מוצא ${T('LP')} נשאר אפס ומתחיל לעלות`, 'נכון. המתח על קבל לא משתנה ברגע אחד, ולכן כל הקפיצה מופיעה על הנגד.', true),
            opt(`שני המוצאים קופצים אל ${L('10 V')}`, `אם שניהם היו ${L('10 V')} הסכום היה ${L('20 V')}, אבל הסכום חייב להיות ${L('Vi = 10 V')}.`),
            opt(`מוצא ${T('LP')} קופץ אל ${L('10 V')}; מוצא ${T('HP')} נשאר אפס`, `מוצא ${T('LP')} הוא המתח על הקבל, והוא לא יכול לקפוץ.`)
          ],
          sim: { cfg: BOTH, network: 'BOTH', mode: 'full' }
        },
        {
          id: 's2-read', type: 'num', skill: 'read', pts: 2, titleHe: 'מודדים את שני המוצאים',
          bodyHe: `<p class="do">העבירו את הסמן אל ${L('t = 10 ms')}.</p><p class="ask">מה מוצא ${T('HP')} (המתח על הנגד) ברגע הזה?</p>`,
          unit: 'V', expected: hp10, tolAbs: 0.12,
          traps: [{ value: lp10, messageHe: `זה מוצא ${T('LP')} (המתח על הקבל). ביקשו את השורה ${L('VR')}.` }],
          hints: [hint(1, `הקלידו ${L('10')} בתיבה ${L('t =')} וקראו את השורה ${L('VR')} בלוח המדידות.`)],
          solution: [sol('Vo(HP) = Vi · e^(-Δt/τ)', 'Vo(HP) = 10 V · e^(-10/10)', 'Vo(HP) = ' + f2(hp10) + ' V')],
          afterHe: `ומוצא ${T('LP')} באותו רגע הוא ${L(f2(lp10) + ' V')}. יחד: ${L(f2(hp10) + ' + ' + f2(lp10) + ' = 10 V')}, בדיוק המבוא.`,
          sim: { cfg: BOTH, network: 'BOTH', mode: 'full' }
        },
        {
          id: 's2-neg', type: 'mc', skill: 'hpjump', pts: 2, titleHe: 'סוף הדופק',
          bodyHe: `<p>ב-${L('t = 30 ms')} המבוא יורד חזרה לאפס.</p><p class="do">הזיזו את הסמן קצת אחרי ${L('30 ms')}.</p><p class="ask">מה קרה למוצא ${T('HP')}?</p>`,
          options: [
            opt('הוא קפץ אל מתח שלילי, ומשם הוא חוזר בהדרגה לאפס', `נכון. המבוא ירד ב-${L('10 V')}, ולכן גם המוצא יורד ב-${L('10 V')} בבת אחת: מ-${L(f2(hp30b) + ' V')} אל ${L(f2(hp30a) + ' V')}.`, true),
            opt('הוא ירד בדיוק לאפס ונשאר שם', `המוצא יורד ב-${L('10 V')} מהערך שבו היה (${L(f2(hp30b) + ' V')}), ולכן הוא עובר את האפס.`),
            opt('הוא נשאר חיובי וממשיך לדעוך', `ברגע שהמבוא קופץ, מוצא ${T('HP')} קופץ יחד איתו.`)
          ],
          afterHe: `זה כלל הקפיצה של ${T('HP')}: ${L('Vo(t⁺) = Vo(t⁻) + ΔVi')}. מוצא שלילי, אף שהמבוא לא היה שלילי אף פעם.`,
          sim: { cfg: BOTH, network: 'BOTH', mode: 'full' }
        },
        {
          id: 's2-tools', type: 'info', titleHe: 'ארגז הכלים לבגרות', img: 'formula',
          bodyHe: `<p>מכאן והלאה עובדים כמו בבגרות: מחשבים, מקלידים תשובה, והסימולטור מאשר.</p>
            <p>בכל שלב אפשר לפתוח את <b>דף הנוסחאות</b> (הכפתור למעלה) בלי לאבד נקודות. רמז עולה נקודות, והמחיר כתוב על הכפתור.</p>
            <div class="eq">${L('Vo(t) = Vf + (V0 - Vf) · e^(-Δt/τ)')}</div>
            <p>${L('V0')} הוא הערך בתחילת הקטע, ${L('Vf')} הוא הערך שאליו המוצא שואף, ו-${L('Δt')} נמדד מתחילת הקטע.</p>`,
          sim: { cfg: BOTH, network: 'BOTH', mode: 'full' }
        }
      ]
    };

    // ---------- station 3: bagrut 2021 Q5 (LP) ----------
    const a_max = vo(Q2021, 'LP', 10);
    const a_15 = vo(Q2021, 'LP', 15);
    const a_half = vo(Q2021_HALF, 'LP', 10);
    const a_hit = tHit(Q2021, 'LP', 2.5, 5);
    const s3 = {
      id: 's3', short: 'בגרות 2021', title: `בגרות 2021, שאלה 5: רשת ${T('LP')}`, img: 'st-lp',
      introHe: 'שאלה מקורית משאלון 815381, קיץ תשפ"א. פותרים אותה סעיף אחרי סעיף.',
      question: {
        sourceHe: 'שאלון 815381, קיץ תשפ"א (2021), שאלה 5',
        figs: [{ src: 'bagrut-2021-q5-a.png', cap: 'איור א\' לשאלה' }, { src: 'bagrut-2021-q5-b.png', cap: 'איור ב\' לשאלה' }],
        textHe: `<p>באיור א' מתוארת רשת חשמלית. לרשת זו מספקים את הדופק המתואר באיור ב'.</p>
          <ol class="heb"><li>סרטטו את צורת מתח המוצא ${L('Vo')} כפונקצייה של הזמן, מתחת לצורת מתח המבוא.</li>
          <li>חשבו את ערכו המרבי של מתח המוצא ${L('Vo')}.</li>
          <li>חשבו את מתח המוצא ${L('Vo')} כאשר ${L('t = 15 msec')}.</li>
          <li>מקטינים פי שניים את התנגדות הנגד ${L('R')}. האם הערך המרבי של ${L('Vo')} יגדל או יקטן? נמקו.</li></ol>`
      },
      steps: [
        {
          id: 's3-play', type: 'sim', task: 'play', titleHe: 'סעיף א: רואים את המוצא',
          bodyHe: `<p>המעגל של השאלה כבר טעון בסימולטור: ${L('R = 4 kΩ')}, ${L('C = 2 µF')}, והמוצא על הקבל.</p><p class="do">לחצו על <b>▶ הפעל</b> וצפו בצורת המוצא.</p>`,
          afterHe: 'מעכשיו לוח המדידות נעול: את הערכים מחשבים, והסימולטור יסמן כל תשובה נכונה על הגרף.',
          sim: { cfg: Q2021, network: 'LP', mode: 'graph', hidden: true }
        },
        {
          id: 's3-shape', type: 'mc', skill: 'concept', pts: 3, titleHe: 'סעיף א: צורת המוצא',
          bodyHe: `<p class="ask">איזה תיאור מתאים לסרטוט של ${L('Vo')}?</p>`,
          options: [
            opt(`בזמן הדופק ${L('Vo')} עולה בעקומה לכיוון ${L('5 V')} ולא מספיק להגיע; אחרי הדופק הוא יורד בעקומה לאפס`, `נכון. ב-${T('LP')} המוצא הוא המתח על הקבל: טעינה בזמן הדופק, פריקה אחריו, בלי קפיצות.`, true),
            opt(`${L('Vo')} קופץ אל ${L('5 V')} ונשאר שם עד סוף הדופק`, 'זה תיאור של המבוא. המתח על הקבל לא יכול לקפוץ.'),
            opt(`${L('Vo')} קופץ אל ${L('5 V')}, דועך, ובסוף הדופק קופץ אל מתח שלילי`, `זו התנהגות של רשת ${T('HP')}. כאן המוצא על הקבל.`),
            opt(`${L('Vo')} עולה בקו ישר עד ${L('5 V')} ויורד בקו ישר`, 'טעינה ופריקה של קבל הן מעריכיות: מהירות בהתחלה ומאטות.')
          ],
          sim: { cfg: Q2021, network: 'LP', mode: 'graph' }
        },
        {
          id: 's3-tau', type: 'num', skill: 'tau', pts: 4, titleHe: 'קבוע הזמן',
          bodyHe: `<p>לפני כל חישוב ברשת ${T('RC')} מוצאים את קבוע הזמן.</p><p class="ask">חשבו את ${L('τ')}.</p>`,
          unit: 'ms', expected: 8,
          traps: [{ value: 0.008, messageHe: `זה הערך בשניות. התשובה מבוקשת ב-${L('ms')}.` }],
          hints: [hint(1, `${L('τ = R · C')}. קראו את ${L('R')} ואת ${L('C')} מאיור א'.`), hint(1, `${L('τ = 4 kΩ · 2 µF')}, וזכרו: ${L('kΩ · µF = ms')}`)],
          solution: [sol('τ = R · C', 'τ = 4 kΩ · 2 µF', 'τ = 8 ms')],
          sim: { cfg: Q2021, network: 'LP', mode: 'graph', showTau: true }
        },
        {
          id: 's3-when', type: 'mc', skill: 'concept', pts: 3, titleHe: 'סעיף ב: מתי המוצא מרבי?',
          bodyHe: `<p>סעיף ב מבקש את הערך המרבי של ${L('Vo')}. קודם צריך לדעת מתי הוא מתקבל.</p><p class="ask">באיזה רגע המוצא מרבי?</p>`,
          options: [
            opt(`בסוף הדופק, ${L('t = 10 ms')}`, 'נכון. כל זמן הדופק הקבל נטען, ומיד אחריו הוא מתחיל להתפרק.', true),
            opt(`אחרי ${L('5τ = 40 ms')}`, `הדופק נגמר כבר ב-${L('10 ms')}, ומשם המוצא רק יורד.`),
            opt(`מיד עם הקפיצה, ${L('t = 0⁺')}`, `ב-${L('t = 0⁺')} הקבל עדיין ריק: ${L('Vo = 0')}.`),
            opt(`אחרי קבוע זמן אחד, ${L('t = 8 ms')}`, `ב-${L('8 ms')} הקבל עדיין נטען, והוא ממשיך לעלות עד סוף הדופק.`)
          ],
          sim: { cfg: Q2021, network: 'LP', mode: 'graph', showTau: true }
        },
        {
          id: 's3-max', type: 'num', skill: 'charge', pts: 6, titleHe: 'סעיף ב: הערך המרבי',
          bodyHe: `<p class="ask">חשבו את הערך המרבי של ${L('Vo')}, כלומר את ${L('Vo')} ב-${L('t = 10 ms')}.</p>`,
          unit: 'V', expected: a_max,
          traps: [
            { value: 5 * Math.exp(-1.25), messageHe: `חישבתם ${L('5 · e^(-1.25)')}: זה מה שנשאר על הנגד. המוצא כאן על הקבל: ${L('5 · (1 - e^(-1.25))')}.` },
            { value: 5 * (1 - Math.exp(-0.8)), messageHe: `בדקו את המעריך: ${L('Δt/τ = 10/8')}, ולא ${L('8/10')}.` },
            { value: 5, messageHe: `הקבל לא מספיק להיטען עד ${L('5 V')}: הדופק נמשך רק ${L('10 ms')}, קצת יותר מקבוע זמן אחד.` }
          ],
          hints: [
            hint(1, `הקבל נטען מאפס לכיוון ${L('Vi = 5 V')}. נוסחת הטעינה: ${L('Vo = Vi · (1 - e^(-Δt/τ))')}`),
            hint(2, `מציבים ${L('Δt = 10 ms')} ו-${L('τ = 8 ms')}: ${L('Vo = 5 · (1 - e^(-10/8))')}`),
            hint(2, `${L('e^(-1.25) = 0.2865')}`)
          ],
          solution: [sol('Vo = Vi · (1 - e^(-Δt/τ))', 'Vo(10ms) = 5 V · (1 - e^(-10/8))', 'Vo(10ms) = ' + f2(a_max) + ' V')],
          pin: { t: 10, v: a_max, label: f2(a_max) + 'V' },
          sim: { cfg: Q2021, network: 'LP', mode: 'graph', showTau: true }
        },
        {
          id: 's3-15', type: 'num', skill: 'discharge', pts: 6, titleHe: 'סעיף ג: המוצא אחרי הדופק',
          bodyHe: `<p class="ask">חשבו את ${L('Vo')} כאשר ${L('t = 15 ms')}.</p>`,
          unit: 'V', expected: a_15,
          traps: [
            { value: a_max * Math.exp(-15 / 8), messageHe: `השתמשתם ב-${L('Δt = 15 ms')}. הזמן נמדד מתחילת הפריקה (${L('t = 10 ms')}): ${L('Δt = 5 ms')}.` },
            { value: 5 * Math.exp(-5 / 8), messageHe: `הפריקה מתחילה מהמתח שהקבל הגיע אליו, ${L(f2(a_max) + ' V')}, ולא מ-${L('5 V')}.` },
            { value: 5 * (1 - Math.exp(-15 / 8)), messageHe: `ב-${L('t = 15 ms')} הדופק כבר נגמר: ${L('Vi = 0')}, והקבל מתפרק ולא נטען.` }
          ],
          hints: [
            hint(1, `ב-${L('t = 15 ms')} הדופק כבר נגמר: ${L('Vi = 0')} והקבל מתפרק. נוסחת הפריקה: ${L('Vo = V0 · e^(-Δt/τ)')}`),
            hint(2, `${L('V0')} הוא המתח שממנו מתחילה הפריקה, כלומר הערך המרבי שמצאתם. ${L('Δt')} נמדד מתחילת הפריקה: ${L('Δt = 15 - 10 = 5 ms')}`),
            hint(2, `${L('Vo = ' + f2(a_max) + ' · e^(-5/8)')}, ו-${L('e^(-0.625) = 0.5353')}`)
          ],
          solution: [sol('Vo = V0 · e^(-Δt/τ)', 'Δt = 15 ms - 10 ms = 5 ms', 'Vo(15ms) = ' + f2(a_max) + ' V · e^(-5/8) = ' + f2(a_15) + ' V')],
          pin: { t: 15, v: a_15, label: f2(a_15) + 'V' },
          sim: { cfg: Q2021, network: 'LP', mode: 'graph', showTau: true, keepPins: true }
        },
        {
          id: 's3-half', type: 'mc', skill: 'rchange', pts: 3, titleHe: 'סעיף ד: מקטינים את הנגד',
          bodyHe: `<p>מקטינים פי שניים את ${L('R')}, כלומר ${L('R = 2 kΩ')}.</p><p class="ask">האם הערך המרבי של ${L('Vo')} יגדל או יקטן, ולמה?</p>`,
          options: [
            opt(`יגדל: ${L('τ')} קטן לחצי, הקבל נטען מהר יותר ומספיק להתקרב יותר אל ${L('5 V')} עד סוף הדופק`, 'נכון, וזה גם הנימוק שמצפים לו בבגרות.', true),
            opt('יקטן: על נגד קטן יותר נופל פחות מתח, ולכן גם המוצא קטן', `המוצא כאן הוא על הקבל. נגד קטן מאפשר זרם טעינה גדול יותר, והקבל נטען מהר יותר.`),
            opt('לא ישתנה: הערך המרבי תלוי רק בגובה הדופק', `הוא תלוי גם ביחס בין רוחב הדופק לבין ${L('τ')}: בכמה קבועי זמן הקבל מספיק להיטען.`)
          ],
          sim: { cfg: Q2021, network: 'LP', mode: 'graph', showTau: true, keepPins: true }
        },
        {
          id: 's3-halfmax', type: 'num', skill: 'rchange', pts: 4, titleHe: 'סעיף ד: בודקים במספרים',
          bodyHe: `<p>הסימולטור עודכן ל-${L('R = 2 kΩ')}. אפשר ללחוץ <b>▶ הפעל</b> ולהשוות.</p><p class="ask">חשבו את הערך המרבי החדש של ${L('Vo')}.</p>`,
          unit: 'V', expected: a_half,
          traps: [{ value: a_max, messageHe: `זה הערך עם ${L('R = 4 kΩ')}. עכשיו ${L('R = 2 kΩ')}, ולכן ${L('τ')} השתנה.` }],
          hints: [hint(1, `קבוע הזמן החדש: ${L('τ = 2 kΩ · 2 µF = 4 ms')}`), hint(2, `${L('Vo = 5 · (1 - e^(-10/4))')}, ו-${L('e^(-2.5) = 0.0821')}`)],
          solution: [sol('τ = R · C  ;  Vo = Vi · (1 - e^(-Δt/τ))', 'τ = 2 kΩ · 2 µF = 4 ms', 'Vo(10ms) = 5 V · (1 - e^(-10/4)) = ' + f2(a_half) + ' V')],
          pin: { t: 10, v: a_half, label: f2(a_half) + 'V' },
          afterHe: `מ-${L(f2(a_max) + ' V')} אל ${L(f2(a_half) + ' V')}: הערך המרבי אכן גדל.`,
          sim: { cfg: Q2021_HALF, network: 'LP', mode: 'graph', showTau: true }
        },
        {
          id: 's3-time', type: 'num', skill: 'time', pts: 5, titleHe: `העמקה: מתי המוצא מגיע אל ${L('2.5 V')}?`, tagHe: 'העמקה, לא בשאלון',
          bodyHe: `<p>חוזרים למעגל המקורי, ${L('R = 4 kΩ')}.</p><p class="ask">באיזה זמן ${L('t')}, בזמן הדופק, מגיע ${L('Vo')} אל ${L('2.5 V')}?</p>`,
          unit: 'ms', expected: a_hit.t, isTime: true, dt: a_hit.dt,
          traps: [{ value: 5, messageHe: `חצי מהמתח לא מתקבל בחצי מהזמן: העקומה מעריכית, לא קו ישר. השתמשו בנוסחת הזמן.` }],
          hints: [
            hint(1, `נוסחת הזמן: ${L('Δt = τ · ln((V0 - Vf) / (V - Vf))')}. כאן ${L('V0 = 0')}, ${L('Vf = 5 V')} ו-${L('V = 2.5 V')}`),
            hint(2, `${L('Δt = 8 · ln((0 - 5) / (2.5 - 5)) = 8 · ln(2)')}`),
            hint(2, `${L('ln(2) = 0.693')}`)
          ],
          solution: [sol('Δt = τ · ln((V0 - Vf) / (V - Vf))', 'Δt = 8 ms · ln((0 - 5) / (2.5 - 5)) = 8 ms · ln(2)', 't = 0 + ' + f2(a_hit.dt) + ' ms = ' + f2(a_hit.t) + ' ms')],
          pin: { t: a_hit.t, v: 2.5, label: 't = ' + f2(a_hit.t) + 'ms', line: 2.5 },
          sim: { cfg: Q2021, network: 'LP', mode: 'graph', showTau: true, line: 2.5 }
        }
      ]
    };

    // ---------- station 4: bagrut 2016 Q2 (HP) ----------
    const b_0 = vo(Q2016, 'HP', 0, 'after');
    const b_2 = vo(Q2016, 'HP', 2);
    const b_3b = vo(Q2016, 'HP', 3, 'before');
    const b_3a = vo(Q2016, 'HP', 3, 'after');
    const b_4 = vo(Q2016, 'HP', 4);
    const b_hit = tHit(Q2016, 'HP', -1, 5);
    const s4 = {
      id: 's4', short: 'בגרות 2016', title: `בגרות 2016, שאלה 2: רשת ${T('HP')}`, img: 'st-hp',
      introHe: 'שאלה מקורית משאלון 815381, קיץ תשע"ו. כאן המוצא על הנגד, ולכן יש קפיצות.',
      question: {
        sourceHe: 'שאלון 815381, קיץ תשע"ו (2016), שאלה 2',
        figs: [{ src: 'bagrut-2016-q2-a.png', cap: 'איור א\' לשאלה' }, { src: 'bagrut-2016-q2-b.png', cap: 'איור ב\' לשאלה' }],
        textHe: `<p>באיור א' מתוארת רשת חשמלית. למבוא הרשת מספקים את האות המתואר באיור ב'.</p>
          <ol class="heb"><li>סרטטו את מתח המוצא ${L('Vo')} כפונקצייה של הזמן, מתחת למתח המבוא.</li>
          <li>חשבו את מתח המוצא בזמן ${L('t = 2 msec')} ובזמן ${L('t = 4 msec')}.</li></ol>`
      },
      steps: [
        {
          id: 's4-play', type: 'sim', task: 'play', titleHe: 'סעיף א: רואים את המוצא',
          bodyHe: `<p>המעגל של השאלה טעון בסימולטור: ${L('C = 2 µF')}, ${L('R = 1 kΩ')}. שימו לב: כאן המוצא על <b>הנגד</b>.</p><p class="do">לחצו על <b>▶ הפעל</b>.</p>`,
          sim: { cfg: Q2016, network: 'HP', mode: 'graph', hidden: true }
        },
        {
          id: 's4-shape', type: 'mc', skill: 'concept', pts: 3, titleHe: 'סעיף א: צורת המוצא',
          bodyHe: `<p class="ask">איזה תיאור מתאים לסרטוט של ${L('Vo')}?</p>`,
          options: [
            opt(`${L('Vo')} קופץ אל ${L('6 V')} ודועך לכיוון אפס; ב-${L('t = 3 ms')} הוא קופץ כלפי מטה ב-${L('6 V')} אל מתח שלילי, ומשם חוזר בהדרגה לאפס`, 'נכון. שתי קפיצות, ואחרי כל אחת דעיכה אל אפס.', true),
            opt(`${L('Vo')} עולה בהדרגה לכיוון ${L('6 V')}, ואחרי הדופק יורד בהדרגה לאפס`, `זו התנהגות של רשת ${T('LP')}. כאן המוצא על הנגד.`),
            opt(`${L('Vo')} קופץ אל ${L('6 V')}, דועך, ובסוף הדופק יורד בדיוק לאפס ונשאר שם`, `בסוף הדופק המוצא יורד ב-${L('6 V')} שלמים מהערך שבו היה, ולכן הוא עובר את האפס.`),
            opt(`${L('Vo')} זהה למבוא: ${L('6 V')} בזמן הדופק ואפס אחריו`, `הקבל נטען בזמן הדופק, ולכן המתח על הנגד דועך.`)
          ],
          sim: { cfg: Q2016, network: 'HP', mode: 'graph' }
        },
        {
          id: 's4-tau', type: 'num', skill: 'tau', pts: 3, titleHe: 'קבוע הזמן',
          bodyHe: `<p class="ask">חשבו את ${L('τ')}.</p>`,
          unit: 'ms', expected: 2,
          traps: [{ value: 0.002, messageHe: `זה הערך בשניות. התשובה מבוקשת ב-${L('ms')}.` }],
          hints: [hint(1, `${L('τ = R · C = 1 kΩ · 2 µF')}`)],
          solution: [sol('τ = R · C', 'τ = 1 kΩ · 2 µF', 'τ = 2 ms')],
          sim: { cfg: Q2016, network: 'HP', mode: 'graph', showTau: true }
        },
        {
          id: 's4-jump0', type: 'num', skill: 'hpjump', pts: 3, titleHe: 'מיד אחרי הקפיצה',
          bodyHe: `<p class="ask">מהו ${L('Vo')} מיד אחרי שהמבוא קופץ, ב-${L('t = 0⁺')}?</p>`,
          unit: 'V', expected: b_0,
          traps: [{ value: 0, messageHe: `אפס הוא המתח על הקבל ב-${L('t = 0⁺')}. המוצא כאן על הנגד.` }],
          hints: [hint(1, `המתח על הקבל לא משתנה ברגע אחד: ${L('VC(0⁺) = 0')}. לפי קירכהוף ${L('Vi = VC + VR')}.`)],
          solution: [sol('Vo(t⁺) = Vo(t⁻) + ΔVi', 'Vo(0⁺) = 0 V + 6 V', 'Vo(0⁺) = 6 V')],
          pin: { t: 0, v: b_0, label: f2(b_0) + 'V' },
          sim: { cfg: Q2016, network: 'HP', mode: 'graph', showTau: true }
        },
        {
          id: 's4-2', type: 'num', skill: 'hpdecay', pts: 5, titleHe: `סעיף ב: המוצא בזמן ${L('t = 2 ms')}`,
          bodyHe: `<p class="ask">חשבו את ${L('Vo')} בזמן ${L('t = 2 ms')}.</p>`,
          unit: 'V', expected: b_2,
          traps: [{ value: 6 * (1 - Math.exp(-1)), messageHe: `חישבתם את המתח על הקבל (רשת ${T('LP')}). ב-${T('HP')} המוצא דועך אל אפס: ${L('6 · e^(-1)')}.` }],
          hints: [
            hint(1, `ב-${T('HP')} המוצא דועך מהערך שאחרי הקפיצה לכיוון אפס: ${L('Vo = Vo(0⁺) · e^(-Δt/τ)')}`),
            hint(2, `${L('Vo = 6 · e^(-2/2) = 6 · e^(-1)')}`),
            hint(1, `${L('e^(-1) = 0.368')}`)
          ],
          solution: [sol('Vo = Vo(0⁺) · e^(-Δt/τ)', 'Vo(2ms) = 6 V · e^(-2/2)', 'Vo(2ms) = ' + f2(b_2) + ' V')],
          pin: { t: 2, v: b_2, label: f2(b_2) + 'V' },
          sim: { cfg: Q2016, network: 'HP', mode: 'graph', showTau: true, keepPins: true }
        },
        {
          id: 's4-3b', type: 'num', skill: 'hpdecay', pts: 4, titleHe: 'רגע לפני סוף הדופק',
          bodyHe: `<p>כדי לדעת מה קורה בסוף הדופק צריך קודם את המוצא רגע לפני הירידה.</p><p class="ask">חשבו את ${L('Vo')} ב-${L('t = 3 ms⁻')}.</p>`,
          unit: 'V', expected: b_3b,
          hints: [hint(1, `ממשיכים באותה דעיכה, עם ${L('Δt = 3 ms')}: ${L('Vo = 6 · e^(-3/2)')}`), hint(2, `${L('e^(-1.5) = 0.2231')}`)],
          solution: [sol('Vo = Vo(0⁺) · e^(-Δt/τ)', 'Vo(3ms⁻) = 6 V · e^(-3/2)', 'Vo(3ms⁻) = ' + f2(b_3b) + ' V')],
          pin: { t: 3, v: b_3b, label: f2(b_3b) + 'V' },
          sim: { cfg: Q2016, network: 'HP', mode: 'graph', showTau: true, keepPins: true }
        },
        {
          id: 's4-3a', type: 'num', skill: 'hpjump', pts: 5, titleHe: 'ומיד אחרי הירידה',
          bodyHe: `<p class="ask">חשבו את ${L('Vo')} ב-${L('t = 3 ms⁺')}, מיד אחרי שהמבוא ירד לאפס.</p>`,
          unit: 'V', expected: b_3a,
          traps: [
            { value: -6, messageHe: `טעות נפוצה ב-${T('HP')}: המוצא יורד ב-${L('6 V')} מהערך שאליו דעך (${L(f2(b_3b) + ' V')}), לא מאפס.` },
            { value: b_3b, messageHe: `זה הערך רגע לפני הירידה. עכשיו מוסיפים את הקפיצה ${L('ΔVi = -6 V')}.` }
          ],
          hints: [
            hint(1, `כלל הקפיצה ב-${T('HP')}: ${L('Vo(t⁺) = Vo(t⁻) + ΔVi')}`),
            hint(2, `${L('ΔVi = 0 - 6 = -6 V')}, ולכן ${L('Vo(3ms⁺) = ' + f2(b_3b) + ' + (-6)')}`)
          ],
          solution: [sol('Vo(t⁺) = Vo(t⁻) + ΔVi', 'Vo(3ms⁺) = ' + f2(b_3b) + ' V + (-6 V)', 'Vo(3ms⁺) = ' + f2(b_3a) + ' V')],
          pin: { t: 3, v: b_3a, label: f2(b_3a) + 'V' },
          afterHe: `מוצא שלילי, אף שהמבוא לא היה שלילי אף פעם. זו החתימה של רשת ${T('HP')}.`,
          sim: { cfg: Q2016, network: 'HP', mode: 'graph', showTau: true, keepPins: true }
        },
        {
          id: 's4-4', type: 'num', skill: 'hpdecay', pts: 5, titleHe: `סעיף ב: המוצא בזמן ${L('t = 4 ms')}`,
          bodyHe: `<p class="ask">חשבו את ${L('Vo')} בזמן ${L('t = 4 ms')}.</p>`,
          unit: 'V', expected: b_4,
          traps: [{ value: b_3a * Math.exp(-2), messageHe: `השתמשתם ב-${L('Δt = 4 ms')}. הזמן נמדד מתחילת הקטע (${L('t = 3 ms')}): ${L('Δt = 1 ms')}.` }],
          hints: [
            hint(1, `מ-${L(f2(b_3a) + ' V')} המוצא חוזר לכיוון אפס: ${L('Vo = Vo(3ms⁺) · e^(-Δt/τ)')}`),
            hint(2, `${L('Δt = 4 - 3 = 1 ms')}: ${L('Vo = ' + f2(b_3a) + ' · e^(-1/2)')}, ו-${L('e^(-0.5) = 0.6065')}`)
          ],
          solution: [sol('Vo = Vo(3ms⁺) · e^(-Δt/τ)', 'Δt = 4 ms - 3 ms = 1 ms', 'Vo(4ms) = ' + neg(b_3a) + ' V · e^(-1/2) = ' + f2(b_4) + ' V')],
          pin: { t: 4, v: b_4, label: f2(b_4) + 'V' },
          sim: { cfg: Q2016, network: 'HP', mode: 'graph', showTau: true, keepPins: true }
        },
        {
          id: 's4-time', type: 'num', skill: 'time', pts: 5, titleHe: `העמקה: מתי המוצא מגיע אל ${L('-1 V')}?`, tagHe: 'העמקה, לא בשאלון',
          bodyHe: `<p class="ask">באיזה זמן ${L('t')} מגיע ${L('Vo')} אל ${L('-1 V')}?</p>`,
          unit: 'ms', expected: b_hit.t, isTime: true, dt: b_hit.dt,
          hints: [
            hint(1, `נוסחת הזמן: ${L('Δt = τ · ln((V0 - Vf) / (V - Vf))')}, עם ${L('V0 = ' + f2(b_3a) + ' V')}, ${L('Vf = 0')} ו-${L('V = -1 V')}`),
            hint(2, `${L('Δt = 2 · ln(' + f2(-b_3a) + ' / 1)')}`),
            hint(1, `זה הזמן מתחילת הקטע. הקטע מתחיל ב-${L('t0 = 3 ms')}: ${L('t = t0 + Δt')}`)
          ],
          solution: [sol('Δt = τ · ln((V0 - Vf) / (V - Vf))', 'Δt = 2 ms · ln(' + neg(b_3a) + ' / (-1)) = ' + f2(b_hit.dt) + ' ms', 't = 3 ms + ' + f2(b_hit.dt) + ' ms = ' + f2(b_hit.t) + ' ms')],
          pin: { t: b_hit.t, v: -1, label: 't = ' + f2(b_hit.t) + 'ms', line: -1 },
          sim: { cfg: Q2016, network: 'HP', mode: 'graph', showTau: true, keepPins: true, line: -1 }
        }
      ]
    };

    // ---------- station 5: the personal question ----------
    const PC = cfg('BOTH', P.R, P.C, [-0.15 * (P.t2 + P.tau), P.t2 + 2.2 * P.tau], [[0, P.E], [P.Tp, 0]]);
    const tauS = g(P.tau), TpS = g(P.Tp), t2S = g(P.t2), ES = g(P.E), VtS = g(P.Vt);
    const dt2 = Number((P.t2 - P.Tp).toFixed(3)), dt2S = g(dt2);
    const p_lpmax = vo(PC, 'LP', P.Tp);
    const p_lp2 = vo(PC, 'LP', P.t2);
    const p_hit = tHit(PC, 'LP', P.Vt, P.Tp / 2);
    const p_hpb = vo(PC, 'HP', P.Tp, 'before');
    const p_hpa = vo(PC, 'HP', P.Tp, 'after');
    const p_hp2 = vo(PC, 'HP', P.t2);
    const s5 = {
      id: 's5', short: 'משימה אישית', title: 'המשימה האישית שלך', img: 'st-final',
      introHe: 'אותו סוג שאלה, עם רכיבים שרק לך יש. כאן הרמזים יקרים יותר.',
      question: {
        sourceHe: 'שאלה בסגנון בגרות, עם נתונים אישיים',
        personal: true,
        textHe: `<p>נתון מעגל ${T('RC')} טורי עם ${L('R = ' + g(P.R) + ' kΩ')} ו-${L('C = ' + g(P.C) + ' µF')}. הקבל ריק.</p>
          <p>למבוא מספקים דופק בגובה ${L(ES + ' V')}: הוא מתחיל ב-${L('t = 0')} ומסתיים ב-${L('t = ' + TpS + ' ms')}.</p>
          <p>בחלק א המוצא נלקח מהקבל (רשת ${T('LP')}). בחלק ב המוצא נלקח מהנגד (רשת ${T('HP')}), באותם רכיבים ובאותו דופק.</p>`
      },
      steps: [
        {
          id: 's5-tau', type: 'num', skill: 'tau', pts: 5, titleHe: 'קבוע הזמן',
          bodyHe: `<p class="ask">חשבו את ${L('τ')} של המעגל שלך.</p>`,
          unit: 'ms', expected: P.tau,
          traps: [{ value: P.tau / 1000, messageHe: `זה הערך בשניות. התשובה מבוקשת ב-${L('ms')}.` }],
          hints: [hint(2, `${L('τ = R · C')}, וזכרו: ${L('kΩ · µF = ms')}`)],
          solution: [sol('τ = R · C', 'τ = ' + g(P.R) + ' kΩ · ' + g(P.C) + ' µF', 'τ = ' + tauS + ' ms')],
          sim: { cfg: PC, network: 'LP', mode: 'graph', showTau: true }
        },
        {
          id: 's5-lpmax', type: 'num', skill: 'charge', pts: 8, titleHe: `חלק א: הערך המרבי ברשת ${T('LP')}`,
          bodyHe: `<p class="ask">חשבו את הערך המרבי של מתח המוצא ברשת ${T('LP')}.</p>`,
          unit: 'V', expected: p_lpmax,
          traps: [
            { value: P.E * Math.exp(-P.Tp / P.tau), messageHe: `זה המתח שנשאר על הנגד בסוף הדופק. המוצא כאן על הקבל.` },
            { value: P.E, messageHe: `הקבל לא מספיק להיטען עד ${L(ES + ' V')}: בדקו כמה קבועי זמן נמשך הדופק.` }
          ],
          hints: [
            hint(2, `המוצא מרבי בסוף הדופק. טעינה מאפס: ${L('Vo = Vi · (1 - e^(-Δt/τ))')}, עם ${L('Δt')} השווה לרוחב הדופק`),
            hint(3, `${L('Vo = ' + ES + ' · (1 - e^(-' + TpS + '/' + tauS + '))')}`)
          ],
          solution: [sol('Vo = Vi · (1 - e^(-Δt/τ))', 'Vo(' + TpS + 'ms) = ' + ES + ' V · (1 - e^(-' + TpS + '/' + tauS + '))', 'Vo(' + TpS + 'ms) = ' + f2(p_lpmax) + ' V')],
          pin: { t: P.Tp, v: p_lpmax, label: f2(p_lpmax) + 'V' },
          sim: { cfg: PC, network: 'LP', mode: 'graph', showTau: true }
        },
        {
          id: 's5-lp2', type: 'num', skill: 'discharge', pts: 8, titleHe: 'חלק א: המוצא אחרי הדופק',
          bodyHe: `<p class="ask">חשבו את מתח המוצא ברשת ${T('LP')} בזמן ${L('t = ' + t2S + ' ms')}.</p>`,
          unit: 'V', expected: p_lp2,
          traps: [
            { value: p_lpmax * Math.exp(-P.t2 / P.tau), messageHe: `השתמשתם ב-${L('Δt = ' + t2S + ' ms')}. הזמן נמדד מסוף הדופק: ${L('Δt = ' + t2S + ' - ' + TpS + ' = ' + dt2S + ' ms')}.` },
            { value: P.E * Math.exp(-dt2 / P.tau), messageHe: `הפריקה מתחילה מהמתח שהקבל הגיע אליו, ${L(f2(p_lpmax) + ' V')}, ולא מגובה הדופק.` }
          ],
          hints: [
            hint(2, `אחרי הדופק הקבל מתפרק מהערך המרבי שמצאתם: ${L('Vo = V0 · e^(-Δt/τ)')}. ${L('Δt')} נמדד מסוף הדופק`),
            hint(3, `${L('Vo = ' + f2(p_lpmax) + ' · e^(-' + dt2S + '/' + tauS + ')')}`)
          ],
          solution: [sol('Vo = V0 · e^(-Δt/τ)', 'Δt = ' + t2S + ' ms - ' + TpS + ' ms = ' + dt2S + ' ms', 'Vo(' + t2S + 'ms) = ' + f2(p_lpmax) + ' V · e^(-' + dt2S + '/' + tauS + ') = ' + f2(p_lp2) + ' V')],
          pin: { t: P.t2, v: p_lp2, label: f2(p_lp2) + 'V' },
          sim: { cfg: PC, network: 'LP', mode: 'graph', showTau: true, keepPins: true }
        },
        {
          id: 's5-time', type: 'num', skill: 'time', pts: 8, titleHe: 'חלק א: מתי המוצא מגיע למתח נתון?',
          bodyHe: `<p class="ask">באיזה זמן ${L('t')}, בזמן הדופק, מגיע מוצא רשת ${T('LP')} אל ${L(VtS + ' V')}?</p>`,
          unit: 'ms', expected: p_hit.t, isTime: true, dt: p_hit.dt,
          hints: [
            hint(2, `נוסחת הזמן: ${L('Δt = τ · ln((V0 - Vf) / (V - Vf))')}. בטעינה מאפס: ${L('V0 = 0')}, ו-${L('Vf')} הוא גובה הדופק`),
            hint(3, `${L('Δt = ' + tauS + ' · ln((0 - ' + ES + ') / (' + VtS + ' - ' + ES + '))')}`)
          ],
          solution: [sol('Δt = τ · ln((V0 - Vf) / (V - Vf))', 'Δt = ' + tauS + ' ms · ln((0 - ' + ES + ') / (' + VtS + ' - ' + ES + '))', 't = 0 + ' + f2(p_hit.dt) + ' ms = ' + f2(p_hit.t) + ' ms')],
          pin: { t: p_hit.t, v: P.Vt, label: 't = ' + f2(p_hit.t) + 'ms', line: P.Vt },
          sim: { cfg: PC, network: 'LP', mode: 'graph', showTau: true, keepPins: true, line: P.Vt }
        },
        {
          id: 's5-hpb', type: 'num', skill: 'hpdecay', pts: 6, titleHe: `חלק ב: רשת ${T('HP')}, רגע לפני סוף הדופק`,
          bodyHe: `<p>עכשיו המוצא נלקח מהנגד. הסימולטור עבר לרשת ${T('HP')}.</p><p class="ask">חשבו את מתח המוצא רגע לפני סוף הדופק, ב-${L('t = ' + TpS + ' ms⁻')}.</p>`,
          unit: 'V', expected: p_hpb,
          traps: [{ value: p_lpmax, messageHe: `זה מוצא רשת ${T('LP')} (המתח על הקבל). ב-${T('HP')} המוצא קופץ אל ${L(ES + ' V')} ודועך לכיוון אפס.` }],
          hints: [
            hint(2, `ב-${T('HP')} המוצא קופץ ב-${L('t = 0⁺')} אל גובה הדופק, ומשם דועך לכיוון אפס: ${L('Vo = Vo(0⁺) · e^(-Δt/τ)')}`),
            hint(3, `${L('Vo = ' + ES + ' · e^(-' + TpS + '/' + tauS + ')')}`)
          ],
          solution: [sol('Vo = Vo(0⁺) · e^(-Δt/τ)', 'Vo(' + TpS + 'ms⁻) = ' + ES + ' V · e^(-' + TpS + '/' + tauS + ')', 'Vo(' + TpS + 'ms⁻) = ' + f2(p_hpb) + ' V')],
          pin: { t: P.Tp, v: p_hpb, label: f2(p_hpb) + 'V' },
          sim: { cfg: PC, network: 'HP', mode: 'graph', showTau: true }
        },
        {
          id: 's5-hpa', type: 'num', skill: 'hpjump', pts: 8, titleHe: 'חלק ב: מיד אחרי סוף הדופק',
          bodyHe: `<p class="ask">חשבו את מתח המוצא ברשת ${T('HP')} מיד אחרי סוף הדופק, ב-${L('t = ' + TpS + ' ms⁺')}.</p>`,
          unit: 'V', expected: p_hpa,
          traps: [
            { value: -P.E, messageHe: `המוצא יורד ב-${L(ES + ' V')} מהערך שאליו דעך (${L(f2(p_hpb) + ' V')}), לא מאפס.` },
            { value: p_hpb, messageHe: `זה הערך רגע לפני הירידה. עכשיו מוסיפים את קפיצת המבוא.` }
          ],
          hints: [
            hint(2, `כלל הקפיצה ב-${T('HP')}: ${L('Vo(t⁺) = Vo(t⁻) + ΔVi')}`),
            hint(3, `${L('ΔVi = 0 - ' + ES + ' = -' + ES + ' V')}, ולכן ${L('Vo = ' + f2(p_hpb) + ' + (-' + ES + ')')}`)
          ],
          solution: [sol('Vo(t⁺) = Vo(t⁻) + ΔVi', 'Vo(' + TpS + 'ms⁺) = ' + f2(p_hpb) + ' V + (-' + ES + ' V)', 'Vo(' + TpS + 'ms⁺) = ' + f2(p_hpa) + ' V')],
          pin: { t: P.Tp, v: p_hpa, label: f2(p_hpa) + 'V' },
          sim: { cfg: PC, network: 'HP', mode: 'graph', showTau: true, keepPins: true }
        },
        {
          id: 's5-hp2', type: 'num', skill: 'hpdecay', pts: 7, titleHe: 'חלק ב: המוצא אחרי הדופק',
          bodyHe: `<p class="ask">חשבו את מתח המוצא ברשת ${T('HP')} בזמן ${L('t = ' + t2S + ' ms')}.</p>`,
          unit: 'V', expected: p_hp2,
          traps: [{ value: p_hpa * Math.exp(-P.t2 / P.tau), messageHe: `השתמשתם ב-${L('Δt = ' + t2S + ' ms')}. הזמן נמדד מסוף הדופק: ${L('Δt = ' + dt2S + ' ms')}.` }],
          hints: [
            hint(2, `מהערך שאחרי הקפיצה המוצא חוזר לכיוון אפס: ${L('Vo = Vo(t⁺) · e^(-Δt/τ)')}, ו-${L('Δt')} נמדד מסוף הדופק`),
            hint(3, `${L('Vo = ' + f2(p_hpa) + ' · e^(-' + dt2S + '/' + tauS + ')')}`)
          ],
          solution: [sol('Vo = Vo(t⁺) · e^(-Δt/τ)', 'Δt = ' + t2S + ' ms - ' + TpS + ' ms = ' + dt2S + ' ms', 'Vo(' + t2S + 'ms) = ' + neg(p_hpa) + ' V · e^(-' + dt2S + '/' + tauS + ') = ' + f2(p_hp2) + ' V')],
          pin: { t: P.t2, v: p_hp2, label: f2(p_hp2) + 'V' },
          sim: { cfg: PC, network: 'HP', mode: 'graph', showTau: true, keepPins: true }
        },
        {
          id: 's5-check', type: 'mc', skill: 'kvl', pts: 4, titleHe: 'בדיקה עצמית',
          bodyHe: `<p>חברו את שתי התשובות שלך לזמן ${L('t = ' + t2S + ' ms')}: מוצא ${T('LP')} ועוד מוצא ${T('HP')}.</p><p class="ask">מה צריך לצאת, ולמה?</p>`,
          options: [
            opt(`אפס, כי בכל רגע ${L('Vo(LP) + Vo(HP) = Vi')}, ואחרי הדופק ${L('Vi = 0')}`, `נכון: ${L(f2(p_lp2) + ' + ' + neg(p_hp2) + ' = 0')}. זו בדיקה שאפשר לעשות בכל שאלה שיש בה שני מוצאים.`, true),
            opt(`${L(ES + ' V')}, גובה הדופק`, `הסכום שווה למבוא באותו רגע, ואחרי הדופק המבוא הוא אפס.`),
            opt('אין קשר בין שתי התשובות', `יש קשר: לפי קירכהוף המתח על הקבל ועוד המתח על הנגד שווים למבוא.`)
          ],
          sim: { cfg: PC, network: 'BOTH', mode: 'graph', showTau: true }
        }
      ]
    };

    const stations = [s1, s2, s3, s4, s5];
    stations.forEach((st) => st.steps.forEach((sp) => {
      sp.station = st.id;
      if (!sp.pts) sp.pts = 0;
      if (sp.type === 'num' && !Number.isFinite(sp.expected)) throw new Error('guided content: no expected value for ' + sp.id);
      if (sp.type === 'mc' && sp.options.filter((o) => o.correct).length !== 1) throw new Error('guided content: ' + sp.id + ' needs exactly one correct option');
    }));
    return { stations, personalConfig: PC };
  }

  global.GuidedContent = {
    ACTIVITY_ID: 'u4-lp-hp-guided',
    ACTIVITY_TITLE: 'פעילות מודרכת: רשתות LP ו-HP ברמת בגרות',
    ACTIVITY_TITLE_HTML: 'פעילות מודרכת: רשתות <span class="nw"><bdi dir="ltr">LP</bdi> ו-<bdi dir="ltr">HP</bdi></span> ברמת בגרות',
    VERSION: 1,
    SKILLS,
    FORMULAS,
    makePersonal,
    build
  };
})(window);
