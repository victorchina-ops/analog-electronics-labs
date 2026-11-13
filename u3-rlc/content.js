/* ==========================================================================
   content.js — Complete Unit U3 Curriculum Content, Curated Exercises & Generators
   Unit U3: AC Series Circuits (Inductor L, RL, RC, RLC & Series Resonance)
   STRICT QUIZ PROTECTION: Excludes Bagrut 2021 Moed Nivzarim Q2, Quiz U3 Q2, and Short RLC Quiz
   ========================================================================== */
(function (root) {
  'use strict';

  const E = root.ACEngine;
  const L = E.L;
  const T = E.T;

  const UNIT_PREFIXES = [
    { name: 'מגה', sym: 'M', power: '× 10⁶', ex: `1 MΩ = ${E.L('1,000,000 Ω')}` },
    { name: 'קילו', sym: 'k', power: '× 10³', ex: `2 kHz = ${E.L('2,000 Hz')} | 1.2 kΩ = ${E.L('1,200 Ω')}` },
    { name: 'מילי', sym: 'm', power: '× 10⁻³', ex: `100 mH = ${E.L('0.1 H')} | 40 mA = ${E.L('0.04 A')}` },
    { name: 'מיקרו', sym: 'µ', power: '× 10⁻⁶', ex: `10 µF = ${E.L('10 × 10⁻⁶ F')}` },
    { name: 'ננו', sym: 'n', power: '× 10⁻⁹', ex: `265 nF = ${E.L('265 × 10⁻⁹ F')}` },
    { name: 'פיקו', sym: 'p', power: '× 10⁻¹²', ex: `100 pF = ${E.L('100 × 10⁻¹² F')}` }
  ];

  const PYTHAGOREAN_TRIPLES = [
    { ratio: '3 – 4 – 5', examples: '30 – 40 – 50  |  60 – 80 – 100', years: 'בגרות 2017, 2019, 2020' },
    { ratio: '5 – 12 – 13', examples: '50 – 120 – 130  |  25 – 60 – 65', years: 'בגרות 2022' },
    { ratio: '7 – 24 – 25', examples: '7 – 24 – 25 V  |  140 – 480 – 500 Ω', years: 'בגרות 2023, 2025' },
    { ratio: '8 – 15 – 17', examples: '80 – 150 – 170 Ω  |  8 – 15 – 17 V', years: 'בגרות 2021' }
  ];

  const FORMULA_SECTIONS = [
    {
      title: '1. אות הסינוס: משרעת, אפקטיבי (RMS) ותדירות זוויתית',
      rows: [
        { desc: 'משוואת מתח רגעי', formula: 'u(t) = Um · sin(ω·t)', note: `זיהוי מהיר מתוך פונקציית הסינוס` },
        { desc: 'מתח אפקטיבי (מד אוניברסלי)', formula: 'U = Ueff = Um / √2 ≈ 0.707 · Um', note: `אם כתוב ${L('25·√2·sin(...)')} אז ${L('Ueff = 25 V')}` },
        { desc: 'מתח שיא-לשיא (ממשקף)', formula: 'Up-p = 2 · Um = 2·√2 · Ueff', note: `בבגרות: קרא משבצות ${L('Volt/div')} וחלק ב-${L('2√2')}` },
        { desc: 'תדירות זוויתית וזמן מחזור', formula: 'ω = 2π·f  |  T = 1 / f', note: `המקדם לפני ${L('t')} בסינוס הוא תמיד ${L('ω')}` }
      ]
    },
    {
      title: '2. היגב השראותי (L) והיגב קיבולי (C)',
      rows: [
        { desc: 'היגב המשרן (יחסי ישר ל-f)', formula: 'XL = 2π·f·L = ω·L  [Ω]', note: `ב-${L('DC (f=0)')} קצר; המתח מקדים את הזרם ב-${L('+90°')} (${T('ELI')})` },
        { desc: 'היגב הקבל (הפוך ל-f)', formula: 'XC = 1 / (2π·f·C) = 1 / (ω·C)  [Ω]', note: `זהירות! ה-${L('1')} במונה! הזרם מקדים את המתח ב-${L('-90°')} (${T('ICE')})` },
        { desc: 'קבוע הזמן של משרן ב-DC', formula: 'τ = L / R  [s]', note: `זמן התייצבות בזרם ישר: ${L('5τ')}` }
      ]
    },
    {
      title: '3. מעגלי RL, RC ו-RLC טוריים',
      rows: [
        { desc: 'היגב שקול של הענף הטורי', formula: 'X = XL − XC  [Ω]', note: `חיסור ולא חיבור כי ${L('+90°')} ו-${L('-90°')} מנוגדים` },
        { desc: 'עכבה כוללת (משולש העכבות)', formula: 'Z = √(R² + X²) = √(R² + (XL − XC)²)', note: `ב-${T('RL')}: ${L('XC=0')} | ב-${T('RC')}: ${L('XL=0')}` },
        { desc: 'חוק אוהם ומתחי הרכיבים', formula: 'I = U / Z  |  UR = I·R  |  UL = I·XL  |  UC = I·XC', note: `אסור לחלק ${L('U/R')} אלא אם אין משרן/קבל` },
        { desc: 'חיבור מתחים וקטורי (פיתגורס)', formula: 'U = √(UR² + (UL − UC)²)', note: `${L('UL')} או ${L('UC')} יכולים לעבור את ${L('U')}!` },
        { desc: 'זווית המופע φ בין U ל-I', formula: 'φ = tan⁻¹(X / R) = tan⁻¹((UL − UC) / UR)', note: `${L('φ > 0°')} השראי | ${L('φ < 0°')} קיבולי | ${L('φ = 0°')} אוהמי` }
      ]
    },
    {
      title: '4. תהודה טורית (Series Resonance)',
      rows: [
        { desc: 'תנאי התהודה', formula: 'XL = XC  ⇒  UL = UC  (UX = 0 V)', note: `שני ההיגבים המנוגדים מבטלים זה את זה` },
        { desc: 'תדר התהודה הטבעי', formula: 'f₀ = 1 / (2π·√(L·C))', note: `תלוי רק ב-${L('L')} וב-${L('C')} — לא ב-${L('R')}!` },
        { desc: 'מאפייני המעגל בתהודה', formula: 'Zmin = R  |  Imax = U / R  |  φ = 0°', note: `ב-${L('f < f₀')} אופי קיבולי; ב-${L('f > f₀')} אופי השראי` }
      ]
    }
  ];

  const PITFALLS = [
    {
      title: 'מלכודת 1: חיבור אריתמטי במקום פיתגורס',
      bad: 'Z = R + XL   |   U = UR + UL',
      good: 'Z = √(R² + X²)   |   U = √(UR² + (UL − UC)²)',
      why: `מתחי הנגד והרכיבים הראקטיביים נמצאים בהפרש פאזה של ${L('90°')}, ולכן מחברים אותם כצלעות משולש ישר-זווית — לעולם לא בסכום פשוט.`
    },
    {
      title: 'מלכודת 2: שכחת ה-1 במונה בנוסחת XC',
      bad: 'XC = 2π·f·C',
      good: 'XC = 1 / (2π·f·C) = 1 / (ω·C)',
      why: `הקבל הפוך למשרן: ככל שהתדר ${L('f')} גדל, ${L('XL')} גדל אך ${L('XC')} קטן! אל תשכחו לחלק את ה-${L('1')} במכפלה.`
    },
    {
      title: 'מלכודת 3: הצבת mH, µF, nF, kHz בלי המרה',
      bad: 'XL = 2π · 4 · 100   (missing ×10³ and ×10⁻³)',
      good: 'kHz → ×10³  |  mH → ×10⁻³  |  µF → ×10⁻⁶  |  nF → ×10⁻⁹',
      why: `היחידות ${L('Ω')}, ${L('Hz')}, ${L('H')}, ${L('F')} הן יחידות יסוד (MKS). אם תציבו ${L('µF')} בלי ${L('10⁻⁶')} תקבלו טעות של מיליון!`
    },
    {
      title: 'מלכודת 4: חיבור XL + XC במקום חיסור',
      bad: 'X = XL + XC   |   U = √(UR² + (UL + UC)²)',
      good: 'X = XL − XC   |   U = √(UR² + (UL − UC)²)',
      why: `המתח על המשרן (${L('+90°')}) והמתח על הקבל (${L('-90°')}) מצביעים לכיוונים הפוכים (${L('180°')}) — ולכן הם מקזזים זה את זה!`
    },
    {
      title: 'מלכודת 5: שכחת סימן המינוס ב-φ במעגל קיבולי',
      bad: 'RC:  φ = +61.93°',
      good: 'RC (XC > XL):  φ = −tan⁻¹(XC / R) < 0°',
      why: `סימן הזווית מציין את אופי המעגל: במעגל קיבולי הזרם מקדים את המתח (${T('ICE')}), ולכן ${L('φ')} שלילית.`
    },
    {
      title: 'מלכודת 6: שימוש ב-Umax במקום Ueff או I = U / R',
      bad: 'I = Um / Z   |   I = U / R  (RL / RC)',
      good: 'Ueff = Um / √2   ⇒   I = Ueff / Z',
      why: `שלושה כללי ברזל: (1) ממירים שיא לאפקטיבי; (2) זרם החוג כולו לפי ${L('Z')}; (3) ${L('I = UR / R')} תקף רק עבור מתח הנגד לבדו.`
    }
  ];

  const SINE_DECODER_CASES = {
    case_rms: {
      title: 'מקרה 1: נתון U או קריאת מד-מתח (V) — כבר אפקטיבי!',
      badge: 'ללא חלוקה ב-√2',
      expressionHtml: `<span class="eq-tok-um">U = 26 V</span> &nbsp;|&nbsp; <span style="color:var(--ur-color); font-weight:700;">V(meter) = 24 V (RMS)</span>`,
      descHtml: `כל <strong>מד-מתח ומד-זרם</strong> במעגלי <bdi dir="ltr" class="ltr-term">AC</bdi> בנוי למדוד ערך אפקטיבי (<bdi dir="ltr" class="ltr-term">RMS</bdi>). גם כאשר כתוב בשאלה סתם <bdi dir="ltr" class="ltr-inline">U = 26 V</bdi> או <bdi dir="ltr" class="ltr-inline">I = 0.5 A</bdi> (בלי <bdi dir="ltr" class="ltr-term">max</bdi> ובלי <bdi dir="ltr" class="ltr-inline">sin(...)</bdi>), הערך הוא <strong>כבר אפקטיבי</strong> — אסור לחלק ב-<bdi dir="ltr" class="ltr-inline">√2</bdi>!`,
      ueffResult: 'Ueff = U = 26 V',
      freqResult: 'f  |  ω = 2π·f',
      ruleLine: 'Rule: Meter reading (A/V) OR plain U, I  ⇒  ALREADY RMS (Ueff)! Do NOT divide by √2.'
    },
    case_eq_sqrt2: {
      title: 'מקרה 2א: משוואת סינוס עם שורש u(t) = Um·sin(ω·t)',
      badge: 'חלוקה ב-√2 וחילוץ ω',
      expressionHtml: `u(t) = <span class="eq-tok-um" title="Peak amplitude Um">25·√2</span> · sin(<span class="eq-tok-w" title="Angular frequency ω">2000</span>·t) [V]`,
      descHtml: `המספר שלפני ה-<bdi dir="ltr" class="ltr-term">sin</bdi> הוא תמיד <strong>משרעת השיא <bdi dir="ltr" class="ltr-inline">Um = 25·√2 V</bdi></strong>! לכן מחלקים ב-<bdi dir="ltr" class="ltr-inline">√2</bdi> ומקבלים מיד <bdi dir="ltr" class="ltr-inline">Ueff = 25 V</bdi>. המספר שלפני <bdi dir="ltr" class="ltr-inline">t</bdi> בתוך הסוגריים הוא <strong>התדירות הזוויתית <bdi dir="ltr" class="ltr-inline">ω = 2000 rad/s</bdi></strong> (שאפשר להציב ישר ב-<bdi dir="ltr" class="ltr-inline">XL = ω·L</bdi>!).`,
      ueffResult: 'Ueff = (25·√2) / √2 = 25 V',
      freqResult: 'ω = 2000 rad/s  ⇒  f = 2000/(2π) ≈ 318.3 Hz',
      ruleLine: 'u(t) = Um·sin(ω·t)  ⇒  Um = 25·√2 V  ⇒  Ueff = 25 V   |   ω = 2000 rad/s'
    },
    case_eq_num: {
      title: 'מקרה 2ב: משוואת סינוס מספרית u(t) = 311.13·sin(2π·1000·t)',
      badge: 'חלוקה ב-√2 וחילוץ f',
      expressionHtml: `u(t) = <span class="eq-tok-um" title="Peak amplitude Um">311.13</span> · sin(<span class="eq-tok-w" title="ω = 2π·f">2π·1000</span>·t) [V]`,
      descHtml: `גם כשאין <bdi dir="ltr" class="ltr-inline">√2</bdi> כתוב במפורש, המקדם של <bdi dir="ltr" class="ltr-term">sin</bdi> הוא עדיין <strong>מתח השיא <bdi dir="ltr" class="ltr-inline">Um = 311.13 V</bdi></strong>! מחלקים במחשבון: <bdi dir="ltr" class="ltr-inline">Ueff = 311.13 / √2 = 220 V</bdi>. ובתוך הסוגריים רואים <bdi dir="ltr" class="ltr-inline">2π·f</bdi>, כלומר <bdi dir="ltr" class="ltr-inline">f = 1000 Hz = 1 kHz</bdi>!`,
      ueffResult: 'Ueff = 311.13 / √2 = 220 V',
      freqResult: '2πf = 2π·1000  ⇒  f = 1000 Hz (1 kHz)',
      ruleLine: 'Um = 311.13 V ⇒ Ueff = 311.13 / √2 = 220 V   |   ω = 2π·1000 ⇒ f = 1 kHz'
    },
    case_upp: {
      title: 'מקרה 3: נתון מתח שיא-לשיא (Peak-to-Peak)',
      badge: 'חלוקה ב-2·√2',
      expressionHtml: `<span class="eq-tok-um">Up-p = 22.63 V</span> &nbsp;⇒&nbsp; Um = 11.31 V &nbsp;⇒&nbsp; <span style="color:var(--ur-color); font-weight:700;">Ueff = 8 V</span>`,
      descHtml: `מתח שיא-לשיא (<bdi dir="ltr" class="ltr-inline">Up-p</bdi>) הוא המרחק מהשיא החיובי לשיא השלילי, כלומר <bdi dir="ltr" class="ltr-inline">Up-p = 2·Um</bdi>. לכן חוצים ב-2 כדי להגיע לשיא <bdi dir="ltr" class="ltr-inline">Um</bdi>, ואז מחלקים ב-<bdi dir="ltr" class="ltr-inline">√2</bdi> — ובקיצור מחלקים ב-<bdi dir="ltr" class="ltr-inline">2·√2 ≈ 2.828</bdi>!`,
      ueffResult: 'Ueff = 22.63 / (2·√2) = 8 V',
      freqResult: 'f = 1 / T',
      ruleLine: 'Um = Up-p / 2 = 11.314 V   ⇒   Ueff = Um / √2 = Up-p / (2·√2) = 8.00 V'
    }
  };

  const INTRO_COMPONENTS = {
    R: {
      name: 'נגד אידיאלי (R)',
      formula: 'R [Ω] — קבוע, אינו תלוי בתדר f',
      phaseDeg: '0°',
      phaseDesc: 'המתח והזרם תמיד באותו מופע (עולים ויורדים יחד).',
      freqEffect: 'הכפלת התדר אינה משנה את R.',
      topology: 'RLC', R_ohm: 50, XL_ohm: 0, XC_ohm: 0, Ueff: 10, f_Hz: 1000
    },
    L: {
      name: 'משרן / סליל אידיאלי (L)',
      formula: 'XL = 2π·f·L = ω·L  [Ω]',
      phaseDeg: '+90° (ELI)',
      phaseDesc: `המתח ${L('uL')} מקדים את הזרם ${L('i')} ברבע מחזור (${L('+90°')}). זיכרון: ${T('ELI')} — L לפני I.`,
      freqEffect: `הכפלת התדר פי 2 מכפילה את ${L('XL')} פי 2 (פחות זרם).`,
      topology: 'RL', R_ohm: 0.01, XL_ohm: 100, XC_ohm: 0, Ueff: 10, f_Hz: 1000
    },
    C: {
      name: 'קבל אידיאלי (C)',
      formula: 'XC = 1 / (2π·f·C) = 1 / (ω·C)  [Ω]',
      phaseDeg: '-90° (ICE)',
      phaseDesc: `הזרם ${L('i')} מקדים את המתח ${L('uC')} ברבע מחזור (${L('-90°')}). זיכרון: ${T('ICE')} — I לפני E.`,
      freqEffect: `הכפלת התדר פי 2 מקטינה את ${L('XC')} פי 2 (יותר זרם).`,
      topology: 'RC', R_ohm: 0.01, XL_ohm: 0, XC_ohm: 100, Ueff: 10, f_Hz: 1000
    }
  };

  const INTRO_RLC_MODES = {
    inductive: {
      title: `אופי השראי (${L('XL > XC')} ← ${L('φ > 0°')})`,
      desc: `היגב המשרן גדול מהיגב הקבל (${L('XL = 100 Ω > XC = 40 Ω')}), ולכן ${L('UL = 50 V > UC = 20 V')}. הווקטור השקול מצביע למעלה: המתח מקדים את הזרם (${T('ELI')}).`,
      cfg: { topology: 'RLC', inputMode: 'reactances', Ueff: 50, f_Hz: 1000, R_ohm: 80, XL_ohm: 100, XC_ohm: 40 }
    },
    capacitive: {
      title: `אופי קיבולי (${L('XC > XL')} ← ${L('φ < 0°')})`,
      desc: `היגב הקבל גדול מהיגב המשרן (${L('XC = 100 Ω > XL = 40 Ω')}), ולכן ${L('UC = 50 V > UL = 20 V')}. הווקטור השקול מצביע למטה: הזרם מקדים את המתח (${T('ICE')}).`,
      cfg: { topology: 'RLC', inputMode: 'reactances', Ueff: 50, f_Hz: 1000, R_ohm: 80, XL_ohm: 40, XC_ohm: 100 }
    },
    resonant: {
      title: `תהודה / אופי אוהמי (${L('XL = XC')} ← ${L('φ = 0°')})`,
      desc: `שני ההיגבים שווים (${L('XL = XC = 100 Ω')}) ולכן ${L('UL = UC = 62.5 V')} מבטלים זה את זה לחלוטין! העכבה יורדת למינימום ${L('Z = R = 80 Ω')} ומתח הנגד שווה בדיוק למתח המקור ${L('UR = 50 V')}.`,
      cfg: { topology: 'RLC', inputMode: 'reactances', Ueff: 50, f_Hz: 1000, R_ohm: 80, XL_ohm: 100, XC_ohm: 100 }
    }
  };

  const LAB_PRESETS = [
    {
      id: 'rl-basic',
      label: 'RL טורי (3-4-5)',
      cfg: { topology: 'RL', inputMode: 'reactances', sourceMode: 'Ueff', sourceVal: 50, freqMode: 'f', f_Hz: 500, R_ohm: 60, XL_ohm: 80, XC_ohm: 0 }
    },
    {
      id: 'rc-bagrut2021',
      label: 'RC · בגרות 2021',
      cfg: { topology: 'RC', inputMode: 'components', sourceMode: 'Ueff', sourceVal: 17, freqMode: 'f', f_Hz: 4000, R_ohm: 80, L_H: 0, C_F: 1 / (2 * Math.PI * 4000 * 150) }
    },
    {
      id: 'rlc-ind',
      label: 'RLC השראי (מפגש 13)',
      cfg: { topology: 'RLC', inputMode: 'reactances', sourceMode: 'Ueff', sourceVal: 50, freqMode: 'f', f_Hz: 1000, R_ohm: 80, XL_ohm: 100, XC_ohm: 40 }
    },
    {
      id: 'rlc-cap',
      label: 'RLC קיבולי (0.1H, 10µF)',
      cfg: { topology: 'RLC', inputMode: 'components', sourceMode: 'Ueff', sourceVal: 10, freqMode: 'f', f_Hz: 100, R_ohm: 50, L_H: 0.1, C_F: 10e-6 }
    },
    {
      id: 'rlc-res',
      label: '🎯 תהודה: UL=UC > U',
      cfg: { topology: 'RLC', inputMode: 'components', sourceMode: 'Ueff', sourceVal: 10, freqMode: 'f', f_Hz: 503.2921, R_ohm: 50, L_H: 0.1, C_F: 1e-6 }
    },
    {
      id: 'bagrut-2025',
      label: 'בגרות 2025 ש׳ 2 (RL)',
      cfg: { topology: 'RL', inputMode: 'components', sourceMode: 'Ueff', sourceVal: 25, freqMode: 'omega', omega: 2000, R_ohm: 480, L_H: 0.07, C_F: 0 }
    },
    {
      id: 'bagrut-2022',
      label: 'בגרות 2022 ש׳ 4 (RC)',
      cfg: { topology: 'RC', inputMode: 'components', sourceMode: 'Ueff', sourceVal: 26, freqMode: 'f', f_Hz: 1000 / Math.PI, R_ohm: 120, L_H: 0, C_F: 10e-6 }
    },
    {
      id: 'bagrut-2017-sw',
      label: 'בגרות 2017 ש׳ 5 (+מפסק)',
      cfg: { topology: 'RC_SWITCH', switchClosed: false, inputMode: 'components', sourceMode: 'Umax', sourceVal: 311.127, freqMode: 'f', f_Hz: 1000, R_ohm: 40, L_H: 0, C_F: 1 / (2 * Math.PI * 1000 * 30) }
    }
  ];

  // 12 Curated Lesson & Bagrut Exercises (STRICTLY ZERO QUIZ OVERLAP)
  const EXERCISES = [
    {
      id: 'ex1',
      category: 'm12',
      badge: 'מפגש 12 · תרגיל ע6',
      title: 'מעגל RL טורי בסיסי — שלשת 3-4-5',
      givensHtml: `במעגל ${T('RL')} טורי מחוברים נגד ${L('R = 60 Ω')} ומשרן שהיגבו ${L('XL = 80 Ω')}. המתח האפקטיבי של המקור הוא ${L('U = 50 V')} (בתדר ${L('f = 500 Hz')}).`,
      labCfg: { topology: 'RL', inputMode: 'reactances', Ueff: 50, f_Hz: 500, R_ohm: 60, XL_ohm: 80, XC_ohm: 0 },
      subQuestions: [
        {
          id: 'z',
          promptHtml: `א. חשבו את העכבה הכוללת ${L('Z')} של המעגל (${L('Ω')}).`,
          unit: 'Ω',
          expected: 100,
          traps: [{ val: 140, msgHtml: `טעות קלאסית: חיברת אריתמטית ${L('60 + 80 = 140 Ω')}! יש להשתמש בפיתגורס: ${L('Z = √(60² + 80²)')}.` }]
        },
        {
          id: 'i',
          promptHtml: `ב. חשבו את הזרם האפקטיבי ${L('I')} במעגל (${L('mA')}).`,
          unit: 'mA',
          expected: 500,
          traps: [{ val: 833.33, msgHtml: `חילקת ${L('50 / 60')} לפי הנגד בלבד! יש לחלק בעכבה הכוללת: ${L('I = U / Z = 50 / 100')}.` }]
        },
        {
          id: 'ul',
          promptHtml: `ג. חשבו את המתח על המשרן ${L('UL')} (${L('V')}).`,
          unit: 'V',
          expected: 40,
          traps: []
        },
        {
          id: 'phi',
          promptHtml: `ד. חשבו את זווית המופע ${L('φ')} (${L('°')}).`,
          unit: '°',
          expected: 53.13,
          traps: [{ val: 36.87, msgHtml: `הפכת בין הנגד להיגב ב-${L('tan⁻¹')}! הנוסחה היא ${L('tan⁻¹(XL / R)')}, כלומר ${L('tan⁻¹(80 / 60)')}.` }]
        }
      ],
      solutionLines: [
        'Z = √(R² + XL²) = √(60² + 80²) = 100 Ω',
        'I = U / Z = 50 / 100 = 0.5 A = 500 mA',
        'UR = I·R = 0.5 × 60 = 30 V  |  UL = I·XL = 0.5 × 80 = 40 V',
        'Check: √(30² + 40²) = 50 V = U   (Note: 30 + 40 = 70 ≠ 50!)',
        'φ = +tan⁻¹(XL / R) = +tan⁻¹(80 / 60) = +53.13°  (ELI: φ > 0°)'
      ].join('\n')
    },
    {
      id: 'ex2',
      category: 'm12',
      badge: 'מפגש 12 · תרגיל ע8',
      title: 'מעגל RL בכתיב בגרות u(t) = Um·sin(ωt)',
      givensHtml: `נתון מעגל ${T('RL')} טורי שבו ${L('R = 300 Ω')}, ${L('L = 100 mH')}, ומתח המקור הרגעי הוא ${L('u(t) = 20·√2·sin(4000·t) [V]')}.`,
      labCfg: { topology: 'RL', inputMode: 'components', Ueff: 20, freqMode: 'omega', omega: 4000, R_ohm: 300, L_H: 0.1, C_F: 0 },
      subQuestions: [
        {
          id: 'xl',
          promptHtml: `א. חשבו את היגב המשרן ${L('XL')} (${L('Ω')}).`,
          unit: 'Ω',
          expected: 400,
          traps: [{ val: 400000, msgHtml: `שכחת להמיר ${L('100 mH')} להנרי (${L('0.1 H')}) לפני הכפלה ב-${L('ω = 4000 rad/s')}!` }]
        },
        {
          id: 'z',
          promptHtml: `ב. חשבו את העכבה ${L('Z')} (${L('Ω')}).`,
          unit: 'Ω',
          expected: 500,
          traps: [{ val: 700, msgHtml: `לא מחברים ${L('300 + 400')}! חשבו ${L('√(300² + 400²)')}.` }]
        },
        {
          id: 'i',
          promptHtml: `ג. חשבו את הזרם האפקטיבי ${L('I')} (${L('mA')}).`,
          unit: 'mA',
          expected: 40,
          traps: [{ val: 56.57, msgHtml: `חילקת את מתח השיא ${L('20·√2 V')} במקום את המתח האפקטיבי ${L('U = 20 V')}!` }]
        },
        {
          id: 'phi',
          promptHtml: `ד. חשבו את זווית המופע ${L('φ')} (${L('°')}).`,
          unit: '°',
          expected: 53.13,
          traps: []
        }
      ],
      solutionLines: [
        'From u(t) = 20·√2·sin(4000·t):  Ueff = 20 V   |   ω = 4000 rad/s',
        'L = 100 mH = 0.1 H   ⇒   XL = ω·L = 4000 × 0.1 = 400 Ω',
        'Z = √(300² + 400²) = 500 Ω',
        'I = Ueff / Z = 20 / 500 = 0.04 A = 40 mA',
        'UR = 40 mA × 300 Ω = 12 V  |  UL = 40 mA × 400 Ω = 16 V  |  φ = +53.13°'
      ].join('\n')
    },
    {
      id: 'ex3',
      category: 'm12',
      badge: 'בגרות 2025 · שאלה 2',
      title: 'מעגל RL, שלשת 7-24-25 ושילוש התדר (×3)',
      givensHtml: `במעגל ${T('RL')} טורי נתונים: ${L('R = 480 Ω')}, היגב המשרן ${L('XL = 140 Ω')}, ומתח המבוא ${L('u(t) = 25·√2·sin(2000·t) [V]')}.`,
      labCfg: { topology: 'RL', inputMode: 'components', Ueff: 25, freqMode: 'omega', omega: 2000, R_ohm: 480, L_H: 0.07, C_F: 0 },
      subQuestions: [
        {
          id: 'l',
          promptHtml: `א. חשבו את השראות המשרן ${L('L')} (${L('mH')}).`,
          unit: 'mH',
          expected: 70,
          traps: []
        },
        {
          id: 'i1',
          promptHtml: `ב. חשבו את הזרם האפקטיבי ${L('I')} בתדר המקורי (${L('mA')}).`,
          unit: 'mA',
          expected: 50,
          traps: [{ val: 70.71, msgHtml: `השתמשת במתח השיא ${L('25√2 V')} במקום ב-${L('U = 25 V')}!` }]
        },
        {
          id: 'phi1',
          promptHtml: `ג. חשבו את זווית המופע ${L('φ')} בתדר המקורי (${L('°')}).`,
          unit: '°',
          expected: 16.26,
          traps: []
        },
        {
          id: 'i2',
          promptHtml: `ד. מגדילים את תדר המקור פי ${L('3')} (${L('ω₂ = 6000 rad/s')}). מהו הזרם החדש ${L('I₂')} (${L('mA')})?`,
          unit: 'mA',
          expected: 39.20,
          traps: [{ val: 16.67, msgHtml: `הזרם אינו קטן בדיוק פי 3 כי הנגד ${L('R = 480 Ω')} נשאר קבוע! חשבו ${L('XL₂ = 3 × 140 = 420 Ω')} ו-${L('Z₂ = √(480² + 420²)')}.` }]
        }
      ],
      solutionLines: [
        'Ueff = 25 V  |  ω = 2000 rad/s  ⇒  L = XL / ω = 140 / 2000 = 0.07 H = 70 mH',
        'Z₁ = √(480² + 140²) = 500 Ω  (20 × [7-24-25])  ⇒  I₁ = 25 / 500 = 50 mA',
        'φ₁ = +tan⁻¹(140 / 480) = +16.26°',
        'At 3·f:  XL₂ = 3 × 140 = 420 Ω  ⇒  Z₂ = √(480² + 420²) = 637.81 Ω',
        'I₂ = 25 / 637.81 = 39.20 mA'
      ].join('\n')
    },
    {
      id: 'ex4',
      category: 'm12',
      badge: 'בגרות 2020 · שאלה 2',
      title: 'מציאת R מתוך קריאת הזרם במעגל RL',
      givensHtml: `מעגל ${T('RL')} טורי מוזן ממתח ${L('u(t) = 25·√2·sin(1000·t) [V]')}. השראות המשרן היא ${L('L = 30 mH')} והזרם הנמדד הוא ${L('I = 0.5 A')}.`,
      labCfg: { topology: 'RL', inputMode: 'components', Ueff: 25, freqMode: 'omega', omega: 1000, R_ohm: 40, L_H: 0.03, C_F: 0 },
      subQuestions: [
        {
          id: 'xl',
          promptHtml: `א. חשבו את היגב המשרן ${L('XL')} (${L('Ω')}).`,
          unit: 'Ω',
          expected: 30,
          traps: []
        },
        {
          id: 'z',
          promptHtml: `ב. מצאו את העכבה הכוללת ${L('Z')} (${L('Ω')}).`,
          unit: 'Ω',
          expected: 50,
          traps: []
        },
        {
          id: 'r',
          promptHtml: `ג. חשבו את התנגדות הנגד ${L('R')} (${L('Ω')}).`,
          unit: 'Ω',
          expected: 40,
          traps: [{ val: 20, msgHtml: `זהירות! ${L('R = √(Z² − XL²)')} לפי פיתגורס, ולא חיסור פשוט ${L('50 − 30 = 20 Ω')}!` }]
        },
        {
          id: 'phi',
          promptHtml: `ד. חשבו את זווית המופע ${L('φ')} (${L('°')}).`,
          unit: '°',
          expected: 36.87,
          traps: []
        }
      ],
      solutionLines: [
        'Ueff = 25 V  |  ω = 1000 rad/s  |  L = 30 mH = 0.03 H',
        'XL = ω·L = 1000 × 0.03 = 30 Ω',
        'Z = Ueff / I = 25 / 0.5 = 50 Ω',
        'R = √(Z² − XL²) = √(50² − 30²) = 40 Ω',
        'φ = +tan⁻¹(30 / 40) = +36.87°'
      ].join('\n')
    },
    {
      id: 'ex5',
      category: 'm13',
      badge: 'בגרות 2021 · שאלה 2',
      title: 'מעגל RC טורי — שלשת 8-15-17 וזווית שלילית',
      givensHtml: `במעגל ${T('RC')} טורי מחוברים נגד ${L('R = 80 Ω')} וקבל שהיגבו ${L('XC = 150 Ω')}. מתח המקור הוא ${L('u(t) = 17·√2·sin(8π·10³·t) [V]')}.`,
      labCfg: { topology: 'RC', inputMode: 'components', Ueff: 17, freqMode: 'f', f_Hz: 4000, R_ohm: 80, L_H: 0, C_F: 1 / (2 * Math.PI * 4000 * 150) },
      subQuestions: [
        {
          id: 'f',
          promptHtml: `א. חשבו את תדר המקור ${L('f')} מתוך ${L('ω = 8π·10³ rad/s')} (${L('kHz')}).`,
          unit: 'kHz',
          expected: 4,
          traps: [{ val: 8, msgHtml: `שים לב: ${L('ω = 2πf')}, ולכן ${L('f = 8π·10³ / (2π) = 4 kHz')} (ולא ${L('8 kHz')}).` }]
        },
        {
          id: 'z',
          promptHtml: `ב. חשבו את העכבה הכוללת ${L('Z')} (${L('Ω')}).`,
          unit: 'Ω',
          expected: 170,
          traps: [{ val: 230, msgHtml: `חשבו עם פיתגורס ${L('√(80² + 150²)')}, לא ${L('80 + 150')}!` }]
        },
        {
          id: 'i',
          promptHtml: `ג. חשבו את הזרם האפקטיבי ${L('I')} (${L('mA')}).`,
          unit: 'mA',
          expected: 100,
          traps: []
        },
        {
          id: 'phi',
          promptHtml: `ד. חשבו את זווית המופע ${L('φ')} (${L('°')}) — הקפידו על הסימן!`,
          unit: '°',
          expected: -61.93,
          traps: []
        }
      ],
      solutionLines: [
        'ω = 8π·10³ rad/s  ⇒  f = ω / (2π) = 4 kHz  (T = 0.25 ms)',
        'C = 1 / (ω·XC) = 1 / (8π·10³ × 150) = 265.26 nF',
        'Z = √(80² + 150²) = 170 Ω   ⇒   I = 17 / 170 = 0.1 A = 100 mA',
        'UR = 8 V  |  UC = 15 V  |  Check: √(8² + 15²) = 17 V',
        'φ = −tan⁻¹(XC / R) = −tan⁻¹(150 / 80) = −61.93°  (ICE: φ < 0°)'
      ].join('\n')
    },
    {
      id: 'ex6',
      category: 'm13',
      badge: 'בגרות 2022 · שאלה 4',
      title: 'מעגל RC טורי — שלשת 5-12-13 והכפלת תדר',
      givensHtml: `מעגל ${T('RC')} טורי כולל קבל ${L('C = 10 µF')} ונגד ${L('R')} לא ידוע. המתח האפקטיבי הוא ${L('U = 26 V')}, התדר ${L('f = 1000/π Hz')} (${L('≈ 318.31 Hz')}), והזרם הנמדד הוא ${L('I = 0.2 A')}.`,
      labCfg: { topology: 'RC', inputMode: 'components', Ueff: 26, freqMode: 'f', f_Hz: 1000 / Math.PI, R_ohm: 120, L_H: 0, C_F: 10e-6 },
      subQuestions: [
        {
          id: 'xc',
          promptHtml: `א. חשבו את היגב הקבל ${L('XC')} (${L('Ω')}).`,
          unit: 'Ω',
          expected: 50,
          traps: []
        },
        {
          id: 'r',
          promptHtml: `ב. חשבו את התנגדות הנגד ${L('R')} (${L('Ω')}).`,
          unit: 'Ω',
          expected: 120,
          traps: [{ val: 80, msgHtml: `חישבת ${L('130 − 50')} במקום ${L('R = √(Z² − XC²) = √(130² − 50²)')}!` }]
        },
        {
          id: 'phi',
          promptHtml: `ג. חשבו את זווית המופע ${L('φ')} (${L('°')}).`,
          unit: '°',
          expected: -22.62,
          traps: []
        },
        {
          id: 'i2',
          promptHtml: `ד. מכפילים את התדר פי ${L('2')} (${L('ω₂ = 4000 rad/s')}). מהו הזרם החדש ${L('I₂')} (${L('mA')})?`,
          unit: 'mA',
          expected: 212.11,
          traps: [{ val: 400, msgHtml: `ב-${T('RC')} טורי ${L('XC₂ = 25 Ω')} קטן פי 2, אבל ${L('R = 120 Ω')} נשאר — לכן ${L('Z₂ = √(120² + 25²) = 122.58 Ω')}.` }]
        }
      ],
      solutionLines: [
        'ω = 2π·(1000/π) = 2000 rad/s   ⇒   XC = 1 / (2000 × 10·10⁻⁶) = 50 Ω',
        'Z = U / I = 26 / 0.2 = 130 Ω   ⇒   R = √(130² − 50²) = 120 Ω',
        'φ = −tan⁻¹(50 / 120) = −22.62°',
        'At 2·f:  XC₂ = 25 Ω  ⇒  Z₂ = √(120² + 25²) = 122.58 Ω  ⇒  I₂ = 26 / 122.58 = 212.11 mA'
      ].join('\n')
    },
    {
      id: 'ex7',
      category: 'm13',
      badge: 'בגרות 2023 · שאלה 2',
      title: 'קריאת שלושה מדים במעגל RC — שלשת 7-24-25',
      givensHtml: `במעגל ${T('RC')} טורי בתדר ${L('f = 2 kHz')} מדדו: מתח על הנגד ${L('UR = 24 V')}, מתח על הקבל ${L('UC = 7 V')}, וזרם המעגל ${L('I = 4 mA')}.`,
      labCfg: { topology: 'RC', inputMode: 'components', Ueff: 25, freqMode: 'f', f_Hz: 2000, R_ohm: 6000, L_H: 0, C_F: 1 / (2 * Math.PI * 2000 * 1750) },
      subQuestions: [
        {
          id: 'u',
          promptHtml: `א. מהו המתח האפקטיבי הכולל ${L('U')} של המקור (${L('V')})?`,
          unit: 'V',
          expected: 25,
          traps: [{ val: 31, msgHtml: `אי אפשר לחבר ${L('24 + 7 = 31 V')}! השתמשו בפיתגורס: ${L('U = √(24² + 7²)')}.` }]
        },
        {
          id: 'r',
          promptHtml: `ב. חשבו את התנגדות הנגד ${L('R')} (${L('kΩ')}).`,
          unit: 'kΩ',
          expected: 6,
          traps: []
        },
        {
          id: 'xc',
          promptHtml: `ג. חשבו את היגב הקבל ${L('XC')} (${L('kΩ')}).`,
          unit: 'kΩ',
          expected: 1.75,
          traps: []
        },
        {
          id: 'c',
          promptHtml: `ד. חשבו את הקיבול ${L('C')} (${L('nF')}).`,
          unit: 'nF',
          expected: 45.47,
          traps: []
        }
      ],
      solutionLines: [
        'U = √(UR² + UC²) = √(24² + 7²) = 25 V',
        'R = UR / I = 24 / 0.004 = 6000 Ω = 6 kΩ',
        'XC = UC / I = 7 / 0.004 = 1750 Ω = 1.75 kΩ',
        'C = 1 / (2π·f·XC) = 1 / (2π · 2000 · 1750) = 45.47 nF   |   φ = −16.26°'
      ].join('\n')
    },
    {
      id: 'ex8',
      category: 'm13',
      badge: 'מפגש 13 · תרגיל ע5',
      title: 'מעגל RLC טורי — קיזוז היגבים ואופי השראי',
      givensHtml: `במעגל ${T('RLC')} טורי נתונים: ${L('R = 80 Ω')}, ${L('XL = 100 Ω')}, ${L('XC = 40 Ω')}, ומתח המקור ${L('U = 50 V')} (${L('f = 1 kHz')}).`,
      labCfg: { topology: 'RLC', inputMode: 'reactances', Ueff: 50, f_Hz: 1000, R_ohm: 80, XL_ohm: 100, XC_ohm: 40 },
      subQuestions: [
        {
          id: 'x',
          promptHtml: `א. חשבו את ההיגב השקול ${L('X = XL − XC')} (${L('Ω')}).`,
          unit: 'Ω',
          expected: 60,
          traps: [{ val: 140, msgHtml: `מחסרים היגבים מנוגדים! ${L('X = XL − XC = 100 − 40 = 60 Ω')}, לא ${L('100 + 40')}!` }]
        },
        {
          id: 'z',
          promptHtml: `ב. חשבו את העכבה הכוללת ${L('Z')} (${L('Ω')}).`,
          unit: 'Ω',
          expected: 100,
          traps: []
        },
        {
          id: 'ul',
          promptHtml: `ג. חשבו את המתח על המשרן ${L('UL')} (${L('V')}).`,
          unit: 'V',
          expected: 50,
          traps: []
        },
        {
          id: 'phi',
          promptHtml: `ד. חשבו את זווית המופע ${L('φ')} (${L('°')}).`,
          unit: '°',
          expected: 36.87,
          traps: []
        }
      ],
      solutionLines: [
        'X = XL − XC = 100 − 40 = +60 Ω  ⇒  Z = √(80² + 60²) = 100 Ω',
        'I = 50 / 100 = 0.5 A = 500 mA',
        'UR = 40 V  |  UL = 50 V  |  UC = 20 V',
        'Check: √(40² + (50 − 20)²) = √(40² + 30²) = 50 V = U',
        'φ = +tan⁻¹(60 / 80) = +36.87°  (XL > XC ⇒ ELI, φ > 0°)'
      ].join('\n')
    },
    {
      id: 'ex9',
      category: 'm13',
      badge: 'מפגש 13 ע6 + מפגש 14 ב1',
      title: 'RLC טורי מערכי רכיבים ומציאת תדר התהודה f₀',
      givensHtml: `במעגל ${T('RLC')} טורי מחוברים ${L('R = 50 Ω')}, ${L('L = 0.1 H (100 mH)')}, ו-${L('C = 10 µF')}. המתח הוא ${L('U = 10 V')} בתדר ${L('f = 100 Hz')}.`,
      labCfg: { topology: 'RLC', inputMode: 'components', Ueff: 10, f_Hz: 100, R_ohm: 50, L_H: 0.1, C_F: 10e-6 },
      subQuestions: [
        {
          id: 'xl',
          promptHtml: `א. חשבו את היגב המשרן ${L('XL')} בתדר ${L('100 Hz')} (${L('Ω')}).`,
          unit: 'Ω',
          expected: 62.83,
          traps: []
        },
        {
          id: 'xc',
          promptHtml: `ב. חשבו את היגב הקבל ${L('XC')} בתדר ${L('100 Hz')} (${L('Ω')}).`,
          unit: 'Ω',
          expected: 159.15,
          traps: []
        },
        {
          id: 'i',
          promptHtml: `ג. חשבו את הזרם האפקטיבי ${L('I')} (${L('mA')}).`,
          unit: 'mA',
          expected: 92.14,
          traps: []
        },
        {
          id: 'f0',
          promptHtml: `ד. חשבו את תדר התהודה ${L('f₀')} של המעגל (${L('Hz')}).`,
          unit: 'Hz',
          expected: 159.15,
          traps: []
        }
      ],
      solutionLines: [
        'XL = 2π·100·0.1 = 62.83 Ω   |   XC = 1 / (2π·100·10·10⁻⁶) = 159.15 Ω',
        'X = 62.83 − 159.15 = −96.32 Ω   ⇒   Z = √(50² + (−96.32)²) = 108.53 Ω',
        'I = 10 / 108.53 = 92.14 mA   |   φ = −tan⁻¹(96.32 / 50) = −62.57°',
        'f₀ = 1 / (2π·√(0.1 × 10·10⁻⁶)) = 159.15 Hz  (Imax = 10 / 50 = 200 mA)'
      ].join('\n')
    },
    {
      id: 'ex10',
      category: 'm14',
      badge: 'מפגש 14 · תהודה',
      title: 'מעגל RLC בתהודה — תופעת מתחי היתר (UL = UC > U)',
      givensHtml: `נתון מעגל ${T('RLC')} טורי: ${L('R = 50 Ω')}, ${L('L = 100 mH')}, ${L('C = 1 µF')}, ומתח מקור ${L('U = 10 V')}. מכוונים את המקור בדיוק לתדר התהודה ${L('f₀')}.`,
      labCfg: { topology: 'RLC', inputMode: 'components', Ueff: 10, f_Hz: 1 / (2 * Math.PI * Math.sqrt(0.1 * 1e-6)), R_ohm: 50, L_H: 0.1, C_F: 1e-6 },
      subQuestions: [
        {
          id: 'f0',
          promptHtml: `א. חשבו את תדר התהודה ${L('f₀')} (${L('Hz')}).`,
          unit: 'Hz',
          expected: 503.29,
          traps: []
        },
        {
          id: 'imax',
          promptHtml: `ב. חשבו את הזרם המרבי בתהודה ${L('Imax')} (${L('mA')}).`,
          unit: 'mA',
          expected: 200,
          traps: []
        },
        {
          id: 'ul',
          promptHtml: `ג. חשבו את המתח על המשרן (וגם על הקבל) בתהודה ${L('UL = UC')} (${L('V')}).`,
          unit: 'V',
          expected: 63.25,
          traps: []
        },
        {
          id: 'phi',
          promptHtml: `ד. מהי זווית המופע ${L('φ')} בתהודה (${L('°')})?`,
          unit: '°',
          expected: 0,
          traps: []
        }
      ],
      solutionLines: [
        'Resonance (XL = XC):  2π·f₀·L = 1 / (2π·f₀·C)',
        '(2π·f₀)² = 1 / (L·C)  ⇒  f₀ = 1 / (2π·√(0.1 × 1·10⁻⁶)) = 503.29 Hz',
        'At f₀:  XL = XC = 2π·503.29·0.1 = 316.23 Ω  ⇒  X = 0 Ω  ⇒  Zmin = R = 50 Ω',
        'Imax = U / R = 10 / 50 = 200 mA  |  φ = 0°',
        'UR = 10 V   |   UL = UC = 0.2 × 316.23 = 63.25 V  (UL = UC > U = 10 V, UX = 0 V)'
      ].join('\n')
    },
    {
      id: 'ex11',
      category: 'm14',
      badge: 'בגרות 2017 · שאלה 5',
      title: 'מעגל RC עם מפסק S במקביל לקבל',
      givensHtml: `מעגל ${T('RC')} טורי מוזן ממקור בעל מתח שיא ${L('Um = 311.13 V')} ותדר ${L('f = 1 kHz')}. במקביל לקבל מחובר מפסק ${L('S')}: כש-${L('S')} <strong>סגור</strong> הזרם הוא ${L('I₁ = 5.5 A')}, וכש-${L('S')} <strong>פתוח</strong> הזרם הוא ${L('I₂ = 4.4 A')}.`,
      labCfg: { topology: 'RC_SWITCH', switchClosed: false, inputMode: 'components', sourceMode: 'Umax', sourceVal: 311.13, f_Hz: 1000, R_ohm: 40, L_H: 0, C_F: 1 / (2 * Math.PI * 1000 * 30) },
      subQuestions: [
        {
          id: 'r',
          promptHtml: `א. ממצב סגור (${L('S')} מקצר את הקבל): מצאו את ${L('R')} (${L('Ω')}).`,
          unit: 'Ω',
          expected: 40,
          traps: [{ val: 56.57, msgHtml: `חילקת את מתח השיא ${L('311.13 V')}! יש להמיר קודם לאפקטיבי: ${L('U = 311.13 / √2 = 220 V')}.` }]
        },
        {
          id: 'zopen',
          promptHtml: `ב. ממצב פתוח: מצאו את העכבה ${L('Z')} (${L('Ω')}).`,
          unit: 'Ω',
          expected: 50,
          traps: []
        },
        {
          id: 'xc',
          promptHtml: `ג. חשבו את היגב הקבל ${L('XC')} (${L('Ω')}).`,
          unit: 'Ω',
          expected: 30,
          traps: [{ val: 10, msgHtml: `השתמשו בפיתגורס ${L('XC = √(50² − 40²)')}, לא ${L('50 − 40 = 10 Ω')}!` }]
        },
        {
          id: 'c',
          promptHtml: `ד. חשבו את הקיבול ${L('C')} (${L('µF')}).`,
          unit: 'µF',
          expected: 5.31,
          traps: []
        }
      ],
      solutionLines: [
        'Ueff = Um / √2 = 311.13 / √2 = 220 V',
        'S CLOSED ⇒ C is shorted (UC = 0) ⇒ Z₁ = R = 220 / 5.5 = 40 Ω',
        'S OPEN   ⇒ Z₂ = 220 / 4.4 = 50 Ω  ⇒  XC = √(50² − 40²) = 30 Ω',
        'C = 1 / (2π·1000·30) = 5.31 µF  |  φ(open) = −36.87°'
      ].join('\n')
    },
    {
      id: 'ex12',
      category: 'm14',
      badge: 'בגרות 2019 · שאלה 2',
      title: 'שילוב מד-מתח ומשקף תנודות (RC טורי)',
      givensHtml: `במעגל ${T('RC')} טורי שבו ${L('R = 1.2 kΩ')} נמדד מתח אפקטיבי על הנגד ${L('UR = 6 V')}. במשקף התנודות על פני הקבל מתקבל מחזור שלם על ${L('5')} משבצות כש-${L('Time/div = 5 ms')}, ומתח שיא-לשיא על הקבל הוא ${L('UC(p-p) = 22.63 V')}.`,
      labCfg: { topology: 'RC', inputMode: 'components', Ueff: 10, freqMode: 'f', f_Hz: 40, R_ohm: 1200, L_H: 0, C_F: 1 / (2 * Math.PI * 40 * 1600) },
      subQuestions: [
        {
          id: 'i',
          promptHtml: `א. חשבו את הזרם האפקטיבי ${L('I')} במעגל (${L('mA')}).`,
          unit: 'mA',
          expected: 5,
          traps: []
        },
        {
          id: 'f',
          promptHtml: `ב. חשבו מקריאת המשקף את תדר המקור ${L('f')} (${L('Hz')}).`,
          unit: 'Hz',
          expected: 40,
          traps: []
        },
        {
          id: 'uc',
          promptHtml: `ג. חשבו מתוך ${L('UC(p-p)')} את המתח האפקטיבי על הקבל ${L('UC')} (${L('V')}).`,
          unit: 'V',
          expected: 8,
          traps: [{ val: 16, msgHtml: `חילקת ב-2 ומצאת מתח שיא ${L('Um')}! כדי לקבל אפקטיבי מחלקים ב-${L('2√2')}: ${L('22.63 / 2.828 = 8 V')}.` }]
        },
        {
          id: 'u',
          promptHtml: `ד. חשבו את המתח האפקטיבי הכולל ${L('U')} של המקור (${L('V')}).`,
          unit: 'V',
          expected: 10,
          traps: [{ val: 14, msgHtml: `זהירות! ${L('U = √(UR² + UC²) = √(6² + 8²) = 10 V')}, לא ${L('6 + 8 = 14 V')}!` }]
        }
      ],
      solutionLines: [
        'I = UR / R = 6 / 1200 = 0.005 A = 5 mA',
        'T = 5 div × 5 ms/div = 25 ms = 0.025 s   ⇒   f = 1 / 0.025 = 40 Hz',
        'UC = UC(p-p) / (2·√2) = 22.63 / 2.8284 = 8 V',
        'XC = UC / I = 8 / 0.005 = 1600 Ω = 1.6 kΩ   ⇒   C = 1 / (2π·40·1600) = 2.49 µF',
        'U = √(6² + 8²) = 10 V   |   φ = −tan⁻¹(8 / 6) = −53.13°'
      ].join('\n')
    },
    {
      id: 'ex13',
      category: 'm14',
      badge: 'מפגש 14 · תרגיל 6',
      title: 'מציאת קבל C לתהודה דרך שוויון ההיגבים XL = XC',
      givensHtml: `במעגל ${T('RLC')} טורי נתונים נגד ${L('R = 25 Ω')}, משרן ${L('L = 50 mH')}, ומקור מתח ${L('u(t) = 10·√2·sin(2π·1000·t) [V]')}. מחברים קבל ${L('C')} בטור כך שהמעגל יימצא <strong>בתהודה</strong> בתדר המקור (${L('f₀ = 1 kHz')}).`,
      labCfg: { topology: 'RLC', inputMode: 'components', Ueff: 10, freqMode: 'f', f_Hz: 1000, R_ohm: 25, L_H: 0.05, C_F: 1 / (Math.pow(2 * Math.PI * 1000, 2) * 0.05) },
      subQuestions: [
        {
          id: 'ueff',
          promptHtml: `א. מתוך משוואת ${L('u(t)')}, מהו המתח האפקטיבי ${L('U')} של המקור (${L('V')})?`,
          unit: 'V',
          expected: 10,
          traps: [{ val: 14.14, msgHtml: `לקחת את משרעת השיא ${L('Um = 10·√2 ≈ 14.14 V')}! מחלקים ב-${L('√2')} ומקבלים ${L('U = 10 V')}.` }]
        },
        {
          id: 'xc',
          promptHtml: `ב. חשבו את ${L('XL')}, וממשוואת שוויון ההיגבים בתהודה (${L('XL = XC')}) מצאו מה חייב להיות ${L('XC')} (${L('Ω')}).`,
          unit: 'Ω',
          expected: 314.16,
          traps: []
        },
        {
          id: 'c',
          promptHtml: `ג. חשבו מתוך ${L('XC')} את קיבול הקבל ${L('C')} הדרוש לתהודה (${L('nF')}).`,
          unit: 'nF',
          expected: 506.61,
          traps: [{ val: 0.51, msgHtml: `זו התשובה ב-${L('µF')}! הכפילו ב-${L('1000')} כדי להמיר לננו-פאראד (${L('506.61 nF')}).` }]
        },
        {
          id: 'uc',
          promptHtml: `ד. במצב התהודה, מה יורה מד-מתח המחובר במקביל לקבל ${L('UC')} (${L('V')})?`,
          unit: 'V',
          expected: 125.66,
          traps: [{ val: 10, msgHtml: `${L('10 V')} הוא המתח על הנגד (${L('UR = U')})! בתהודה מד-המתח על הקבל מורה ${L('UC = I·XC = 0.4 × 314.16 = 125.66 V')}.` }]
        }
      ],
      solutionLines: [
        'From u(t) = 10·√2·sin(2π·1000·t):  Ueff = 10 V   |   f = f₀ = 1000 Hz = 1 kHz',
        'XL = 2π·f₀·L = 2π·1000·0.05 = 314.16 Ω',
        'Resonance condition:  XL = XC  ⇒  XC = 314.16 Ω',
        'C = 1 / (2π·f₀·XC) = 1 / (2π·1000·314.16) = 5.066×10⁻⁷ F = 506.61 nF',
        'At f₀:  Imax = U / R = 10 / 25 = 0.4 A  ⇒  UC = UL = 0.4 × 314.16 = 125.66 V'
      ].join('\n')
    },
    {
      id: 'ex14',
      category: 'm13',
      badge: 'מדים · פאזורים · תהודה',
      title: 'קריאת מד-זרם ומדי-מתח במעגל RLC וחישוב f₀',
      givensHtml: `במעגל ${T('RLC')} טורי בתדר ${L('f = 600 Hz')} מד-זרם המחובר בטור מורה ${L('I = 0.25 A')}. שלושה מדי-מתח אידיאליים המחוברים במקביל לרכיבים מורים: ${L('UR = 15 V')}, ${L('UL = 36 V')}, ${L('UC = 16 V')}.`,
      labCfg: { topology: 'RLC', inputMode: 'components', Ueff: 25, freqMode: 'f', f_Hz: 600, R_ohm: 60, L_H: 144 / (2 * Math.PI * 600), C_F: 1 / (2 * Math.PI * 600 * 64) },
      subQuestions: [
        {
          id: 'u',
          promptHtml: `א. לפי דיאגרמת המחוגים (${L('UL')} ו-${L('UC')} מנוגדים), מה יורה מד-המתח במקביל למקור ${L('U')} (${L('V')})?`,
          unit: 'V',
          expected: 25,
          traps: [
            { val: 67, msgHtml: `אסור לחבר קריאות מדי-מתח אריתמטית (${L('15+36+16=67 V')})! יש לחבר וקטורית: ${L('√(UR² + (UL−UC)²)')}.` },
            { val: 17.68, msgHtml: `קריאת מדי-המתח היא כבר ערך אפקטיבי! אין לחלק ב-${L('√2')}.` }
          ]
        },
        {
          id: 'z',
          promptHtml: `ב. חשבו מקריאות המדים את העכבה הכוללת ${L('Z = U / I')} (${L('Ω')}).`,
          unit: 'Ω',
          expected: 100,
          traps: [{ val: 60, msgHtml: `חילקת ${L('UR / I')} וקיבלת את הנגד ${L('R = 60 Ω')}! לעכבה הכוללת מחלקים ${L('U / I = 25 / 0.25')}.` }]
        },
        {
          id: 'phi',
          promptHtml: `ג. חשבו את זווית המופע ${L('φ')} בדיאגרמת הפאזורים (${L('°')}).`,
          unit: '°',
          expected: 53.13,
          traps: [{ val: -53.13, msgHtml: `בדוק כיוון! כאן ${L('UL = 36 V > UC = 16 V')}, ולכן המעגל השראי והזווית חיובית (${L('+53.13°')}).` }]
        },
        {
          id: 'f0',
          promptHtml: `ד. לאיזה תדר תהודה ${L('f₀')} (${L('Hz')}) יש לכוון את המקור כדי שיתקיים ${L('XL = XC')}?`,
          unit: 'Hz',
          expected: 400,
          traps: []
        }
      ],
      solutionLines: [
        'U = √(UR² + (UL − UC)²) = √(15² + (36 − 16)²) = √(15² + 20²) = 25 V',
        'Z = U / I = 25 / 0.25 = 100 Ω  (R = 15/0.25 = 60 Ω, XL = 36/0.25 = 144 Ω, XC = 16/0.25 = 64 Ω)',
        'φ = +tan⁻¹((36 − 16) / 15) = +tan⁻¹(20 / 15) = +53.13°  (ELI: φ > 0°)',
        'L = XL / (2πf) = 38.20 mH   |   C = 1 / (2πf·XC) = 4.145 µF',
        'From XL = XC:  f₀ = 1 / (2π·√(L·C)) = f · √(XC / XL) = 600 · √(64 / 144) = 400 Hz'
      ].join('\n')
    }
  ];

  function shuffleWithCorrect(items, correctVal, fallbackItems = []) {
    const uniq = [];
    const seen = new Set();
    for (const it of [...items, ...fallbackItems]) {
      const key = String(it);
      if (!seen.has(key)) {
        seen.add(key);
        uniq.push(it);
      }
      if (uniq.length >= 4) break;
    }
    const copy = uniq.slice(0, 4);
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = copy[i]; copy[i] = copy[j]; copy[j] = tmp;
    }
    return { options: copy, correctIndex: copy.indexOf(correctVal) };
  }

  /**
   * Build 4 guided multiple-choice steps dynamically for any exercise.
   */
  function buildGuidedStepsForExercise(ex) {
    const sol = E.solveACCircuit(ex.labCfg);
    const steps = [];

    // Step 1: Effective voltage & reactance check
    const targetReact = sol.topology === 'RL' ? sol.XL_ohm : (sol.topology === 'RC' || sol.topology === 'RC_SWITCH' ? sol.XC_unshorted : sol.absX_ohm);
    const reactTitle = sol.topology === 'RL' ? `שלב 1: מציאת ${L('XL')}` : (sol.topology === 'RLC' ? `שלב 1: היגב שקול ${L('X = XL − XC')}` : `שלב 1: היגב הקבל ${L('XC')}`);
    const rCorrect = sol.topology === 'RLC' ? `${E.fmtNum(sol.X_ohm, 2)} Ω` : `${E.fmtNum(targetReact, 2)} Ω`;
    const rDistractors = sol.topology === 'RLC'
      ? [
          `${E.fmtNum(sol.XL_ohm + sol.XC_ohm, 2)} Ω`,
          `${E.fmtNum(sol.XL_ohm, 2)} Ω`,
          `${E.fmtNum(sol.R_ohm, 2)} Ω`
        ]
      : [
          `${E.fmtNum(targetReact * 1000, 1)} Ω`,
          `${E.fmtNum(targetReact / 10, 2)} Ω`,
          `${E.fmtNum(targetReact * 2, 2)} Ω`
        ];
    const s1 = shuffleWithCorrect([rCorrect, ...rDistractors], rCorrect, [
      `${E.fmtNum(sol.XL_ohm * 2 + 10, 2)} Ω`,
      `${E.fmtNum(sol.R_ohm + 25, 2)} Ω`,
      `${E.fmtNum(sol.XC_ohm + 15, 2)} Ω`
    ]);
    steps.push({
      title: reactTitle,
      questionHtml: sol.topology === 'RLC'
        ? `כיצד מחשבים את ההיגב השקול ${L('X')} בהינתן ${L(`XL=${E.fmtNum(sol.XL_ohm, 1)}Ω`)} ו-${L(`XC=${E.fmtNum(sol.XC_ohm, 1)}Ω`)}?`
        : `מהו גודל ההיגב של הרכיב הראקטיבי במצב פתוח/פעיל?`,
      optionsHtml: s1.options.map(o => L(o)),
      correctIndex: s1.correctIndex,
      explainHtml: sol.topology === 'RLC'
        ? `ב-${T('RLC')} מחסרים היגבים מנוגדים: ${L(`X = ${E.fmtNum(sol.XL_ohm, 1)} − ${E.fmtNum(sol.XC_ohm, 1)} = ${E.fmtNum(sol.X_ohm, 2)} Ω`)}.`
        : `בהמרת היחידות ליסוד והצבה ב-${L(sol.topology === 'RL' ? 'XL = ωL' : 'XC = 1/(ωC)')} מתקבל ${L(rCorrect)}.`
    });

    // Step 2: Impedance Z via Pythagoras
    const zCorrect = `${E.fmtNum(sol.Z_ohm, 2)} Ω`;
    const zArith = sol.R_ohm + Math.abs(sol.X_ohm);
    const zDiff = Math.max(1, Math.abs(sol.R_ohm - Math.abs(sol.X_ohm)));
    const zHalf = sol.Z_ohm * 0.5;
    const s2 = shuffleWithCorrect([
      zCorrect,
      `${E.fmtNum(zArith, 2)} Ω`,
      `${E.fmtNum(zDiff, 2)} Ω`,
      `${E.fmtNum(zHalf, 2)} Ω`
    ], zCorrect, [
      `${E.fmtNum(sol.R_ohm + sol.XL_ohm + sol.XC_ohm, 2)} Ω`,
      `${E.fmtNum(sol.Z_ohm * 2, 2)} Ω`,
      `${E.fmtNum(sol.Z_ohm + 30, 2)} Ω`
    ]);
    steps.push({
      title: `שלב 2: עכבה ${L('Z')}`,
      questionHtml: `לפי משולש העכבות (${L(`R = ${E.fmtNum(sol.R_ohm, 1)} Ω`)}, ${L(`|X| = ${E.fmtNum(sol.absX_ohm, 1)} Ω`)}), מהי העכבה ${L('Z')}?`,
      optionsHtml: s2.options.map(o => L(o)),
      correctIndex: s2.correctIndex,
      explainHtml: `משתמשים בפיתגורס: ${L(`Z = √(R² + X²) = ${zCorrect}`)} (ולא סכום אריתמטי ${L(`${E.fmtNum(zArith, 1)} Ω`)})!`
    });

    // Step 3: Current I = U / Z
    const iCorrect = E.fmtCurrent(sol.Ieff);
    const iByR = E.fmtCurrent(sol.Ueff / sol.R_ohm);
    const iByMax = E.fmtCurrent(sol.Imax);
    const iWrong10 = E.fmtCurrent(sol.Ieff * 0.1);
    const s3 = shuffleWithCorrect([iCorrect, iByR, iByMax, iWrong10], iCorrect, [
      E.fmtCurrent(sol.Ieff * 0.5),
      E.fmtCurrent(sol.Ieff * 2),
      E.fmtCurrent(sol.Ieff * 0.25)
    ]);
    steps.push({
      title: `שלב 3: זרם ${L('I')}`,
      questionHtml: `מהו הזרם האפקטיבי ${L('I = U / Z')} עבור ${L(`U = ${E.fmtNum(sol.Ueff, 2)} V`)}?`,
      optionsHtml: s3.options.map(o => L(o)),
      correctIndex: s3.correctIndex,
      explainHtml: `מחלקים מתח אפקטיבי בעכבה הכוללת: ${L(`I = ${E.fmtNum(sol.Ueff, 2)} / ${E.fmtNum(sol.Z_ohm, 2)} = ${iCorrect}`)}.`
    });

    // Step 4: Phase & Circuit Character
    const pCorrect = `${E.fmtDeg(sol.phi_deg)} (${sol.character === 'inductive' ? 'השראי' : sol.character === 'capacitive' ? 'קיבולי' : 'תהודה'})`;
    const pOpp = `${E.fmtDeg(-sol.phi_deg || 45)} (${sol.character === 'inductive' ? 'קיבולי' : 'השראי'})`;
    const pZero = `0° (אוהמי טהור)`;
    const pComp = `${E.fmtDeg((sol.phi_deg >= 0 ? 1 : -1) * (90 - Math.abs(sol.phi_deg)))} (משלימה ל-90°)`;
    const s4 = shuffleWithCorrect([pCorrect, pOpp, pZero, pComp], pCorrect, [
      `-45° (קיבולי)`,
      `+90° (השראי טהור)`,
      `-90° (קיבולי טהור)`
    ]);
    steps.push({
      title: `שלב 4: מופע ${L('φ')}`,
      questionHtml: `מהי זווית המופע ${L('φ = tan⁻¹(X / R)')} ואופי המעגל?`,
      optionsHtml: s4.options.map(o => T(o)),
      correctIndex: s4.correctIndex,
      explainHtml: `הזווית מקבלת את סימן ${L('X = XL − XC')}: במעגל השראי ${L('φ > 0°')}, בקיבולי ${L('φ < 0°')}, ובתהודה ${L('φ = 0°')}.`
    });

    return steps;
  }

  /**
   * Dedicated MC Drill Generator for Tab 3 -> Sub-tab 2
   */
  function generateMcDrillQuestion(mode = 'ueff_meters', circuitFilter = 'MIXED') {
    const triples = [
      [30, 40, 50], [60, 80, 100], [50, 120, 130], [80, 150, 170], [240, 70, 250]
    ];
    const [a, b, c] = triples[Math.floor(Math.random() * triples.length)];

    if (mode === 'ueff_meters') {
      const kind = Math.floor(Math.random() * 4);
      if (kind === 0) {
        // Sine equation u(t) = A*sqrt(2)*sin(omega*t) -> Ueff & f
        const ueff = [10, 15, 20, 25][Math.floor(Math.random() * 4)];
        const fHz = [500, 1000, 2000, 4000][Math.floor(Math.random() * 4)];
        const multPi = 2 * fHz;
        const correct = `U = ${ueff} V  |  f = ${fHz >= 1000 ? `${fHz / 1000} kHz` : `${fHz} Hz`}`;
        const { options, correctIndex } = shuffleWithCorrect([
          correct,
          `U = ${E.fmtNum(ueff * Math.SQRT2, 2)} V  |  f = ${fHz >= 1000 ? `${fHz / 1000} kHz` : `${fHz} Hz`}`,
          `U = ${ueff} V  |  f = ${multPi >= 1000 ? `${multPi / 1000} kHz` : `${multPi} Hz`}`,
          `U = ${E.fmtNum(ueff / Math.SQRT2, 2)} V  |  f = ${fHz >= 1000 ? `${fHz / 1000} kHz` : `${fHz} Hz`}`
        ], correct, [
          `U = ${ueff * 2} V  |  f = ${fHz} Hz`,
          `U = ${E.fmtNum(ueff / 2, 2)} V  |  f = ${fHz} Hz`
        ]);
        return {
          title: `חילוץ ${L('Ueff')} ו-${L('f')} מתוך משוואת ${L('u(t)')}`,
          promptHtml: `נתון מקור מתח ${L(`u(t) = ${ueff}·√2·sin(2π·${fHz}·t) [V]`)}. מהם המתח האפקטיבי והתדר?`,
          optionsHtml: options.map(o => L(o)),
          correctIndex,
          explainHtml: `משרעת השיא שלפני ה-${T('sin')} היא ${L(`${ueff}·√2 V`)}, לכן מחלקים ב-${L('√2')} ומקבלים ${L(`U = ${ueff} V`)}. המקדם של ${L('t')} הוא ${L(`ω = 2π·${fHz}`)}, ולכן ${L(`f = ${fHz} Hz`)}.`
        };
      } else if (kind === 1) {
        // Recognizing when voltage is ALREADY effective (Voltmeter reading)
        const vRead = [12, 18, 24, 30][Math.floor(Math.random() * 4)];
        const correct = `${vRead} V (כבר אפקטיבי — לא מחלקים ב-√2!)`;
        const { options, correctIndex } = shuffleWithCorrect([
          correct,
          `${E.fmtNum(vRead / Math.SQRT2, 2)} V (מחלקים ב-√2)`,
          `${E.fmtNum(vRead * Math.SQRT2, 2)} V (כופלים ב-√2)`,
          `${E.fmtNum(vRead / (2 * Math.SQRT2), 2)} V (מחלקים ב-2√2)`
        ], correct, [`${vRead * 2} V`, `${E.fmtNum(vRead / 2, 2)} V`]);
        return {
          title: `מתי המתח כבר אפקטיבי (${T('RMS')})?`,
          promptHtml: `מד-מתח אידיאלי המחובר במקביל לנגד במעגל ${T('AC')} מורה ${L(`${vRead} V`)}. באיזה ערך של ${L('UR')} משתמשים לחישוב הזרם ${L('I = UR / R')}?`,
          optionsHtml: options.map(o => T(o)),
          correctIndex,
          explainHtml: `מד-מתח ומד-זרם ב-${T('AC')} מודדים תמיד <strong>ערכים אפקטיביים</strong>! לכן ${L(`UR = ${vRead} V`)} בדיוק — אסור לחלק ב-${L('√2')}.`
        };
      } else if (kind === 2) {
        // Meter connection & deriving XL or XC = V_meter / I_meter
        const isCap = Math.random() > 0.5;
        const iVal = [0.2, 0.25, 0.5][Math.floor(Math.random() * 3)];
        const react = [40, 60, 80, 120][Math.floor(Math.random() * 4)];
        const vMeter = Number((iVal * react).toFixed(2));
        const compHe = isCap ? 'הקבל' : 'הסליל';
        const sym = isCap ? 'XC' : 'XL';
        const vSym = isCap ? 'UC' : 'UL';
        const correct = `מד-זרם בטור, מד-מתח במקביל ל${compHe}; ${sym} = ${E.fmtNum(react, 1)} Ω`;
        const { options, correctIndex } = shuffleWithCorrect([
          correct,
          `מד-זרם במקביל, מד-מתח בטור ל${compHe}; ${sym} = ${E.fmtNum(react, 1)} Ω`,
          `מד-זרם בטור, מד-מתח במקביל ל${compHe}; ${sym} = ${E.fmtNum(react / Math.SQRT2, 2)} Ω`,
          `מד-זרם בטור, מד-מתח במקביל ל${compHe}; ${sym} = ${E.fmtNum(vMeter * iVal, 2)} Ω`
        ], correct, [
          `מד-זרם בטור, מד-מתח בטור; ${sym} = ${E.fmtNum(react * 2, 1)} Ω`
        ]);
        return {
          title: `חיבור מדי זרם ומתח וחישוב היגב מקריאת מדים`,
          promptHtml: `רוצים למדוד את היגב ${compHe} (${L(sym)}) במעגל טורי. כיצד מחברים את המדים, ומהו ${L(sym)} אם הזרם הנמדד הוא ${L(`${iVal} A`)} והמתח על ${compHe} הוא ${L(`${vSym} = ${vMeter} V`)}?`,
          optionsHtml: options.map(o => T(o)),
          correctIndex,
          explainHtml: `מד-זרם מחברים תמיד <strong>בטור</strong>, ומד-מתח מחברים <strong>במקביל</strong> לרכיב הנמדד. לפי דף העזר: ${L(`${sym} = ${vSym} / I = ${vMeter} / ${iVal} = ${react} Ω`)}.`
        };
      } else {
        // Numeric sine equation without sqrt(2), e.g., u(t) = 311.13 sin(4000 t)
        const ueff = [15, 20, 30, 220][Math.floor(Math.random() * 4)];
        const umStr = E.fmtNum(ueff * Math.SQRT2, 2);
        const omega = [1000, 2000, 4000, 5000][Math.floor(Math.random() * 4)];
        const correct = `Ueff = ${ueff} V  |  ω = ${omega} rad/s`;
        const { options, correctIndex } = shuffleWithCorrect([
          correct,
          `Ueff = ${umStr} V  |  ω = ${omega} rad/s`,
          `Ueff = ${E.fmtNum((ueff * Math.SQRT2) / 2, 2)} V  |  ω = ${omega} rad/s`,
          `Ueff = ${ueff} V  |  f = ${omega} Hz`
        ], correct, [
          `Ueff = ${E.fmtNum(ueff * 2, 2)} V  |  ω = ${omega} rad/s`
        ]);
        return {
          title: `פענוח משוואת סינוס מספרית ${L('u(t) = Um·sin(ω·t)')}`,
          promptHtml: `בשאלה נתון ${L(`u(t) = ${umStr}·sin(${omega}·t) [V]`)}. מהם ${L('Ueff')} ו-${L('ω')}?`,
          optionsHtml: options.map(o => L(o)),
          correctIndex,
          explainHtml: `גם כשאין ${L('√2')} במשוואה, המספר לפני ה-${T('sin')} הוא ${L(`Um = ${umStr} V`)}. מחלקים ב-${L('√2')}: ${L(`Ueff = ${umStr} / √2 = ${ueff} V`)}. המקדם של ${L('t')} הוא ${L(`ω = ${omega} rad/s`)}.`
        };
      }
    }

    if (mode === 'resonance_eq') {
      const kind = Math.floor(Math.random() * 4);
      if (kind === 0) {
        // Resonance phasor diagram property
        const uSource = [10, 15, 20, 24][Math.floor(Math.random() * 4)];
        const uReact = [40, 60, 80, 120][Math.floor(Math.random() * 4)];
        const correct = `UL = UC = ${uReact} V מנוגדים ב-180° ומקזזים זה את זה; UR = ${uSource} V, φ = 0°`;
        const { options, correctIndex } = shuffleWithCorrect([
          correct,
          `UL ו-UC שניהם 0 V; UR = ${uSource} V, φ = +90°`,
          `UL + UC = ${uReact * 2} V; U = √(${uSource}² + ${uReact}²), φ = +45°`,
          `UR = 0 V וכל מתח המקור נופל על הסליל והקבל (${uSource} V)`
        ], correct, [
          `UL = ${uReact} V, UC = 0 V, φ = -90°`
        ]);
        return {
          title: `המשמעות של תהודה בדיאגרמת הפאזורים`,
          promptHtml: `מעגל ${T('RLC')} טורי המוזן ממקור ${L(`U = ${uSource} V`)} נמצא בתהודה, ומד-מתח על הסליל מורה ${L(`UL = ${uReact} V`)}. מה מתרחש בדיאגרמת הפאזורים?`,
          optionsHtml: options.map(o => T(o)),
          correctIndex,
          explainHtml: `בתהודה מתקיים ${L('XL = XC')} ולכן ${L(`UL = UC = ${uReact} V`)}. כיוון ש-${L('UL')} מצביע כלפי מעלה (${L('+90°')}) ו-${L('UC')} כלפי מטה (${L('-90°')}), הם <strong>מקזזים זה את זה</strong>, לכן פאזור המקור ${L('U')} מתלכד עם ${L(`UR = ${uSource} V`)} ו-${L('φ = 0°')}!`
        };
      } else if (kind === 1) {
        // Compute f0 from XL = XC
        const L_mH = [10, 40, 100, 250][Math.floor(Math.random() * 4)];
        const C_uF = [1, 4, 10, 25][Math.floor(Math.random() * 4)];
        const f0 = 1 / (2 * Math.PI * Math.sqrt((L_mH * 1e-3) * (C_uF * 1e-6)));
        const correct = `${E.fmtNum(f0, 2)} Hz`;
        const { options, correctIndex } = shuffleWithCorrect([
          correct,
          `${E.fmtNum(f0 / 1000, 3)} Hz`,
          `${E.fmtNum(f0 * 2 * Math.PI, 1)} Hz`,
          `${E.fmtNum(f0 * 2, 2)} Hz`
        ], correct, [`${E.fmtNum(f0 * 0.5, 2)} Hz`, `${E.fmtNum(f0 * 10, 1)} Hz`]);
        return {
          title: `חישוב תדר תהודה ממשוואת שוויון ההיגבים ${L('XL = XC')}`,
          promptHtml: `בהשוואת היגב המשרן להיגב הקבל (${L('2πf₀L = 1/(2πf₀C)')}) עבור ${L(`L = ${L_mH} mH`)} ו-${L(`C = ${C_uF} µF`)}, מהו תדר התהודה ${L('f₀')}?`,
          optionsHtml: options.map(o => L(o)),
          correctIndex,
          explainHtml: `משוויון ההיגבים ${L('XL = XC')} מחלצים ${L('f₀ = 1 / (2π√(LC))')}. ממירים ${L('mH → 10⁻³ H')} ו-${L('µF → 10⁻⁶ F')} ומקבלים ${L(correct)}.`
        };
      } else if (kind === 2) {
        // Find missing capacitor C for target f0 via XL = XC
        const L_mH = [20, 50, 100][Math.floor(Math.random() * 3)];
        const f_kHz = [1, 2][Math.floor(Math.random() * 2)];
        const f0 = f_kHz * 1000;
        const L_H = L_mH * 1e-3;
        const xl = 2 * Math.PI * f0 * L_H;
        const C_F = 1 / (2 * Math.PI * f0 * xl);
        const correct = E.fmtCapacitance(C_F);
        const { options, correctIndex } = shuffleWithCorrect([
          correct,
          E.fmtCapacitance(C_F * 1000),
          E.fmtCapacitance(C_F / 1000),
          E.fmtCapacitance(C_F * 2 * Math.PI)
        ], correct, [E.fmtCapacitance(C_F * 2), E.fmtCapacitance(C_F * 0.5)]);
        return {
          title: `מציאת קבל לתהודה דרך שוויון ההיגבים ${L('XL = XC')}`,
          promptHtml: `במעגל עם ${L(`L = ${L_mH} mH`)} נדרשת תהודה בתדר ${L(`f₀ = ${f_kHz} kHz`)}. איזה קבל ${L('C')} יש לחבר בטור כדי שיתקיים ${L('XL = XC')}?`,
          optionsHtml: options.map(o => L(o)),
          correctIndex,
          explainHtml: `שלב 1: ${L(`XL = 2π·f₀·L = ${E.fmtImpedance(xl)}`)}. שלב 2: בתהודה ${L(`XC = XL = ${E.fmtImpedance(xl)}`)}. שלב 3: ${L(`C = 1 / (2π·f₀·XC) = ${correct}`)}.`
        };
      } else {
        // Frequency shifted below/above f0 -> phasor character
        const below = Math.random() > 0.5;
        const f0 = [500, 800, 1000][Math.floor(Math.random() * 3)];
        const f = below ? f0 * 0.5 : f0 * 2;
        const correct = below
          ? `קיבולי (XC > XL ⇒ UC > UL), פאזור U מתחת לציר I (φ < 0°)`
          : `השראי (XL > XC ⇒ UL > UC), פאזור U מעל ציר I (φ > 0°)`;
        const { options, correctIndex } = shuffleWithCorrect([
          correct,
          below
            ? `השראי (XL > XC ⇒ UL > UC), פאזור U מעל ציר I (φ > 0°)`
            : `קיבולי (XC > XL ⇒ UC > UL), פאזור U מתחת לציר I (φ < 0°)`,
          `אוהמי (XL = XC עדיין מתקיים), הזרם נשאר במקסימום`,
          `אופי המעגל תלוי רק בנגד R ולא בתדר f`
        ], correct, [`לא ניתן לדעת ללא ערך הנגד R`]);
        return {
          title: `שינוי תדר ביחס לתדר התהודה ${L('f₀')} בדיאגרמת המחוגים`,
          promptHtml: `מעגל ${T('RLC')} שתדר התהודה שלו הוא ${L(`f₀ = ${f0} Hz`)} מוזן כעת בתדר ${L(`f = ${f} Hz`)}. כיצד נראית דיאגרמת הפאזורים?`,
          optionsHtml: options.map(o => T(o)),
          correctIndex,
          explainHtml: below
            ? `בתדר ${L('f < f₀')}, היגב הקבל ${L('XC')} גדל והיגב הסליל ${L('XL')} קטן ← ${L('UC > UL')} ולכן האופי <strong>קיבולי</strong> (${L('φ < 0°')}, ${T('ICE')}).`
            : `בתדר ${L('f > f₀')}, היגב הסליל ${L('XL')} גדל והיגב הקבל ${L('XC')} קטן ← ${L('UL > UC')} ולכן האופי <strong>השראי</strong> (${L('φ > 0°')}, ${T('ELI')}).`
        };
      }
    }

    if (mode === 'reactance') {
      const kind = Math.floor(Math.random() * 3);
      if (kind === 0) {
        const f_kHz = [1, 2, 4, 5][Math.floor(Math.random() * 4)];
        const L_mH = [10, 20, 50, 100][Math.floor(Math.random() * 4)];
        const xl = 2 * Math.PI * (f_kHz * 1000) * (L_mH * 1e-3);
        const correct = `${E.fmtNum(xl, 2)} Ω`;
        const { options, correctIndex } = shuffleWithCorrect([
          correct,
          `${E.fmtNum(xl * 1000, 1)} Ω`,
          `${E.fmtNum(xl / 1000, 3)} Ω`,
          `${E.fmtNum(1 / xl, 4)} Ω`
        ], correct, [`${E.fmtNum(xl * 2, 2)} Ω`, `${E.fmtNum(xl * 0.5, 2)} Ω`]);
        return {
          title: `המרת יחידות וחישוב ${L('XL = 2π·f·L')}`,
          promptHtml: `מהו היגב המשרן ${L(`L = ${L_mH} mH`)} בתדר ${L(`f = ${f_kHz} kHz`)}?`,
          optionsHtml: options.map(o => L(o)),
          correctIndex,
          explainHtml: `ממירים ליחידות יסוד: ${L(`${f_kHz} kHz = ${f_kHz * 1000} Hz`)} ו-${L(`${L_mH} mH = ${L_mH / 1000} H`)}. הכפלה ב-${L('2π')} נותנת ${L(correct)}.`
        };
      } else if (kind === 1) {
        const omega = [1000, 2000, 4000, 5000][Math.floor(Math.random() * 4)];
        const C_uF = [1, 2, 5, 10][Math.floor(Math.random() * 4)];
        const xc = 1 / (omega * C_uF * 1e-6);
        const correct = `${E.fmtNum(xc, 2)} Ω`;
        const { options, correctIndex } = shuffleWithCorrect([
          correct,
          `${E.fmtNum(omega * C_uF * 1e-6, 4)} Ω`,
          `${E.fmtNum(xc * 1000, 1)} Ω`,
          `${E.fmtNum(1 / (omega * C_uF), 5)} Ω`
        ], correct, [`${E.fmtNum(xc * 2, 2)} Ω`, `${E.fmtNum(xc * 0.5, 2)} Ω`]);
        return {
          title: `היגב קבל ${L('XC = 1 / (ω·C)')}`,
          promptHtml: `נתון קבל ${L(`C = ${C_uF} µF`)} בתדר זוויתי ${L(`ω = ${omega} rad/s`)}. מהו ${L('XC')}?`,
          optionsHtml: options.map(o => L(o)),
          correctIndex,
          explainHtml: `לא לשכוח ${L('1')} במונה ו-${L('10⁻⁶')}! ${L(`XC = 1 / (${omega} × ${C_uF}×10⁻⁶) = ${correct}`)}.`
        };
      } else {
        const xl = b + 30;
        const xc = 30;
        const z = c;
        const correct = `${z} Ω`;
        const { options, correctIndex } = shuffleWithCorrect([
          correct,
          `${a + xl + xc} Ω`,
          `${a + b} Ω`,
          `${Math.round(Math.hypot(a, xl + xc))} Ω`
        ], correct, [`${z * 2} Ω`, `${a + 10} Ω`]);
        return {
          title: `משולש העכבות ב-${T('RLC')} טורי`,
          promptHtml: `במעגל ${T('RLC')} טורי נתונים ${L(`R = ${a} Ω`)}, ${L(`XL = ${xl} Ω`)} ו-${L(`XC = ${xc} Ω`)}. מהי העכבה הכוללת ${L('Z')}?`,
          optionsHtml: options.map(o => L(o)),
          correctIndex,
          explainHtml: `מחסרים תחילה היגבים מנוגדים: ${L(`X = XL − XC = ${xl} − ${xc} = ${b} Ω`)}, ואז פיתגורס: ${L(`Z = √(${a}² + ${b}²) = ${correct}`)}.`
        };
      }
    }

    // 4-step guided breakdown of a random clean triple circuit
    const topo = circuitFilter === 'MIXED'
      ? ['RL', 'RC', 'RLC'][Math.floor(Math.random() * 3)]
      : circuitFilter;
    const xl = topo === 'RC' ? 0 : (topo === 'RL' ? b : b + 30);
    const xc = topo === 'RL' ? 0 : (topo === 'RC' ? b : 30);
    const ueff = c; // I = 1 A nicely!
    const syntheticEx = {
      labCfg: { topology: topo, inputMode: 'reactances', Ueff: ueff, f_Hz: 1000, R_ohm: a, XL_ohm: xl, XC_ohm: xc }
    };
    return {
      isMultiStep: true,
      title: `פירוק תרגיל ${T(topo)} ל-4 שלבים`,
      promptHtml: `מעגל ${T(topo)} טורי: ${L(`R = ${a} Ω`)}${xl ? `, ${L(`XL = ${xl} Ω`)}` : ''}${xc ? `, ${L(`XC = ${xc} Ω`)}` : ''}, ${L(`U = ${ueff} V`)}.`,
      steps: buildGuidedStepsForExercise(syntheticEx),
      labCfg: syntheticEx.labCfg
    };
  }

  /**
   * Infinite Random Numeric Exercise Generator for Tab 3 -> Sub-tab 3
   */
  function generateRandomExercise(circuitFilter = 'MIXED', difficulty = 'medium') {
    const triples = [
      [30, 40, 50],
      [60, 80, 100],
      [50, 120, 130],
      [80, 150, 170],
      [240, 70, 250]
    ];
    const [rBase, xBase, zBase] = triples[Math.floor(Math.random() * triples.length)];
    let topo = circuitFilter;
    if (topo === 'MIXED') {
      const pool = difficulty === 'basic' ? ['RL', 'RC'] : ['RL', 'RC', 'RLC'];
      topo = pool[Math.floor(Math.random() * pool.length)];
    }

    const iTarget = [0.2, 0.25, 0.5, 1][Math.floor(Math.random() * 4)];
    const ueff = Number((zBase * iTarget).toFixed(2));
    const f_Hz = 1000;
    const omega = 2 * Math.PI * f_Hz;

    let xl = 0;
    let xc = 0;
    if (topo === 'RL') {
      xl = xBase;
    } else if (topo === 'RC') {
      xc = xBase;
    } else {
      const inductiveBias = Math.random() > 0.45;
      const offset = [20, 30, 40][Math.floor(Math.random() * 3)];
      if (inductiveBias) {
        xc = offset;
        xl = xBase + offset;
      } else {
        xl = offset;
        xc = xBase + offset;
      }
    }

    const cfg = {
      topology: topo,
      inputMode: difficulty === 'bagrut' ? 'components' : 'reactances',
      Ueff: ueff,
      f_Hz,
      R_ohm: rBase,
      XL_ohm: xl,
      XC_ohm: xc,
      L_H: xl > 0 ? xl / omega : 0,
      C_F: xc > 0 ? 1 / (omega * xc) : 0
    };
    const sol = E.solveACCircuit(cfg);

    let givensHtml = '';
    if (difficulty === 'bagrut') {
      givensHtml = `מעגל ${T(topo)} טורי בתדר ${L(`f = 1 kHz`)} ומקור ${L(`U = ${E.fmtNum(ueff, 2)} V`)}: ${L(`R = ${rBase} Ω`)}${cfg.L_H > 0 ? `, ${L(`L = ${E.fmtInductance(cfg.L_H)}`)}` : ''}${cfg.C_F > 0 ? `, ${L(`C = ${E.fmtCapacitance(cfg.C_F)}`)}` : ''}.`;
    } else {
      givensHtml = `מעגל ${T(topo)} טורי עם ${L(`R = ${rBase} Ω`)}${xl > 0 ? `, ${L(`XL = ${xl} Ω`)}` : ''}${xc > 0 ? `, ${L(`XC = ${xc} Ω`)}` : ''}, ומקור מתח אפקטיבי ${L(`U = ${E.fmtNum(ueff, 2)} V`)} (${L('f = 1 kHz')}).`;
    }

    const subQuestions = [
      {
        id: 'z',
        promptHtml: `א. חשבו את העכבה הכוללת ${L('Z')} (${L('Ω')}).`,
        unit: 'Ω',
        expected: Number(sol.Z_ohm.toFixed(2)),
        traps: [{ val: rBase + Math.abs(sol.X_ohm), msgHtml: `אסור לחבר ${L('R + |X|')}! השתמשו בפיתגורס.` }]
      },
      {
        id: 'i',
        promptHtml: `ב. חשבו את הזרם האפקטיבי ${L('I')} (${L('mA')}).`,
        unit: 'mA',
        expected: Number(sol.Ieff_mA.toFixed(2)),
        traps: []
      },
      {
        id: 'ur',
        promptHtml: `ג. חשבו את המתח על הנגד ${L('UR')} (${L('V')}).`,
        unit: 'V',
        expected: Number(sol.UR.toFixed(2)),
        traps: []
      },
      {
        id: 'phi',
        promptHtml: `ד. חשבו את זווית המופע ${L('φ')} (${L('°')}).`,
        unit: '°',
        expected: Number(sol.phi_deg.toFixed(2)),
        traps: []
      }
    ];

    return {
      id: `rand-${Date.now()}`,
      category: 'random',
      badge: `תרגיל אקראי · ${topo}`,
      title: `תרגול ${T(topo)} (${difficulty === 'bagrut' ? 'רמת בגרות עם יחידות' : 'רמת תרגול'})`,
      givensHtml,
      labCfg: cfg,
      subQuestions,
      solutionLines: E.buildFullDerivation(sol).map(s => s.mathLines).join('\n\n')
    };
  }

  const ACContent = {
    UNIT_PREFIXES,
    PYTHAGOREAN_TRIPLES,
    FORMULA_SECTIONS,
    PITFALLS,
    SINE_DECODER_CASES,
    INTRO_COMPONENTS,
    INTRO_RLC_MODES,
    LAB_PRESETS,
    EXERCISES,
    buildGuidedStepsForExercise,
    generateMcDrillQuestion,
    generateRandomExercise
  };

  root.ACContent = ACContent;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ACContent;
  }
})(typeof window !== 'undefined' ? window : globalThis);
