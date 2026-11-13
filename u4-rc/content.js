/**
 * content.js — Hebrew educational content, formula reference, 12 curated U4/Bagrut exercises,
 * and randomized exercise generator (quiz questions excluded).
 */
(function (global) {
  'use strict';

  const E = global.RCEngine;
  const L = E.L;
  const T = E.T;

  const FORMULA_ROWS = [
    {
      section: 'הרשת, קירכהוף וקבוע הזמן',
      items: [
        { formula: 'E = VR + VC', desc: `קירכהוף בחוג: מתח המקור מתחלק בין הנגד לקבל בכל רגע` },
        { formula: 'I = VR / R', desc: `הזרם בחוג נקבע לפי המתח שנשאר על הנגד חלקי התנגדות החוג` },
        { formula: 'Vo = VC', desc: `ברשת ${T('LP')} המוצא הוא המתח על הקבל — אינו קופץ לעולם` },
        { formula: 'Vo = Vi - VC', desc: `ברשת ${T('HP')} המוצא הוא המתח על הנגד` },
        { formula: 'τ = R · C', desc: `קבוע הזמן: קובע את קצב הטעינה והפריקה (${L('kΩ·µF = ms')}, ${L('kΩ·nF = µs')})` },
        { formula: 'Δt = t - t₀', desc: `הזמן מתחילת הקטע — מהשינוי האחרון של המבוא או סגירת מפסק` }
      ]
    },
    {
      section: `רשת ${T('LP')} — המתח בזמן נתון והזמן עד מתח נתון`,
      items: [
        { formula: 'Vo = Vf + (V₀ - Vf)·e^(-Δt/τ)', desc: `נוסחה כללית בכל קטע של ${T('LP')}: ממתח התחלתי ${L('V₀')} אל סופי ${L('Vf')}` },
        { formula: 'Vo = Vi·(1 - e^(-Δt/τ))', desc: `טעינה מאפס אל ${L('Vi')}` },
        { formula: 'Vo = V₀·e^(-Δt/τ)', desc: `פריקה מ-${L('V₀')} אל ${L('0')}` },
        { formula: 'Δt = τ·ln((V₀ - Vf)/(V - Vf))', desc: `הזמן מרגע תחילת הקטע עד הגעה למתח ${L('V')}; התשובה היא ${L('t = t₀ + Δt')}` }
      ]
    },
    {
      section: `רשת ${T('HP')} — קפיצה, דעיכה לאפס וזמן עד מתח נתון`,
      items: [
        { formula: 'Vo(t₀⁺) = Vo(t₀⁻) + ΔVi', desc: `ברגע קפיצה במבוא: המוצא של ${T('HP')} קופץ בדיוק באותו גובה ובאותו כיוון` },
        { formula: 'Vo = Vo(t₀⁺)·e^(-Δt/τ)', desc: `בין קפיצות: המוצא של ${T('HP')} דועך תמיד אל ${L('0 V')}` },
        { formula: 'Δt = τ·ln(Vo(t₀⁺) / V)', desc: `מתי המוצא של ${T('HP')} מגיע ל-${L('V')} בדרכו אל האפס (${L('t = t₀ + Δt')})` }
      ]
    }
  ];

  const E_TABLE = [
    { ratio: '0.5', exp: '0.607', oneMinus: '0.393', note: `חצי דרך היא ב-${L('0.69τ')}` },
    { ratio: '1', exp: '0.368', oneMinus: '0.632', note: `${L('63.2%')} מהדרך הושלמה` },
    { ratio: '2', exp: '0.135', oneMinus: '0.865', note: `${L('86.5%')} מהדרך הושלמה` },
    { ratio: '3', exp: '0.050', oneMinus: '0.950', note: `${L('95%')} מהדרך הושלמה` },
    { ratio: '4', exp: '0.018', oneMinus: '0.982', note: `כמעט במצב מתמיד` },
    { ratio: '5', exp: '0.007', oneMinus: '0.993', note: `סוף הקטע — מצב מתמיד מעשי` }
  ];

  const PITFALLS = [
    {
      title: `1. הצבת ${L('t')} במקום ${L('Δt')}`,
      wrong: `מציבים את הזמן הכולל ${L('t')} מתחילת הגרף ישירות בתוך המעריך ${L('e^(-t/τ)')}.`,
      fix: `תמיד מחשבים ${L('Δt = t - t₀')} מתחילת הקטע הנוכחי, ובשאלת 'מתי' מוסיפים בסוף ${L('t = t₀ + Δt')}.`
    },
    {
      title: `2. קפיצה ישירה אחרי סוף הדופק`,
      wrong: `מחפשים זמן או מתח אחרי סוף הדופק בנוסחה אחת מתחילת הדופק.`,
      fix: `אי אפשר לדלג מעל שינוי במבוא! חובה לחשב קודם את המתח בסוף הדופק (${L('t_end⁻')}), ורק משם להתחיל קטע חדש.`
    },
    {
      title: `3. ירידה ל-${L('-Vi')} בדיוק ב-${T('HP')}`,
      wrong: `חושבים שבירידת הדופק ב-${T('HP')} המוצא קופץ מיד למינוס גובה הדופק (למשל ${L('-10 V')}).`,
      fix: `המוצא יורד בגובה הקפיצה ${L('ΔVi')} מתוך הערך שאליו הספיק לדעוך לפני הירידה: ${L('Vo(t₀⁺) = Vo(t₀⁻) + ΔVi')}.`
    },
    {
      title: `4. מבוא קבוע שאינו אפס לפני הדופק`,
      wrong: `שוכחים שברשת ${T('LP')} הקבל נטען מראש לרמה הזאת, וב-${T('HP')} המוצא הוא ${L('0 V')} גם כשהמבוא ${L('2 V')}.`,
      fix: `במצב מתמיד לפני הדופק: ${L('Vo(LP) = Vi')}, ו-${L('Vo(HP) = 0 V')}. הקפיצה ב-${T('HP')} היא רק בגובה השינוי ${L('ΔVi')}.`
    },
    {
      title: `5. המנה בתוך ה-${T('ln')} קטנה מ-${L('1')}`,
      wrong: `מקבלים תשובה שלילית או שגיאת מחשבון ב-${T('ln')} ולא מבינים למה.`,
      fix: `אם המנה בתוך ה-${T('ln')} קטנה מ-${L('1')} (או שלילית), המתח פשוט אינו מגיע לערך המבוקש בקטע הזה!`
    }
  ];

  // 12 Curated Graded Exercises (Matches U4 meetings 16, 17, 19, 20 & Bagrut 2006–2025, excluding quiz problems!)
  const EXERCISES = [
    {
      id: 'ex-16-kvl',
      lessonTag: 'מפגש 16',
      category: 'm16',
      titleHe: '1. חוק קירכהוף בחוג וזרם בטעינה',
      sourceHe: 'מפגש 16 · בסיס והבנה',
      promptHe: `מעגל טעינה (רשת ${T('LP')}) מורכב מנגד ${L('R = 10 kΩ')} וקבל ריק ${L('C = 1 µF')}. ב-${L('t = 0')} מחברים למבוא מדרגת מתח ${L('E = 12 V')}.`,
      circuitConfig: {
        network: 'LP',
        R1_ohm: 10e3,
        C_F: 1e-6,
        timeUnit: 'ms',
        tViewStart_s: -5e-3,
        tViewEnd_s: 55e-3,
        preVi: 0,
        steadyState: true,
        transitions: [{ t_s: 0, Vi: 12, labelHe: 'טעינה מ-0V אל 12V' }]
      },
      subQuestions: [
        {
          id: 'q1',
          promptHe: `א. מהו קבוע הזמן ${L('τ')} של המעגל?`,
          unit: 'ms',
          expected: 10,
          hintHe: `הכפל ${L('R · C')}. זכור: ${L('kΩ · µF = ms')}.`,
          traps: [{ value: 0.01, messageHe: `חישבת בשניות (${L('0.01 s')}) במקום במילי-שניות (${L('ms')}).` }],
          pin: { t_s: 10e-3, v: 7.59, label: 'τ = 10ms' }
        },
        {
          id: 'q2',
          promptHe: `ב. ברגע הסגירה (${L('t = 0⁺')}), מהו המתח על הנגד ${L('VR')}?`,
          unit: 'V',
          expected: 12,
          hintHe: `הקבל ריק (${L('VC = 0 V')}) ומתנהג כקצר רגעי. השתמש בחוק קירכהוף ${L('E = VR + VC')}.`,
          traps: [{ value: 0, messageHe: `ב-${L('t = 0⁺')} המתח על הקבל הוא ${L('0 V')}, לכן כל מתח המקור נופל על הנגד!` }],
          pin: { t_s: 0, v: 0, label: 't=0+: VC=0V' }
        },
        {
          id: 'q3',
          promptHe: `ג. מהו הזרם המרבי בחוג ברגע הסגירה (${L('t = 0⁺')})?`,
          unit: 'mA',
          expected: 1.2,
          hintHe: `הזרם הוא המתח על הנגד חלקי התנגדות הנגד: ${L('I = VR / R')}.`,
          traps: [{ value: 0.0012, messageHe: `שים לב ליחידת התשובה המבוקשת: ${L('mA')}, ולא ${L('A')}.` }]
        },
        {
          id: 'q4',
          promptHe: `ד. אחרי ${L('τ')} אחד הקבל מגיע ל-${L('VC = 7.6 V')}. מהו המתח שנשאר על הנגד ${L('VR')} באותו רגע?`,
          unit: 'V',
          expected: 4.4,
          hintHe: `לפי קירכהוף בכל רגע: ${L('VR = E - VC')}.`,
          traps: [{ value: 7.6, messageHe: `זהו המתח על הקבל ${L('VC')} — ביקשו את המתח על הנגד ${L('VR = E - VC')}.` }],
          pin: { t_s: 10e-3, v: 7.6, label: 'VC=7.6V' }
        }
      ],
      solutionSteps: [
        {
          titleHe: `א. חישוב קבוע הזמן`,
          formulaLtr: `τ = R · C`,
          substitutionLtr: `τ = 10 kΩ · 1 µF`,
          resultLtr: `τ = 10 ms`,
          noteHe: `קילו-אוהם כפול מיקרו-פאראד נותן תמיד מילי-שניות.`
        },
        {
          titleHe: `ב-ג. ברגע הסגירה (${L('t = 0⁺')})`,
          formulaLtr: `E = VR + VC  ;  I₀ = VR / R`,
          substitutionLtr: `VC(0⁺) = 0 V  ⇒  VR(0⁺) = 12 V - 0 V = 12 V\nI₀ = 12 V / 10 kΩ`,
          resultLtr: `VR = 12 V  ;  I₀ = 1.2 mA`,
          noteHe: `קבל ריק מתנהג ברגע הסגירה כמו חוט קצר, והזרם מרבי.`
        },
        {
          titleHe: `ד. קירכהוף אחרי ${L('τ')} אחד`,
          formulaLtr: `VR = E - VC`,
          substitutionLtr: `VR = 12 V - 7.6 V`,
          resultLtr: `VR = 4.4 V`,
          noteHe: `ככל ש-${L('VC')} עולה, המתח על הנגד ${L('VR')} קטן והזרם יורד (${L('0.44 mA')}).`
        }
      ]
    },
    {
      id: 'ex-16-1',
      lessonTag: 'מפגש 16',
      category: 'm16',
      titleHe: '2. טעינה מאפס — מתי המוצא מגיע ל-9V?',
      sourceHe: 'מפגש 16 · תרגיל העמקה 1',
      promptHe: `ברשת ${T('LP')} עם ${L('R = 4.7 kΩ')} ו-${L('C = 1 µF')}, הקבל ריק. בזמן ${L('t = 0')} מגיעה למבוא מדרגה של ${L('12 V')}.`,
      circuitConfig: {
        network: 'LP',
        R1_ohm: 4.7e3,
        C_F: 1e-6,
        timeUnit: 'ms',
        tViewStart_s: -2e-3,
        tViewEnd_s: 25e-3,
        preVi: 0,
        steadyState: true,
        transitions: [{ t_s: 0, Vi: 12, labelHe: 'טעינה מ-0V אל 12V' }]
      },
      subQuestions: [
        {
          id: 'q1',
          promptHe: `א. חשבו את קבוע הזמן ${L('τ')}:`,
          unit: 'ms',
          expected: 4.7,
          hintHe: `הכפל ${L('4.7 kΩ · 1 µF')}.`,
          pin: { t_s: 4.7e-3, v: 7.59, label: 'τ = 4.7ms' }
        },
        {
          id: 'q2',
          promptHe: `ב. מתי מתח המוצא מגיע ל-${L('9 V')}?`,
          unit: 'ms',
          expected: 6.52,
          isTimeQuestion: true,
          dtDisplay: 6.52,
          hintHe: `השתמש בנוסחת הזמן בטעינה מאפס: ${L('Δt = τ · ln(Vi / (Vi - V))')}.`,
          traps: [
            { value: 1.39, messageHe: `חישבת רק את ${L('ln(12 / 3) = 1.39')}, שכחת להכפיל ב-${L('τ = 4.7 ms')}!` }
          ],
          pin: { t_s: 6.5156e-3, v: 9, label: 't=6.52ms (9V)', targetLineV: 9 }
        }
      ],
      solutionSteps: [
        {
          titleHe: `א. קבוע הזמן`,
          formulaLtr: `τ = R · C`,
          substitutionLtr: `τ = 4.7 kΩ · 1 µF`,
          resultLtr: `τ = 4.7 ms`,
          noteHe: ''
        },
        {
          titleHe: `ב. זמן ההגעה ל-${L('9 V')}`,
          formulaLtr: `Δt = τ · ln(Vi / (Vi - V))  ;  t = t₀ + Δt`,
          substitutionLtr: `Δt = 4.7 ms · ln(12 V / (12 V - 9 V)) = 4.7 ms · ln(4)\nt = 0 + 6.52 ms`,
          resultLtr: `t = 6.52 ms`,
          noteHe: `שימו לב שהמנה בתוך ה-${T('ln')} היא ${L('4 > 1')}.`
        }
      ]
    },
    {
      id: 'ex-16-2',
      lessonTag: 'מפגש 16',
      category: 'm16',
      titleHe: '3. פריקה אל אפס — זמן לפי מתח',
      sourceHe: 'מפגש 16 · תרגיל העמקה 2',
      promptHe: `ברשת ${T('LP')} עם ${L('R = 2 kΩ')} ו-${L('C = 5 µF')}, המבוא נמצא על ${L('10 V')} במשך זמן רב, וב-${L('t = 0')} הוא יורד ל-${L('0 V')}.`,
      circuitConfig: {
        network: 'LP',
        R1_ohm: 2e3,
        C_F: 5e-6,
        timeUnit: 'ms',
        tViewStart_s: -10e-3,
        tViewEnd_s: 55e-3,
        preVi: 10,
        steadyState: true,
        transitions: [{ t_s: 0, Vi: 0, labelHe: 'פריקה מ-10V אל 0V' }]
      },
      subQuestions: [
        {
          id: 'q1',
          promptHe: `א. מהו קבוע הזמן ${L('τ')}?`,
          unit: 'ms',
          expected: 10,
          hintHe: `הכפל ${L('2 kΩ · 5 µF')}.`
        },
        {
          id: 'q2',
          promptHe: `ב. מתי מתח המוצא יורד ל-${L('1 V')}?`,
          unit: 'ms',
          expected: 23.03,
          isTimeQuestion: true,
          dtDisplay: 23.03,
          hintHe: `בירידה אל אפס: ${L('Δt = τ · ln(V₀ / V)')}, כאשר ${L('V₀ = 10 V')}.`,
          traps: [
            { value: 1.05, messageHe: `נראה שחישבת ${L('ln(10 / 9)')} במקום ${L('ln(10 / 1)')}!` }
          ],
          pin: { t_s: 23.0258e-3, v: 1, label: 't=23.03ms (1V)', targetLineV: 1 }
        }
      ],
      solutionSteps: [
        {
          titleHe: `א. קבוע הזמן`,
          formulaLtr: `τ = R · C`,
          substitutionLtr: `τ = 2 kΩ · 5 µF`,
          resultLtr: `τ = 10 ms`,
          noteHe: `בגלל שהמבוא היה ${L('10 V')} זמן רב, הקבל התחיל ב-${L('V₀ = 10 V')}.`
        },
        {
          titleHe: `ב. זמן הפריקה עד ${L('1 V')}`,
          formulaLtr: `Δt = τ · ln(V₀ / V)`,
          substitutionLtr: `Δt = 10 ms · ln(10 V / 1 V) = 10 ms · 2.303`,
          resultLtr: `t = 23.03 ms`,
          noteHe: `כלל אצבע: ירידה ל-${L('10%')} (או עלייה ל-${L('90%')}) לוקחת תמיד ${L('2.3τ')}.`
        }
      ]
    },
    {
      id: 'ex-16-3',
      lessonTag: 'מפגש 16',
      category: 'm16',
      titleHe: '4. מעבר מרמה שלילית דרך 0V',
      sourceHe: 'מפגש 16 · תרגיל העמקה 3',
      promptHe: `רשת ${T('LP')} עם ${L('R = 1 kΩ')} ו-${L('C = 2 µF')}. המבוא נמצא על ${L('-4 V')} במשך זמן רב, וב-${L('t = 0')} הוא עולה ל-${L('+8 V')}. מתי מתח המוצא עובר דרך ${L('0 V')}?`,
      circuitConfig: {
        network: 'LP',
        R1_ohm: 1e3,
        C_F: 2e-6,
        timeUnit: 'ms',
        tViewStart_s: -2e-3,
        tViewEnd_s: 12e-3,
        preVi: -4,
        steadyState: true,
        transitions: [{ t_s: 0, Vi: 8, labelHe: 'עלייה מ-(-4V) אל +8V' }]
      },
      subQuestions: [
        {
          id: 'q1',
          promptHe: `א. חשבו את קבוע הזמן ${L('τ')}:`,
          unit: 'ms',
          expected: 2,
          hintHe: `${L('τ = 1 kΩ · 2 µF')}.`
        },
        {
          id: 'q2',
          promptHe: `ב. מתי מתח המוצא חוצה את ${L('0 V')}?`,
          unit: 'ms',
          expected: 0.81,
          isTimeQuestion: true,
          dtDisplay: 0.81,
          hintHe: `כאן חובה להשתמש בנוסחה הכללית: ${L('V₀ = -4 V')}, ${L('Vf = +8 V')}, ${L('V = 0 V')}.`,
          traps: [
            { value: 1.39, messageHe: `זהירות עם הסימנים! במונה צריך להיות ${L('V₀ - Vf = -4 - 8 = -12')}, ובמכנה ${L('V - Vf = 0 - 8 = -8')}.` }
          ],
          pin: { t_s: 0.8109e-3, v: 0, label: 't=0.81ms (0V)', targetLineV: 0 }
        }
      ],
      solutionSteps: [
        {
          titleHe: `א. קבוע הזמן`,
          formulaLtr: `τ = R · C`,
          substitutionLtr: `τ = 1 kΩ · 2 µF`,
          resultLtr: `τ = 2 ms`,
          noteHe: `לפני ${L('t = 0')} הקבל היה טעון למבוא: ${L('V₀ = -4 V')}.`
        },
        {
          titleHe: `ב. זמן החצייה של ${L('0 V')}`,
          formulaLtr: `Δt = τ · ln((V₀ - Vf) / (V - Vf))`,
          substitutionLtr: `Δt = 2 ms · ln((-4 - 8) / (0 - 8)) = 2 ms · ln(-12 / -8) = 2 ms · ln(1.5)`,
          resultLtr: `t = 0.81 ms`,
          noteHe: `המתח מתחיל מ-${L('-4 V')} בדרכו ל-${L('+8 V')} וחוצה את האפס כבר בשליש הראשון של הדרך.`
        }
      ]
    },
    {
      id: 'ex-17-2008',
      lessonTag: 'מפגש 17 · בגרות',
      category: 'lp',
      titleHe: '5. בגרות 2008, שאלה 2 — דופק קצר ברשת LP',
      sourceHe: 'בגרות 2008 · שאלה 2',
      promptHe: `למבוא רשת ${T('LP')} עם ${L('R = 10 kΩ')} ו-${L('C = 0.1 µF')} מספקים דופק של ${L('4 V')} בין ${L('t = 1 ms')} ל-${L('t = 2 ms')}.`,
      circuitConfig: {
        network: 'LP',
        R1_ohm: 10e3,
        C_F: 0.1e-6,
        timeUnit: 'ms',
        tViewStart_s: 0,
        tViewEnd_s: 6e-3,
        preVi: 0,
        steadyState: true,
        transitions: [
          { t_s: 1e-3, Vi: 4, labelHe: 'טעינה בזמן הדופק' },
          { t_s: 2e-3, Vi: 0, labelHe: 'פריקה אחרי הדופק' }
        ]
      },
      subQuestions: [
        {
          id: 'q1',
          promptHe: `א. מהו קבוע הזמן ${L('τ')}?`,
          unit: 'ms',
          expected: 1,
          hintHe: `${L('10 kΩ · 0.1 µF')}.`
        },
        {
          id: 'q2',
          promptHe: `ב. חשבו את מתח המוצא בסוף הדופק, בזמן ${L('t = 2 ms')}:`,
          unit: 'V',
          expected: 2.53,
          hintHe: `שימו לב שהדופק התחיל ב-${L('t₀ = 1 ms')}, לכן ${L('Δt = 2 - 1 = 1 ms = τ')}.`,
          traps: [
            { value: 3.46, messageHe: `הצבת ${L('t = 2 ms')} במקום ${L('Δt = 2 - 1 = 1 ms')}! המדידה מתחילה רק כשהדופק מתחיל ב-${L('1 ms')}.` }
          ],
          pin: { t_s: 2e-3, v: 2.528, label: 'Vo(2ms)=2.53V' }
        },
        {
          id: 'q3',
          promptHe: `ג. חשבו את מתח המוצא בזמן ${L('t = 3 ms')}:`,
          unit: 'V',
          expected: 0.93,
          hintHe: `קטע חדש מתחיל ב-${L('t₀ = 2 ms')} מ-${L('V₀ = 2.53 V')} אל ${L('Vf = 0 V')}, במשך ${L('Δt = 1 ms')}.`,
          traps: [
            { value: 1.47, messageHe: `נראה שהתחלת מ-${L('4 V')} במקום מהערך שאליו הקבל הגיע בפועל בסוף הדופק (${L('2.53 V')})!` }
          ],
          pin: { t_s: 3e-3, v: 0.93, label: 'Vo(3ms)=0.93V' }
        }
      ],
      solutionSteps: [
        {
          titleHe: `א. קבוע הזמן`,
          formulaLtr: `τ = R · C`,
          substitutionLtr: `τ = 10 kΩ · 0.1 µF`,
          resultLtr: `τ = 1 ms`,
          noteHe: `לפני ${L('1 ms')} המבוא אפס ולכן ${L('Vo(1ms⁻) = 0 V')}.`
        },
        {
          titleHe: `ב. מתח המוצא בסוף הדופק (${L('t = 2 ms')})`,
          formulaLtr: `Δt = t - t₀  ;  Vo = Vf + (V₀ - Vf)·e^(-Δt/τ)`,
          substitutionLtr: `Δt = 2 ms - 1 ms = 1 ms\nVo(2ms) = 4 + (0 - 4)·e^(-1 / 1) = 4·(1 - 0.368)`,
          resultLtr: `Vo(2ms) = 2.53 V`,
          noteHe: `כיון שאורך הדופק הוא בדיוק ${L('τ')}, הקבל מגיע ל-${L('63.2%')} מ-${L('4 V')}.`
        },
        {
          titleHe: `ג. מתח המוצא בזמן ${L('t = 3 ms')}`,
          formulaLtr: `Vo = V₀ · e^(-Δt / τ)`,
          substitutionLtr: `Δt = 3 ms - 2 ms = 1 ms\nVo(3ms) = 2.53 V · e^(-1 / 1) = 2.53 · 0.368`,
          resultLtr: `Vo(3ms) = 0.93 V`,
          noteHe: `אחרי ${L('τ')} אחד של פריקה נשארים ${L('36.8%')} מהמתח שהיה בסוף הדופק.`
        }
      ]
    },
    {
      id: 'ex-17-2006',
      lessonTag: 'מפגשים 16–17 · בגרות',
      category: 'lp',
      titleHe: '6. בגרות 2006, שאלה 3 — מתח מרבי וזמן ב-LP',
      sourceHe: 'בגרות 2006 · שאלה 3',
      promptHe: `לרשת ${T('LP')} עם ${L('R = 10 kΩ')} ו-${L('C = 1 µF')} מספקים דופק שעוצמתו ${L('10 V')} ורוחבו ${L('8 ms')} (מ-${L('t = 0')} עד ${L('t = 8 ms')}).`,
      circuitConfig: {
        network: 'LP',
        R1_ohm: 10e3,
        C_F: 1e-6,
        timeUnit: 'ms',
        tViewStart_s: -2e-3,
        tViewEnd_s: 36e-3,
        preVi: 0,
        steadyState: true,
        transitions: [
          { t_s: 0, Vi: 10, labelHe: 'טעינה בזמן הדופק' },
          { t_s: 8e-3, Vi: 0, labelHe: 'פריקה אחרי הדופק' }
        ]
      },
      subQuestions: [
        {
          id: 'q1',
          promptHe: `א. חשבו את המתח המרבי שהקבל נטען אליו (בסוף הדופק, ${L('t = 8 ms')}):`,
          unit: 'V',
          expected: 5.51,
          hintHe: `${L('τ = 10 ms')}. חשבו ${L('Vo(8ms) = 10·(1 - e^(-8/10))')}.`,
          pin: { t_s: 8e-3, v: 5.507, label: 'Vmax=5.51V' }
        },
        {
          id: 'q2',
          promptHe: `ב. חשבו את מתח המוצא כאשר ${L('t = 10 ms')}:`,
          unit: 'V',
          expected: 4.51,
          hintHe: `קטע הפריקה מתחיל ב-${L('t₀ = 8 ms')} מהמתח ${L('5.51 V')}, לכן ${L('Δt = 10 - 8 = 2 ms')}.`,
          traps: [
            { value: 3.68, messageHe: `זהירות! הצבת ${L('t = 10 ms')} בנוסחה אחת או שהתחלת מ-${L('10 V')} במקום ${L('5.51 V')}!` }
          ],
          pin: { t_s: 10e-3, v: 4.509, label: 'Vo(10ms)=4.51V' }
        },
        {
          id: 'q3',
          promptHe: `ג. (העמקה) מתי, בזמן הדופק, מגיע מתח המוצא ל-${L('4 V')}?`,
          unit: 'ms',
          expected: 5.11,
          isTimeQuestion: true,
          dtDisplay: 5.11,
          hintHe: `בזמן הדופק הטעינה היא מאפס אל ${L('10 V')}: ${L('Δt = τ · ln(10 / (10 - 4))')}.`,
          pin: { t_s: 5.108e-3, v: 4, label: 't=5.11ms (4V)', targetLineV: 4 }
        }
      ],
      solutionSteps: [
        {
          titleHe: `א. קבוע הזמן והמתח המרבי`,
          formulaLtr: `τ = R · C  ;  Vo = Vi · (1 - e^(-Δt / τ))`,
          substitutionLtr: `τ = 10 kΩ · 1 µF = 10 ms\nVo(8ms) = 10 V · (1 - e^(-8 / 10))`,
          resultLtr: `Vmax = 5.51 V`,
          noteHe: `השיא הוא תמיד בסוף הדופק, כי מיד אחר כך מתחילה פריקה.`
        },
        {
          titleHe: `ב. המתח ב-${L('t = 10 ms')}`,
          formulaLtr: `Vo = V₀ · e^(-Δt / τ)`,
          substitutionLtr: `Δt = 10 ms - 8 ms = 2 ms\nVo(10ms) = 5.51 V · e^(-2 / 10)`,
          resultLtr: `Vo(10ms) = 4.51 V`,
          noteHe: ''
        },
        {
          titleHe: `ג. מתי המוצא מגיע ל-${L('4 V')} בזמן הדופק`,
          formulaLtr: `Δt = τ · ln(Vi / (Vi - V))`,
          substitutionLtr: `Δt = 10 ms · ln(10 / (10 - 4)) = 10 ms · ln(1.667)`,
          resultLtr: `t = 5.11 ms`,
          noteHe: `כיון ש-${L('5.11 ms < 8 ms')}, המוצא אכן מספיק להגיע ל-${L('4 V')} לפני שהדופק נגמר.`
        }
      ]
    },
    {
      id: 'ex-17-2009',
      lessonTag: 'מפגשים 16–17 · בגרות',
      category: 'lp',
      titleHe: '7. בגרות 2009, שאלה 2 — דופק מרמה שלילית ב-LP',
      sourceHe: 'בגרות 2009 · שאלה 2',
      promptHe: `לרשת ${T('LP')} עם ${L('R = 1 kΩ')} ו-${L('C = 1 µF')} מספקים אות מבוא הנמצא זמן רב על ${L('-2 V')}, קופץ ל-${L('+6 V')} בין ${L('t = 2 ms')} ל-${L('t = 4 ms')}, וחוזר ל-${L('-2 V')}.`,
      circuitConfig: {
        network: 'LP',
        R1_ohm: 1e3,
        C_F: 1e-6,
        timeUnit: 'ms',
        tViewStart_s: 0,
        tViewEnd_s: 10e-3,
        preVi: -2,
        steadyState: true,
        transitions: [
          { t_s: 2e-3, Vi: 6, labelHe: 'עלייה מ-(-2V) אל +6V' },
          { t_s: 4e-3, Vi: -2, labelHe: 'ירידה חזרה אל -2V' }
        ]
      },
      subQuestions: [
        {
          id: 'q1',
          promptHe: `א. חשבו את מתח המוצא בזמן ${L('t = 4 ms')}:`,
          unit: 'V',
          expected: 4.92,
          hintHe: `${L('τ = 1 ms')}. הקטע מתחיל ב-${L('t₀ = 2 ms')} מ-${L('V₀ = -2 V')} ושואף ל-${L('Vf = +6 V')}.`,
          traps: [
            { value: 5.19, messageHe: `בדוק את ${L('V₀')}! לפני הדופק המבוא היה ${L('-2 V')}, ולכן הקבל התחיל מ-${L('-2 V')} ולא מ-${L('0 V')}.` }
          ],
          pin: { t_s: 4e-3, v: 4.917, label: 'Vo(4ms)=4.92V' }
        },
        {
          id: 'q2',
          promptHe: `ב. חשבו את מתח המוצא בזמן ${L('t = 8 ms')}:`,
          unit: 'V',
          expected: -1.87,
          hintHe: `הירידה מתחילה ב-${L('t₀ = 4 ms')} מ-${L('V₀ = 4.92 V')} אל ${L('Vf = -2 V')}! שים לב ש-${L('Δt = 4 ms')}.`,
          traps: [
            { value: 0.09, messageHe: `נראה ששכחת ש-${L('Vf = -2 V')} (ולא ${L('0 V')})!` }
          ],
          pin: { t_s: 8e-3, v: -1.873, label: 'Vo(8ms)=-1.87V' }
        },
        {
          id: 'q3',
          promptHe: `ג. (העמקה) מתי, אחרי סוף הדופק, עובר מתח המוצא דרך ${L('0 V')}?`,
          unit: 'ms',
          expected: 5.24,
          isTimeQuestion: true,
          dtDisplay: 1.24,
          hintHe: `חשבו ${L('Δt')} מ-${L('V₀ = 4.92 V')} אל ${L('Vf = -2 V')} עבור ${L('V = 0 V')}, ואל תשכחו להוסיף ${L('t₀ = 4 ms')}!`,
          pin: { t_s: 5.241e-3, v: 0, label: 't=5.24ms (0V)', targetLineV: 0 }
        }
      ],
      solutionSteps: [
        {
          titleHe: `א. קבוע הזמן והמוצא בסוף הדופק (${L('t = 4 ms')})`,
          formulaLtr: `τ = R · C  ;  Vo = Vf + (V₀ - Vf)·e^(-Δt / τ)`,
          substitutionLtr: `τ = 1 kΩ · 1 µF = 1 ms\nΔt = 4 ms - 2 ms = 2 ms\nVo(4ms) = 6 + (-2 - 6)·e^(-2 / 1) = 6 - 8·0.1353`,
          resultLtr: `Vo(4ms) = 4.92 V`,
          noteHe: `שימו לב שהתחלנו מ-${L('V₀ = -2 V')} כי המבוא היה שם זמן רב.`
        },
        {
          titleHe: `ב. המוצא ב-${L('t = 8 ms')}`,
          formulaLtr: `Vo = Vf + (V₀ - Vf)·e^(-Δt / τ)`,
          substitutionLtr: `Δt = 8 ms - 4 ms = 4 ms\nVo(8ms) = -2 + (4.92 - (-2))·e^(-4 / 1) = -2 + 6.92·0.0183`,
          resultLtr: `Vo(8ms) = -1.87 V`,
          noteHe: `המוצא יורד לכיוון ${L('-2 V')}, ולא אל ${L('0 V')}.`
        },
        {
          titleHe: `ג. מתי עובר המוצא דרך ${L('0 V')} אחרי הדופק`,
          formulaLtr: `Δt = τ · ln((V₀ - Vf) / (V - Vf))  ;  t = t₀ + Δt`,
          substitutionLtr: `Δt = 1 ms · ln((4.92 - (-2)) / (0 - (-2))) = 1 ms · ln(6.92 / 2) = 1.24 ms\nt = 4 ms + 1.24 ms`,
          resultLtr: `t = 5.24 ms`,
          noteHe: `זכרו תמיד להוסיף את ${L('t₀ = 4 ms')}!`
        }
      ]
    },
    {
      id: 'ex-17-2021',
      lessonTag: 'מפגש 17 · בגרות',
      category: 'lp',
      titleHe: '8. בגרות 2021, שאלה 5 — דופק והקטנת הנגד לחצי',
      sourceHe: 'בגרות 2021 · שאלה 5',
      promptHe: `לרשת ${T('LP')} עם ${L('R = 4 kΩ')} ו-${L('C = 2 µF')} מספקים דופק של ${L('5 V')} בין ${L('t = 0')} ל-${L('t = 10 ms')}.`,
      circuitConfig: {
        network: 'LP',
        R1_ohm: 4e3,
        C_F: 2e-6,
        timeUnit: 'ms',
        tViewStart_s: -2e-3,
        tViewEnd_s: 32e-3,
        preVi: 0,
        steadyState: true,
        transitions: [
          { t_s: 0, Vi: 5, labelHe: 'טעינה בזמן הדופק' },
          { t_s: 10e-3, Vi: 0, labelHe: 'פריקה אחרי הדופק' }
        ]
      },
      subQuestions: [
        {
          id: 'q1',
          promptHe: `א. חשבו את קבוע הזמן ${L('τ')} ואת המתח המרבי בסוף הדופק (${L('t = 10 ms')}):`,
          unit: 'V',
          expected: 3.57,
          hintHe: `תחילה ${L('τ = 4 kΩ · 2 µF = 8 ms')}, ואז ${L('Vo(10ms) = 5·(1 - e^(-10/8))')}.`,
          pin: { t_s: 10e-3, v: 3.567, label: 'Vo(10ms)=3.57V' }
        },
        {
          id: 'q2',
          promptHe: `ב. חשבו את מתח המוצא בזמן ${L('t = 15 ms')}:`,
          unit: 'V',
          expected: 1.91,
          hintHe: `פריקה מ-${L('3.57 V')} אל ${L('0 V')} במשך ${L('Δt = 15 - 10 = 5 ms')}.`,
          pin: { t_s: 15e-3, v: 1.91, label: 'Vo(15ms)=1.91V' }
        },
        {
          id: 'q3',
          promptHe: `ג. כעת מקטינים את הנגד לחצי (${L('R = 2 kΩ')}). מה יהיה כעת המתח המרבי בסוף הדופק (${L('t = 10 ms')})?`,
          unit: 'V',
          expected: 4.59,
          hintHe: `הקטנת הנגד לחצי מקטינה את ${L('τ')} לחצי (${L('4 ms')}) — הטעינה מהירה יותר!`,
          pin: { t_s: 10e-3, v: 3.567, label: 'לפני שינוי R' }
        }
      ],
      solutionSteps: [
        {
          titleHe: `א. קבוע הזמן והמתח המרבי`,
          formulaLtr: `τ = R · C  ;  Vo = Vi · (1 - e^(-Δt / τ))`,
          substitutionLtr: `τ = 4 kΩ · 2 µF = 8 ms\nVo(10ms) = 5 V · (1 - e^(-10 / 8))`,
          resultLtr: `Vo(10ms) = 3.57 V`,
          noteHe: ''
        },
        {
          titleHe: `ב. המתח ב-${L('t = 15 ms')}`,
          formulaLtr: `Vo = V₀ · e^(-Δt / τ)`,
          substitutionLtr: `Δt = 15 ms - 10 ms = 5 ms\nVo(15ms) = 3.57 V · e^(-5 / 8)`,
          resultLtr: `Vo(15ms) = 1.91 V`,
          noteHe: ''
        },
        {
          titleHe: `ג. השפעת הקטנת הנגד לחצי`,
          formulaLtr: `τ_new = (R / 2) · C`,
          substitutionLtr: `τ_new = 2 kΩ · 2 µF = 4 ms\nVo_new(10ms) = 5 V · (1 - e^(-10 / 4))`,
          resultLtr: `Vo_new(10ms) = 4.59 V`,
          noteHe: `נגד קטן יותר ← ${L('τ')} קטן יותר ← הקבל נטען מהר יותר ומגיע קרוב יותר ל-${L('5 V')}.`
        }
      ]
    },
    {
      id: 'ex-19-2016',
      lessonTag: 'מפגש 19 · בגרות',
      category: 'hp',
      titleHe: '9. בגרות 2016, שאלה 2 — קפיצה ומתח שלילי ברשת HP',
      sourceHe: 'בגרות 2016 · שאלה 2',
      promptHe: `למבוא רשת ${T('HP')} עם ${L('C = 2 µF')} ו-${L('R = 1 kΩ')} מספקים דופק של ${L('6 V')} בין ${L('t = 0')} ל-${L('t = 3 ms')}.`,
      circuitConfig: {
        network: 'HP',
        R1_ohm: 1e3,
        C_F: 2e-6,
        timeUnit: 'ms',
        tViewStart_s: -1e-3,
        tViewEnd_s: 10e-3,
        preVi: 0,
        steadyState: true,
        transitions: [
          { t_s: 0, Vi: 6, labelHe: 'קפיצה חיובית ודעיכה לאפס' },
          { t_s: 3e-3, Vi: 0, labelHe: 'קפיצה שלילית ודעיכה לאפס' }
        ]
      },
      subQuestions: [
        {
          id: 'q1',
          promptHe: `א. חשבו את קבוע הזמן ${L('τ')}:`,
          unit: 'ms',
          expected: 2,
          hintHe: `${L('τ = 1 kΩ · 2 µF')}.`
        },
        {
          id: 'q2',
          promptHe: `ב. חשבו את מתח המוצא בזמן ${L('t = 2 ms')}:`,
          unit: 'V',
          expected: 2.21,
          hintHe: `המוצא קופץ ב-${L('t = 0⁺')} ל-${L('6 V')} ודועך לאפס לפי ${L('Vo = 6·e^(-2/2)')}.`,
          traps: [
            { value: 3.79, messageHe: `חישבת את המתח על הקבל (${T('LP')}) במקום על הנגד (${T('HP')})! ב-${T('HP')} המוצא דועך אל אפס.` }
          ],
          pin: { t_s: 2e-3, v: 2.207, label: 'Vo(2ms)=2.21V' }
        },
        {
          id: 'q3',
          promptHe: `ג. מהו מתח המוצא מיד אחרי שהדופק יורד, ב-${L('t = 3 ms⁺')}?`,
          unit: 'V',
          expected: -4.66,
          hintHe: `קודם מצא לאן דעך המוצא ב-${L('3 ms⁻')}: ${L('6·e^(-3/2) = 1.34 V')}, ואז חסר ${L('6 V')}.`,
          traps: [
            { value: -6, messageHe: `טעות קלאסית ב-${T('HP')}! המוצא יורד ב-${L('6 V')} מתוך ${L('1.34 V')} שאליו דעך — לא מתוך ${L('0 V')}!` },
            { value: 1.34, messageHe: `זהו הערך רגע לפני הירידה (${L('3 ms⁻')}). כעת יש להוסיף את הקפיצה ${L('ΔVi = -6 V')}.` }
          ],
          pin: { t_s: 3e-3, v: -4.661, label: 'Vo(3ms+)=-4.66V' }
        },
        {
          id: 'q4',
          promptHe: `ד. חשבו את מתח המוצא בזמן ${L('t = 4 ms')}:`,
          unit: 'V',
          expected: -2.83,
          hintHe: `מ-${L('-4.66 V')} המוצא דועך לאפס במשך ${L('Δt = 4 - 3 = 1 ms')}.`,
          pin: { t_s: 4e-3, v: -2.827, label: 'Vo(4ms)=-2.83V' }
        }
      ],
      solutionSteps: [
        {
          titleHe: `א-ב. קבוע הזמן והמוצא ב-${L('t = 2 ms')}`,
          formulaLtr: `τ = R · C  ;  Vo(0⁺) = 0 + 6 = 6 V  ;  Vo = Vo(t₀⁺)·e^(-Δt/τ)`,
          substitutionLtr: `τ = 1 kΩ · 2 µF = 2 ms\nVo(2ms) = 6 V · e^(-2 / 2) = 6 · 0.368`,
          resultLtr: `Vo(2ms) = 2.21 V`,
          noteHe: ''
        },
        {
          titleHe: `ג. המתח לפני הירידה ומיד אחריה ב-${L('t = 3 ms')}`,
          formulaLtr: `Vo(3ms⁻) = Vo(0⁺)·e^(-3/2)  ;  Vo(3ms⁺) = Vo(3ms⁻) + ΔVi`,
          substitutionLtr: `Vo(3ms⁻) = 6 V · e^(-1.5) = 1.34 V\nVo(3ms⁺) = 1.34 V + (-6 V)`,
          resultLtr: `Vo(3ms⁺) = -4.66 V`,
          noteHe: `שימו לב שהמוצא של ${T('HP')} הופך לשלילי, למרות שהמבוא מעולם לא היה שלילי!`
        },
        {
          titleHe: `ד. הדעיכה לאפס בזמן ${L('t = 4 ms')}`,
          formulaLtr: `Vo = Vo(3ms⁺) · e^(-Δt / τ)`,
          substitutionLtr: `Δt = 4 ms - 3 ms = 1 ms\nVo(4ms) = (-4.66 V) · e^(-1 / 2)`,
          resultLtr: `Vo(4ms) = -2.83 V`,
          noteHe: ''
        }
      ]
    },
    {
      id: 'ex-19-2007',
      lessonTag: 'מפגשים 16, 19 · בגרות',
      category: 'hp',
      titleHe: '10. בגרות 2007, שאלה 5 — דופק מוזז וזמן ב-HP',
      sourceHe: 'בגרות 2007 · שאלה 5',
      promptHe: `לרשת ${T('HP')} עם ${L('C = 0.1 µF')} ו-${L('R = 10 kΩ')} מספקים דופק של ${L('10 V')} בין ${L('t = 1 ms')} ל-${L('t = 2 ms')}.`,
      circuitConfig: {
        network: 'HP',
        R1_ohm: 10e3,
        C_F: 0.1e-6,
        timeUnit: 'ms',
        tViewStart_s: 0,
        tViewEnd_s: 6e-3,
        preVi: 0,
        steadyState: true,
        transitions: [
          { t_s: 1e-3, Vi: 10, labelHe: 'קפיצה +10V' },
          { t_s: 2e-3, Vi: 0, labelHe: 'קפיצה -10V' }
        ]
      },
      subQuestions: [
        {
          id: 'q1',
          promptHe: `א. (העמקה) מתי, בזמן הדופק, יורד מתח המוצא ל-${L('5 V')}?`,
          unit: 'ms',
          expected: 1.69,
          isTimeQuestion: true,
          dtDisplay: 0.69,
          hintHe: `אורך חצי הדרך הוא ${L('0.69τ')}, אבל הדופק התחיל רק ב-${L('t₀ = 1 ms')}!`,
          pin: { t_s: 1.693e-3, v: 5, label: 't=1.69ms (5V)', targetLineV: 5 }
        },
        {
          id: 'q2',
          promptHe: `ב. מהו מתח המוצא מיד אחרי ירידת הדופק, ב-${L('t = 2 ms⁺')}?`,
          unit: 'V',
          expected: -6.32,
          hintHe: `ב-${L('2 ms⁻')} המוצא דעך ל-${L('3.68 V')}. כעת הפחת ${L('10 V')}.`,
          traps: [{ value: -10, messageHe: `שכחת להפחית מהערך ${L('3.68 V')} שאליו המוצא דעך בסוף הדופק!` }],
          pin: { t_s: 2e-3, v: -6.321, label: 'Vo(2ms+)=-6.32V' }
        },
        {
          id: 'q3',
          promptHe: `ג. חשבו את מתח המוצא ברגע ${L('t = 3 ms')}:`,
          unit: 'V',
          expected: -2.33,
          hintHe: `דעיכה של ${L('Δt = 1 ms = τ')} מתוך ${L('-6.32 V')}.`,
          pin: { t_s: 3e-3, v: -2.325, label: 'Vo(3ms)=-2.33V' }
        }
      ],
      solutionSteps: [
        {
          titleHe: `א. קבוע הזמן וזמן הירידה ל-${L('5 V')}`,
          formulaLtr: `τ = R · C  ;  Δt = τ · ln(Vo(t₀⁺) / V)  ;  t = t₀ + Δt`,
          substitutionLtr: `τ = 10 kΩ · 0.1 µF = 1 ms\nΔt = 1 ms · ln(10 V / 5 V) = 0.69 ms\nt = 1 ms + 0.69 ms`,
          resultLtr: `t = 1.69 ms`,
          noteHe: `הדופק התחיל ב-${L('1 ms')} ולכן חייבים להוסיף ${L('t₀ = 1 ms')}.`
        },
        {
          titleHe: `ב. סוף הדופק לפני ואחרי הקפיצה (${L('t = 2 ms')})`,
          formulaLtr: `Vo(2ms⁻) = Vo(1ms⁺)·e^(-Δt/τ)  ;  Vo(2ms⁺) = Vo(2ms⁻) + ΔVi`,
          substitutionLtr: `Vo(2ms⁻) = 10 V · e^(-1 / 1) = 3.68 V\nVo(2ms⁺) = 3.68 V + (-10 V)`,
          resultLtr: `Vo(2ms⁺) = -6.32 V`,
          noteHe: ''
        },
        {
          titleHe: `ג. הדעיכה ב-${L('t = 3 ms')}`,
          formulaLtr: `Vo(3ms) = Vo(2ms⁺) · e^(-Δt / τ)`,
          substitutionLtr: `Δt = 3 ms - 2 ms = 1 ms\nVo(3ms) = (-6.32 V) · e^(-1 / 1)`,
          resultLtr: `Vo(3ms) = -2.33 V`,
          noteHe: ''
        }
      ]
    },
    {
      id: 'ex-19-2011',
      lessonTag: 'מפגשים 16, 19 · בגרות',
      category: 'hp',
      titleHe: '11. בגרות 2011, שאלה 2 — דופק על רמה קבועה ב-HP',
      sourceHe: 'בגרות 2011 · שאלה 2',
      promptHe: `לרשת ${T('HP')} עם ${L('C = 0.1 µF')} ו-${L('R = 10 kΩ')} מספקים מבוא הנמצא זמן רב על ${L('+2 V')}, קופץ ל-${L('+8 V')} בין ${L('t = 1 ms')} ל-${L('t = 3 ms')}, וחוזר ל-${L('+2 V')}.`,
      circuitConfig: {
        network: 'HP',
        R1_ohm: 10e3,
        C_F: 0.1e-6,
        timeUnit: 'ms',
        tViewStart_s: -1e-3,
        tViewEnd_s: 7e-3,
        preVi: 2,
        steadyState: true,
        transitions: [
          { t_s: 1e-3, Vi: 8, labelHe: 'קפיצה מ-2V אל 8V (ΔVi=+6V)' },
          { t_s: 3e-3, Vi: 2, labelHe: 'ירידה מ-8V אל 2V (ΔVi=-6V)' }
        ]
      },
      subQuestions: [
        {
          id: 'q1',
          promptHe: `א. לאיזה מתח קופץ המוצא ב-${L('t = 1 ms⁺')}?`,
          unit: 'V',
          expected: 6,
          hintHe: `לפני הקפיצה המבוא היה קבוע זמן רב, לכן ${L('Vo(1ms⁻) = 0 V')}. גובה הקפיצה הוא ${L('ΔVi = 8 - 2')}.`,
          traps: [
            { value: 8, messageHe: `זהירות! הקבל כבר טעון ל-${L('2 V')} לפני הקפיצה, ולכן המוצא קופץ רק בגובה השינוי ${L('ΔVi = 8 - 2 = 6 V')}!` }
          ],
          pin: { t_s: 1e-3, v: 6, label: 'Vo(1ms+)=6V' }
        },
        {
          id: 'q2',
          promptHe: `ב. חשבו את מתח המוצא בזמן ${L('t = 2 ms')}:`,
          unit: 'V',
          expected: 2.21,
          hintHe: `דעיכה מ-${L('6 V')} במשך ${L('Δt = 1 ms = τ')}.`,
          pin: { t_s: 2e-3, v: 2.207, label: 'Vo(2ms)=2.21V' }
        },
        {
          id: 'q3',
          promptHe: `ג. חשבו את מתח המוצא בזמן ${L('t = 4 ms')}:`,
          unit: 'V',
          expected: -1.91,
          hintHe: `חשבו קודם את ${L('Vo(3ms⁻) = 6·e^(-2) = 0.81 V')}, הוסיפו ${L('ΔVi = -6 V')} לקבלת ${L('-5.19 V')}, ודעכו ${L('1 ms')} נוספת.`,
          pin: { t_s: 4e-3, v: -1.908, label: 'Vo(4ms)=-1.91V' }
        },
        {
          id: 'q4',
          promptHe: `ד. (העמקה) מתי, אחרי הירידה ב-${L('3 ms')}, מגיע מתח המוצא ל-${L('-1 V')}?`,
          unit: 'ms',
          expected: 4.65,
          isTimeQuestion: true,
          dtDisplay: 1.65,
          hintHe: `בקטע האחרון המוצא מתחיל מ-${L('-5.19 V')} ודועך אל ${L('0 V')}. זכור להוסיף ${L('t₀ = 3 ms')}!`,
          pin: { t_s: 4.646e-3, v: -1, label: 't=4.65ms (-1V)', targetLineV: -1 }
        }
      ],
      solutionSteps: [
        {
          titleHe: `א. קבוע הזמן וקפיצת המוצא ב-${L('1 ms')}`,
          formulaLtr: `τ = R · C  ;  Vo(1ms⁺) = Vo(1ms⁻) + ΔVi`,
          substitutionLtr: `τ = 10 kΩ · 0.1 µF = 1 ms\nVo(1ms⁻) = 0 V  ⇒  Vo(1ms⁺) = 0 + (8 - 2)`,
          resultLtr: `Vo(1ms⁺) = 6 V`,
          noteHe: `גם כשהמבוא על ${L('+2 V')} קבוע, המוצא של ${T('HP')} הוא ${L('0 V')}.`
        },
        {
          titleHe: `ב. מתח המוצא ב-${L('t = 2 ms')}`,
          formulaLtr: `Vo(2ms) = Vo(1ms⁺) · e^(-Δt / τ)`,
          substitutionLtr: `Δt = 2 ms - 1 ms = 1 ms\nVo(2ms) = 6 V · e^(-1 / 1)`,
          resultLtr: `Vo(2ms) = 2.21 V`,
          noteHe: ''
        },
        {
          titleHe: `ג. סוף הדופק (${L('3 ms')}) והמוצא ב-${L('t = 4 ms')}`,
          formulaLtr: `Vo(3ms⁺) = Vo(3ms⁻) + ΔVi  ;  Vo(4ms) = Vo(3ms⁺) · e^(-Δt / τ)`,
          substitutionLtr: `Vo(3ms⁻) = 6 V · e^(-2 / 1) = 0.812 V\nVo(3ms⁺) = 0.812 V + (2 - 8) = -5.188 V\nVo(4ms) = (-5.188 V) · e^(-1 / 1)`,
          resultLtr: `Vo(4ms) = -1.91 V`,
          noteHe: ''
        },
        {
          titleHe: `ד. מתי מגיע המוצא ל-${L('-1 V')}`,
          formulaLtr: `Δt = τ · ln(Vo(3ms⁺) / V)  ;  t = t₀ + Δt`,
          substitutionLtr: `Δt = 1 ms · ln((-5.188 V) / (-1 V)) = 1.65 ms\nt = 3 ms + 1.65 ms`,
          resultLtr: `t = 4.65 ms`,
          noteHe: ''
        }
      ]
    },
    {
      id: 'ex-20-2025',
      lessonTag: 'מפגש 20 · בגרות',
      category: 'm20',
      titleHe: '12. בגרות 2025, שאלה 5 — מפסק המשנה את τ באמצע הטעינה',
      sourceHe: 'בגרות 2025 (שאלון 815381) · שאלה 5',
      promptHe: `ברשת ${T('LP')} הקבל ${L('C = 500 µF')} אינו טעון והמפסק ${L('S')} פתוח (הנגד בטור הוא ${L('R₁ = 50 kΩ')}). ב-${L('t = 0')} מספקים מדרגה של ${L('20 V')}. כשמתח המוצא מגיע ל-${L('5 V')}, סוגרים את המפסק ${L('S')} שמחבר נגד נוסף ${L('R₂ = 15 kΩ')} במקביל ל-${L('R₁')}.`,
      circuitConfig: {
        network: 'LP',
        R1_ohm: 50e3,
        C_F: 500e-6,
        timeUnit: 's',
        tViewStart_s: -2,
        tViewEnd_s: 32,
        preVi: 0,
        steadyState: true,
        transitions: [{ t_s: 0, Vi: 20, labelHe: 'טעינה אל 20V' }],
        hasSwitch: {
          enabled: true,
          mode: 'parallel',
          R2_ohm: 15e3,
          triggerType: 'voltage',
          triggerValue: 5
        }
      },
      subQuestions: [
        {
          id: 'q1',
          promptHe: `א. חשבו את קבוע זמן הטעינה ההתחלתי ${L('τ₁')} (שימו לב ליחידה: שניות!):`,
          unit: 's',
          expected: 25,
          hintHe: `המירו ${L('500 µF = 0.5 mF')} או עבדו ביחידות תקניות: ${L('50·10³ Ω · 500·10⁻⁶ F = 25 s')}.`,
          traps: [{ value: 25000, messageHe: `זהירות מיחידות! ${L('kΩ · µF = ms')}, ו-${L('25,000 ms = 25 s')}!` }],
          pin: { t_s: 7.192, v: 5, label: 'S נסגר ב-5V' }
        },
        {
          id: 'q2',
          promptHe: `ב. לאחר כמה זמן מגיע מתח המוצא ל-${L('5 V')}?`,
          unit: 's',
          expected: 7.19,
          isTimeQuestion: true,
          dtDisplay: 7.19,
          hintHe: `טעינה מאפס אל ${L('20 V')} עם ${L('τ₁ = 25 s')}: ${L('t₁ = 25 · ln(20 / (20 - 5))')}.`,
          pin: { t_s: 7.192, v: 5, label: 't1=7.19s (5V)', targetLineV: 5 }
        },
        {
          id: 'q3',
          promptHe: `ג1. לאחר סגירת המפסק, מהו קבוע הזמן החדש ${L('τ₂')}?`,
          unit: 's',
          expected: 5.77,
          hintHe: `חשבו תחילה ${L('R₁ || R₂ = (50·15)/(50+15) = 11.54 kΩ')}, ואז הכפילו ב-${L('500 µF')}.`,
          traps: [{ value: 7.5, messageHe: `נראה שחישבת עם ${L('R₂ = 15 kΩ')} בלבד במקום החיבור המקבילי ${L('R₁ || R₂')}.` }]
        },
        {
          id: 'q4',
          promptHe: `ג2. חשבו את מתח המוצא ${L('2')} שניות אחרי סגירת המפסק:`,
          unit: 'V',
          expected: 9.39,
          hintHe: `קטע חדש שמתחיל מ-${L('V₀ = 5 V')}, שואף ל-${L('Vf = 20 V')}, עם ${L('τ₂ = 5.77 s')} ו-${L('Δt = 2 s')}.`,
          pin: { t_s: 9.192, v: 9.394, label: 'Vo(t1+2s)=9.39V' }
        }
      ],
      solutionSteps: [
        {
          titleHe: `א-ב. קבוע הזמן ההתחלתי וזמן ההגעה ל-${L('5 V')}`,
          formulaLtr: `τ₁ = R₁ · C  ;  t₁ = τ₁ · ln(Vi / (Vi - V))`,
          substitutionLtr: `τ₁ = 50 kΩ · 500 µF = 25,000 ms = 25 s\nt₁ = 25 s · ln(20 V / (20 V - 5 V)) = 25 s · ln(1.333)`,
          resultLtr: `τ₁ = 25 s  ;  t₁ = 7.19 s`,
          noteHe: ''
        },
        {
          titleHe: `ג1. ההתנגדות השקולה וקבוע הזמן החדש`,
          formulaLtr: `R_eq = (R₁ · R₂) / (R₁ + R₂)  ;  τ₂ = R_eq · C`,
          substitutionLtr: `R_eq = (50 kΩ · 15 kΩ) / (50 kΩ + 15 kΩ) = 11.54 kΩ\nτ₂ = 11.54 kΩ · 500 µF`,
          resultLtr: `τ₂ = 5.77 s`,
          noteHe: `סגירת המפסק הקטינה את ההתנגדות, ולכן גרף הטעינה הופך לתלול יותר מהנקודה ${L('5 V')}!`
        },
        {
          titleHe: `ג2. המתח ${L('2')} שניות אחרי סגירת המפסק`,
          formulaLtr: `Vo = Vf + (V₀ - Vf) · e^(-Δt / τ₂)`,
          substitutionLtr: `Vo(t₁ + 2s) = 20 + (5 - 20) · e^(-2 / 5.77) = 20 - 15 · 0.707`,
          resultLtr: `Vo(t₁ + 2s) = 9.39 V`,
          noteHe: ''
        }
      ]
    }
  ];

  // --- Randomized Infinite Trainer Generator ---
  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function generateRandomExercise(networkChoice, difficulty) {
    const net = networkChoice === 'MIXED' ? pickRandom(['LP', 'HP']) : networkChoice;
    const rVals = [1, 2, 4, 5, 10, 20];
    const cVals = [0.1, 0.2, 0.5, 1, 2];
    const Rk = pickRandom(rVals);
    const Cu = pickRandom(cVals);
    const tauMs = Number((Rk * Cu).toFixed(2));
    const R_ohm = Rk * 1e3;
    const C_F = Cu * 1e-6;

    if (difficulty === 'basic') {
      const Vi = pickRandom([5, 8, 10, 12, 15]);
      const tQueryMs = Number((tauMs * pickRandom([0.5, 1, 1.5, 2])).toFixed(2));
      const cfg = {
        network: net,
        R1_ohm: R_ohm,
        C_F,
        timeUnit: 'ms',
        tViewStart_s: -0.5 * tauMs * 1e-3,
        tViewEnd_s: 5.5 * tauMs * 1e-3,
        preVi: 0,
        steadyState: true,
        transitions: [{ t_s: 0, Vi, labelHe: `מדרגה של ${Vi}V` }]
      };
      const tl = E.compileTimeline(cfg);
      const ev = E.evaluateAt(tl, tQueryMs * 1e-3, 'after');
      const vAns = net === 'LP' ? ev.VoLP : ev.VoHP;
      const targetV = Number((Vi * pickRandom([0.4, 0.6, 0.75])).toFixed(1));
      const tSolve = E.solveTimeForVoltage(tl, net, targetV);
      const tHit = tSolve.hits[0];

      return {
        id: 'rand-' + Date.now(),
        lessonTag: 'תרגול אקראי',
        titleHe: `תרגיל מדרגה אקראי ברשת ${T(net)}`,
        sourceHe: 'מחולל תרגול אינסופי · רמה בסיסית',
        promptHe: `לרשת ${T(net)} עם ${L('R = ' + Rk + ' kΩ')} ו-${L('C = ' + Cu + ' µF')} מספקים מדרגת מתח מ-${L('0 V')} אל ${L(Vi + ' V')} בזמן ${L('t = 0')}.`,
        circuitConfig: cfg,
        subQuestions: [
          {
            id: 'rq1',
            promptHe: `א. מהו קבוע הזמן ${L('τ')}?`,
            unit: 'ms',
            expected: tauMs,
            hintHe: `הכפל ${L('R · C')}.`
          },
          {
            id: 'rq2',
            promptHe: `ב. מהו מתח המוצא בזמן ${L('t = ' + tQueryMs + ' ms')}?`,
            unit: 'V',
            expected: Number(vAns.toFixed(2)),
            hintHe: net === 'LP'
              ? `טעינה מאפס: ${L('Vo = Vi·(1 - e^(-Δt/τ))')}.`
              : `קפיצה ל-${L(Vi + ' V')} ודעיכה לאפס: ${L('Vo = Vi·e^(-Δt/τ)')}.`,
            pin: { t_s: tQueryMs * 1e-3, v: vAns, label: `Vo(${tQueryMs}ms)=${E.fmtFixed(vAns, 2)}V` }
          },
          {
            id: 'rq3',
            promptHe: `ג. מתי מגיע מתח המוצא ל-${L(targetV + ' V')}?`,
            unit: 'ms',
            expected: Number(tHit.t_display.toFixed(2)),
            isTimeQuestion: true,
            dtDisplay: Number(tHit.dt_display.toFixed(2)),
            hintHe: `השתמש בנוסחת ה-${T('ln')} של ${T(net)}.`,
            pin: { t_s: tHit.t_s, v: targetV, label: `t=${E.fmtFixed(tHit.t_display, 2)}ms`, targetLineV: targetV }
          }
        ],
        solutionSteps: [
          ...E.buildVoltageDerivation(tl, net, tQueryMs * 1e-3, 'after'),
          ...tHit.steps
        ]
      };
    }

    // Medium or Bagrut pulse
    const vBase = difficulty === 'bagrut' ? pickRandom([-4, -2, 2, 3]) : 0;
    const vPulse = vBase + pickRandom([4, 6, 8, 10]);
    const tStartMs = difficulty === 'bagrut' ? pickRandom([1, 2]) : 0;
    const widthMs = Number((tauMs * pickRandom([0.8, 1.2, 1.5, 2])).toFixed(2));
    const tEndMs = Number((tStartMs + widthMs).toFixed(2));
    const tInsideMs = Number((tStartMs + widthMs * 0.5).toFixed(2));
    const tAfterMs = Number((tEndMs + tauMs * pickRandom([0.5, 1])).toFixed(2));

    const cfg = {
      network: net,
      R1_ohm: R_ohm,
      C_F,
      timeUnit: 'ms',
      tViewStart_s: (tStartMs === 0 ? -0.5 * tauMs : 0) * 1e-3,
      tViewEnd_s: (tEndMs + 4.5 * tauMs) * 1e-3,
      preVi: vBase,
      steadyState: true,
      transitions: [
        { t_s: tStartMs * 1e-3, Vi: vPulse, labelHe: 'תחילת הדופק' },
        { t_s: tEndMs * 1e-3, Vi: vBase, labelHe: 'סוף הדופק' }
      ]
    };
    const tl = E.compileTimeline(cfg);
    const evIn = E.evaluateAt(tl, tInsideMs * 1e-3, 'after');
    const evAfter = E.evaluateAt(tl, tAfterMs * 1e-3, 'after');
    const vIn = net === 'LP' ? evIn.VoLP : evIn.VoHP;
    const vAfter = net === 'LP' ? evAfter.VoLP : evAfter.VoHP;

    // Pick a reachable target voltage after pulse end
    const segAfter = tl.segments[tl.segments.length - 1];
    const vStartSeg = net === 'LP' ? segAfter.VcStart : segAfter.VrStartPlus;
    const vEndSeg = net === 'LP' ? segAfter.VcEnd : segAfter.VrEndMinus;
    const midTarget = Number(((vStartSeg + vEndSeg) / 2).toFixed(1));
    const solveAfter = E.solveTimeForVoltage(tl, net, midTarget, segAfter.index);
    const subQs = [
      {
        id: 'rq1',
        promptHe: `א. מהו מתח המוצא בזמן ${L('t = ' + tInsideMs + ' ms')} (בתוך הדופק)?`,
        unit: 'V',
        expected: Number(vIn.toFixed(2)),
        hintHe: `זכרו ש-${L('Δt = t - t₀')} נמדד מתחילת הדופק (${L('t₀ = ' + tStartMs + ' ms')}).`,
        pin: { t_s: tInsideMs * 1e-3, v: vIn, label: `Vo(${tInsideMs}ms)=${E.fmtFixed(vIn, 2)}V` }
      },
      {
        id: 'rq2',
        promptHe: `ב. מהו מתח המוצא בזמן ${L('t = ' + tAfterMs + ' ms')} (אחרי הדופק)?`,
        unit: 'V',
        expected: Number(vAfter.toFixed(2)),
        hintHe: `חובה לחשב קודם את המתח בסוף הדופק (${L('t = ' + tEndMs + ' ms')}), ורק ממנו להמשיך לקטע הבא!`,
        pin: { t_s: tAfterMs * 1e-3, v: vAfter, label: `Vo(${tAfterMs}ms)=${E.fmtFixed(vAfter, 2)}V` }
      }
    ];

    const steps = [...E.buildVoltageDerivation(tl, net, tAfterMs * 1e-3, 'after')];
    if (solveAfter.hits.length > 0) {
      const h = solveAfter.hits[0];
      subQs.push({
        id: 'rq3',
        promptHe: `ג. מתי, אחרי סוף הדופק, מגיע המוצא ל-${L(midTarget + ' V')}?`,
        unit: 'ms',
        expected: Number(h.t_display.toFixed(2)),
        isTimeQuestion: true,
        dtDisplay: Number(h.dt_display.toFixed(2)),
        hintHe: `חשבו ${L('Δt')} מ-${L('t₀ = ' + tEndMs + ' ms')} ואז הוסיפו ${L('t₀')}.`,
        pin: { t_s: h.t_s, v: midTarget, label: `t=${E.fmtFixed(h.t_display, 2)}ms`, targetLineV: midTarget }
      });
      steps.push(...h.steps);
    }

    return {
      id: 'rand-' + Date.now(),
      lessonTag: difficulty === 'bagrut' ? 'בגרות אקראי' : 'דופק אקראי',
      titleHe: `תרגיל דופק אקראי ברשת ${T(net)}`,
      sourceHe: `מחולל תרגול אינסופי · ${difficulty === 'bagrut' ? 'רמת בגרות' : 'רמה בינונית'}`,
      promptHe: `לרשת ${T(net)} עם ${L('R = ' + Rk + ' kΩ')} ו-${L('C = ' + Cu + ' µF')} (${L('τ = ' + tauMs + ' ms')}) מספקים מבוא שנמצא זמן רב על ${L(vBase + ' V')}, עולה ל-${L(vPulse + ' V')} בין ${L('t = ' + tStartMs + ' ms')} ל-${L('t = ' + tEndMs + ' ms')}, וחוזר ל-${L(vBase + ' V')}.`,
      circuitConfig: cfg,
      subQuestions: subQs,
      solutionSteps: steps
    };
  }

  // --- Unit Prefix Reference & Shortcuts for Sidebar ---
  const UNIT_PREFIXES = [
    { sym: 'M', nameHe: 'מגה (Mega)', pow: '10⁶', mult: '× 1,000,000', ex: '1 MΩ = 10⁶ Ω' },
    { sym: 'k', nameHe: 'קילו (Kilo)', pow: '10³', mult: '× 1,000', ex: '4.7 kΩ = 4,700 Ω' },
    { sym: '—', nameHe: 'יחידת בסיס', pow: '10⁰', mult: '× 1', ex: 'Ω, F, s, V, A' },
    { sym: 'm', nameHe: 'מילי (Milli)', pow: '10⁻³', mult: '÷ 1,000', ex: '5 ms = 0.005 s' },
    { sym: 'µ', nameHe: 'מיקרו (Micro)', pow: '10⁻⁶', mult: '÷ 1,000,000', ex: '0.1 µF = 10⁻⁷ F' },
    { sym: 'n', nameHe: 'ננו (Nano)', pow: '10⁻⁹', mult: '10⁻⁹', ex: '10 nF = 10⁻⁸ F' },
    { sym: 'p', nameHe: 'פיקו (Pico)', pow: '10⁻¹²', mult: '10⁻¹²', ex: '100 pF = 10⁻¹⁰ F' }
  ];

  const TAU_SHORTCUTS = [
    { ruleLtr: 'kΩ × µF = ms', powLtr: '10³ · 10⁻⁶ = 10⁻³ s' },
    { ruleLtr: 'kΩ × nF = µs', powLtr: '10³ · 10⁻⁹ = 10⁻⁶ s' },
    { ruleLtr: 'MΩ × µF = s', powLtr: '10⁶ · 10⁻⁶ = 1 s' },
    { ruleLtr: 'kΩ × mF = s', powLtr: '10³ · 10⁻³ = 1 s' },
    { ruleLtr: 'Ω × µF = µs', powLtr: '10⁰ · 10⁻⁶ = 10⁻⁶ s' },
    { ruleLtr: '1 s = 1,000 ms = 10⁶ µs', powLtr: 'המרת יחידות זמן' }
  ];

  // --- Shared Multiple-Choice Option Finalizer (Always 4 unique options) ---
  function hashStringSeed(str) {
    let h = 2166136261 >>> 0;
    const s = String(str || 'rc');
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h || 123456789;
  }

  function makeRng(seed) {
    if (seed === undefined || seed === null) return Math.random;
    let a = (seed >>> 0) || 1;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function fmtSmartVal(v) {
    if (!Number.isFinite(v)) return '—';
    const abs = Math.abs(v);
    if (abs < 1e-12) return '0';
    if (abs >= 1000) return E.fmtNum(v, 2);
    if (abs >= 1) return E.fmtNum(v, 2);
    if (abs >= 0.01) return E.fmtNum(v, 3);
    return E.fmtNum(v, 4);
  }

  function finalizeMcOptions(correctOpt, distractorCandidates, seed = null, fallbackFactory = null) {
    const norm = (k) => String(k || '').trim().replace(/\s+/g, ' ');
    const seen = new Set([norm(correctOpt.key)]);
    const picked = [{
      key: norm(correctOpt.key),
      textHtml: correctOpt.textHtml,
      feedbackHe: correctOpt.feedbackHe,
      isCorrect: true
    }];

    for (let i = 0; i < distractorCandidates.length && picked.length < 4; i++) {
      const d = distractorCandidates[i];
      if (!d || !d.key) continue;
      const nk = norm(d.key);
      if (seen.has(nk)) continue;
      seen.add(nk);
      picked.push({
        key: nk,
        textHtml: d.textHtml,
        feedbackHe: d.feedbackHe || 'לא מדויק — בדקו שוב את הנוסחה או את המרת היחידות בטבלה שבצד.',
        isCorrect: false
      });
    }

    let fbIdx = 1;
    while (picked.length < 4) {
      const cand = fallbackFactory
        ? fallbackFactory(fbIdx)
        : {
            key: `fallback-${fbIdx}`,
            textHtml: `ערך חלופי (${L(String(fbIdx))})`,
            feedbackHe: 'אפשרות זו אינה מתאימה לנתוני המעגל.'
          };
      fbIdx++;
      if (!cand || !cand.key) continue;
      const nk = norm(cand.key);
      if (seen.has(nk)) continue;
      seen.add(nk);
      picked.push({
        key: nk,
        textHtml: cand.textHtml,
        feedbackHe: cand.feedbackHe || 'לא מדויק — בדקו שוב את נתוני המעגל.',
        isCorrect: false
      });
      if (fbIdx > 25) break;
    }

    const rng = makeRng(seed);
    for (let i = picked.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = picked[i];
      picked[i] = picked[j];
      picked[j] = tmp;
    }

    const letters = ['א', 'ב', 'ג', 'ד'];
    return picked.map((opt, idx) => ({
      ...opt,
      letter: letters[idx]
    }));
  }

  // --- Dedicated τ = R · C & Unit Conversion Multiple-Choice Trainer ---
  function generateTauMcQuestion() {
    const rPool = [
      { val: 200, unit: 'Ω', exp: 0, powStr: '200 Ω' },
      { val: 500, unit: 'Ω', exp: 0, powStr: '500 Ω' },
      { val: 1, unit: 'kΩ', exp: 3, powStr: '10³ Ω' },
      { val: 2, unit: 'kΩ', exp: 3, powStr: '2·10³ Ω' },
      { val: 4.7, unit: 'kΩ', exp: 3, powStr: '4.7·10³ Ω' },
      { val: 10, unit: 'kΩ', exp: 3, powStr: '10·10³ Ω' },
      { val: 25, unit: 'kΩ', exp: 3, powStr: '25·10³ Ω' },
      { val: 50, unit: 'kΩ', exp: 3, powStr: '50·10³ Ω' },
      { val: 100, unit: 'kΩ', exp: 3, powStr: '100·10³ Ω' },
      { val: 0.5, unit: 'MΩ', exp: 6, powStr: '0.5·10⁶ Ω' },
      { val: 1, unit: 'MΩ', exp: 6, powStr: '10⁶ Ω' },
      { val: 2, unit: 'MΩ', exp: 6, powStr: '2·10⁶ Ω' }
    ];
    const cPool = [
      { val: 500, unit: 'pF', exp: -12, powStr: '500·10⁻¹² F' },
      { val: 1, unit: 'nF', exp: -9, powStr: '10⁻⁹ F' },
      { val: 10, unit: 'nF', exp: -9, powStr: '10·10⁻⁹ F' },
      { val: 100, unit: 'nF', exp: -9, powStr: '100·10⁻⁹ F' },
      { val: 0.1, unit: 'µF', exp: -6, powStr: '0.1·10⁻⁶ F' },
      { val: 0.2, unit: 'µF', exp: -6, powStr: '0.2·10⁻⁶ F' },
      { val: 0.5, unit: 'µF', exp: -6, powStr: '0.5·10⁻⁶ F' },
      { val: 1, unit: 'µF', exp: -6, powStr: '10⁻⁶ F' },
      { val: 2, unit: 'µF', exp: -6, powStr: '2·10⁻⁶ F' },
      { val: 5, unit: 'µF', exp: -6, powStr: '5·10⁻⁶ F' },
      { val: 10, unit: 'µF', exp: -6, powStr: '10·10⁻⁶ F' },
      { val: 100, unit: 'µF', exp: -6, powStr: '100·10⁻⁶ F' },
      { val: 500, unit: 'µF', exp: -6, powStr: '500·10⁻⁶ F' },
      { val: 1, unit: 'mF', exp: -3, powStr: '10⁻³ F' },
      { val: 2, unit: 'mF', exp: -3, powStr: '2·10⁻³ F' }
    ];

    let rPick = null, cPick = null, tau_s = 0;
    for (let tries = 0; tries < 40; tries++) {
      const rC = pickRandom(rPool);
      const cC = pickRandom(cPool);
      const ts = E.toOhms(rC.val, rC.unit) * E.toFarads(cC.val, cC.unit);
      if (ts >= 1e-7 && ts <= 100) {
        rPick = rC;
        cPick = cC;
        tau_s = ts;
        break;
      }
    }
    if (!rPick) {
      rPick = rPool[5];
      cPick = cPool[7];
      tau_s = 10e-3;
    }

    const rOhms = E.toOhms(rPick.val, rPick.unit);
    const cFarads = E.toFarads(cPick.val, cPick.unit);
    const bestUnit = E.pickBestTimeUnit(tau_s);
    const tauBest = E.fromSeconds(tau_s, bestUnit);

    const convertibleUnits = ['µs', 'ms', 's'].filter((u) => {
      const val = E.fromSeconds(tau_s, u);
      return val >= 0.005 && val <= 50000;
    });

    const flavors = convertibleUnits.length > 0
      ? ['find_tau_mixed', 'convert_tau_unit', 'steady_5tau']
      : ['find_tau_mixed', 'steady_5tau'];
    const flavor = pickRandom(flavors);

    const rDisp = `${E.fmtNum(rPick.val, 2)} ${rPick.unit}`;
    const cDisp = `${E.fmtNum(cPick.val, 2)} ${cPick.unit}`;
    const numProd = E.fmtNum(rPick.val * cPick.val, 3);
    const sumExp = rPick.exp + cPick.exp;

    const makeValUnitOpt = (val, unit, fb, isCorrect = false) => {
      const txt = `${fmtSmartVal(val)} ${unit}`;
      return {
        key: txt,
        textHtml: L(txt),
        feedbackHe: fb,
        isCorrect
      };
    };

    let promptHe = '';
    let badgeHe = '';
    let options = [];
    let derivationLtr = '';

    if (flavor === 'find_tau_mixed') {
      badgeHe = 'חישוב τ והמרת קידומות';
      promptHe = `נתון נגד ${L('R = ' + rDisp)} וקבל ${L('C = ' + cDisp)}. מהו קבוע הזמן ${L('τ = R · C')} של המעגל?`;
      const altUnits = ['µs', 'ms', 's'].filter((u) => u !== bestUnit);
      const correctOpt = makeValUnitOpt(
        tauBest,
        bestUnit,
        `מדויק! ${L(`${rDisp} · ${cDisp} = ${fmtSmartVal(tauBest)} ${bestUnit}`)} (חזקת ${L(`10^(${rPick.exp}) · 10^(${cPick.exp}) = 10^(${sumExp})`)})`,
        true
      );
      const distractors = [
        makeValUnitOpt(tauBest, altUnits[0], `טעות ביחידת הזמן! הערך המספרי מתאים ל-${L(bestUnit)}, ולא ל-${L(altUnits[0])}. היעזר בטבלת ההמרות שבצד.`),
        makeValUnitOpt(tauBest * 10, bestUnit, `סטייה של פי ${L('10')}! בדקו את המכפלה ${L(`${E.fmtNum(rPick.val, 2)} × ${E.fmtNum(cPick.val, 2)} = ${numProd}`)} ואת הזזת הנקודה.`),
        makeValUnitOpt(tauBest * 5, bestUnit, `זהו ערך ${L('5τ')} (זמן מצב מתמיד), לא ${L('τ')} עצמו!`),
        makeValUnitOpt(tauBest * 0.1, bestUnit, `סטייה של פי ${L('0.1')} בהמרת היחידות.`),
        makeValUnitOpt(tauBest, altUnits[1], `טעות בסדר הגודל — בדקו בטבלה את ההפרש בין קידומות ${L('K/M/m/µ/n')}.`)
      ];
      options = finalizeMcOptions(correctOpt, distractors, null, (k) =>
        makeValUnitOpt(tauBest * (k + 2), bestUnit, 'בדקו את חישוב המכפלה והמרת היחידות.')
      );
      derivationLtr = `τ = R · C = (${rPick.powStr}) · (${cPick.powStr})\nτ = ${numProd} · 10^(${sumExp}) s = ${fmtSmartVal(tauBest)} ${bestUnit}`;
    } else if (flavor === 'convert_tau_unit') {
      const targetUnit = pickRandom(convertibleUnits);
      const tauTarget = E.fromSeconds(tau_s, targetUnit);
      badgeHe = `המרה ליחידת ${targetUnit}`;
      promptHe = `נתון מעגל עם ${L('R = ' + rDisp)} ו-${L('C = ' + cDisp)}. מהו ערכו של קבוע הזמן ${L('τ')} ביחידות ${L(targetUnit)}?`;
      const correctOpt = makeValUnitOpt(
        tauTarget,
        targetUnit,
        `מצוין! לאחר המרה ל-${L(targetUnit)} מתקבל ${L(`τ = ${fmtSmartVal(tauTarget)} ${targetUnit}`)}.`,
        true
      );
      const distractors = [
        makeValUnitOpt(tauTarget * 1000, targetUnit, `גדול פי ${L('1,000')}! התבלבלת במעבר בין קידומות (${L('k/m/µ')}) — בדוק בטבלה שבצד.`),
        makeValUnitOpt(tauTarget / 1000, targetUnit, `קטן פי ${L('1,000')}! בדוק מחדש את ההמרה ל-${L(targetUnit)}.`),
        makeValUnitOpt(tauTarget * 10, targetUnit, `שגיאה של סדר גודל אחד (${L('×10')}) בהכפלה או בהזזת הנקודה.`),
        makeValUnitOpt(tauTarget * 0.1, targetUnit, `שגיאה של סדר גודל אחד (${L('÷10')}) בהמרה.`),
        makeValUnitOpt(tauTarget * 5, targetUnit, `זהו ${L('5τ')} במקום ${L('τ')}.`)
      ];
      options = finalizeMcOptions(correctOpt, distractors, null, (k) =>
        makeValUnitOpt(tauTarget * (k + 2), targetUnit, 'בדקו את ההמרה ליחידה המבוקשת.')
      );
      derivationLtr = `τ = R · C = (${rPick.powStr}) · (${cPick.powStr}) = ${fmtSmartVal(tauBest)} ${bestUnit}\nב-${targetUnit}: τ = ${fmtSmartVal(tauTarget)} ${targetUnit}`;
    } else {
      const tau5Best = 5 * tauBest;
      badgeHe = 'מצב מתמיד (5τ)';
      promptHe = `עבור נגד ${L('R = ' + rDisp)} וקבל ${L('C = ' + cDisp)}, לאחר כמה זמן מעשי (${L('5τ')}) מגיע הקבל למצב מתמיד?`;
      const wrongUnit = bestUnit === 's' ? 'ms' : 's';
      const correctOpt = makeValUnitOpt(
        tau5Best,
        bestUnit,
        `נכון! ${L(`τ = ${fmtSmartVal(tauBest)} ${bestUnit}`)}, ולכן ${L(`5τ = ${fmtSmartVal(tau5Best)} ${bestUnit}`)}.`,
        true
      );
      const distractors = [
        makeValUnitOpt(tauBest, bestUnit, `חישבת רק את ${L('τ')}! השאלה מבקשת מצב מתמיד — צריך להכפיל ב-${L('5')} (${L('5τ')}).`),
        makeValUnitOpt(tau5Best, wrongUnit, `הכפלת נכון ב-${L('5')}, אך טעית ביחידת הזמן (${L(wrongUnit)} במקום ${L(bestUnit)})!`),
        makeValUnitOpt(tau5Best * 0.5, bestUnit, `חישבת ערך קטן מדי — זכור שמצב מתמיד הוא ${L('5 · τ')}.`),
        makeValUnitOpt(tau5Best * 10, bestUnit, `סטייה של פי ${L('10')} בהמרת קידומות היחידות.`)
      ];
      options = finalizeMcOptions(correctOpt, distractors, null, (k) =>
        makeValUnitOpt(tau5Best * (k + 2), bestUnit, 'זכרו להכפיל את קבוע הזמן ב-5 ולשמור על היחידה הנכונה.')
      );
      derivationLtr = `τ = (${rPick.powStr}) · (${cPick.powStr}) = ${fmtSmartVal(tauBest)} ${bestUnit}\n5τ = 5 · ${fmtSmartVal(tauBest)} ${bestUnit} = ${fmtSmartVal(tau5Best)} ${bestUnit}`;
    }

    return {
      id: 'tau-mc-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      promptHe,
      badgeHe,
      circuitConfig: {
        network: 'LP',
        R1_ohm: rOhms,
        C_F: cFarads,
        timeUnit: bestUnit,
        tViewStart_s: 0,
        tViewEnd_s: 6 * tau_s,
        preVi: 0,
        steadyState: true,
        transitions: [{ t_s: 0, Vi: 10, labelHe: 'טעינה' }]
      },
      options,
      derivationLtr
    };
  }

  // --- 4-Step Guided Multiple-Choice Decomposition Builder for Any Exercise ---
  function buildGuidedStepsForExercise(ex) {
    const cfg = ex.circuitConfig;
    const tl = E.compileTimeline(cfg);
    const net = cfg.network;
    const u = tl.timeUnit;
    const postSegs = tl.segments.filter((sg) => !sg.isPre);
    const seg1 = postSegs[0] || tl.segments[0];
    const tauDisp = E.fromSeconds(seg1.tau_s, u);
    const seedBase = hashStringSeed(ex.id || ex.titleHe);

    const rLabel = E.fmtResistance(cfg.R1_ohm);
    const cLabel = E.fmtCapacitance(cfg.C_F);
    const t0Str = `${fmtSmartVal(E.fromSeconds(seg1.tStart, u))} ${u}`;

    // Step 1: Calculate τ and convert units
    const altU = u === 's' ? 'ms' : (u === 'ms' ? 's' : 'ms');
    const step1Correct = {
      key: `${fmtSmartVal(tauDisp)} ${u}`,
      textHtml: L(`τ = ${fmtSmartVal(tauDisp)} ${u}`),
      feedbackHe: `מצוין! ${L(`${rLabel} · ${cLabel} = ${fmtSmartVal(tauDisp)} ${u}`)}. זו תמיד נקודת ההתחלה.`,
      isCorrect: true
    };
    const step1Distractors = [
      {
        key: `${fmtSmartVal(tauDisp)} ${altU}`,
        textHtml: L(`τ = ${fmtSmartVal(tauDisp)} ${altU}`),
        feedbackHe: `זהירות עם המרת יחידות! השילוב ${L(`${rLabel} × ${cLabel}`)} נותן ${L(u)}, לא ${L(altU)}. בדוק בטבלה שבצד.`
      },
      {
        key: `${fmtSmartVal(tauDisp * 5)} ${u}`,
        textHtml: L(`τ = ${fmtSmartVal(tauDisp * 5)} ${u}`),
        feedbackHe: `זהו ${L('5τ')} (זמן ההגעה למצב מתמיד), לא קבוע הזמן ${L('τ = R·C')} עצמו.`
      },
      {
        key: `${fmtSmartVal(tauDisp * 0.1)} ${u}`,
        textHtml: L(`τ = ${fmtSmartVal(tauDisp * 0.1)} ${u}`),
        feedbackHe: `טעות של פי ${L('10')} בהמרת יחידות או הזזת נקודה עשרונית.`
      },
      {
        key: `${fmtSmartVal(tauDisp * 10)} ${u}`,
        textHtml: L(`τ = ${fmtSmartVal(tauDisp * 10)} ${u}`),
        feedbackHe: `גדול פי ${L('10')} מהמכפלה הנכונה ${L('R · C')}.`
      }
    ];
    const step1 = {
      stepNum: 1,
      tabHe: '1. חישוב τ',
      titleHe: `שלב 1 מתוך 4: חישוב קבוע הזמן ${L('τ')} והמרת יחידות`,
      promptHe: `לפני שפותרים נוסחאות מתח וזמן, מהו קבוע הזמן ההתחלתי ${L('τ₁ = R · C')} עבור ${L(rLabel)} ו-${L(cLabel)}?`,
      options: finalizeMcOptions(step1Correct, step1Distractors, seedBase + 11, (k) => ({
        key: `${fmtSmartVal(tauDisp * (k + 2))} ${u}`,
        textHtml: L(`τ = ${fmtSmartVal(tauDisp * (k + 2))} ${u}`),
        feedbackHe: `בדקו שוב את המכפלה ${L(`${rLabel} · ${cLabel}`)}.`
      })),
      mathHintLtr: `τ = R₁ · C = ${rLabel} · ${cLabel} = ${fmtSmartVal(tauDisp)} ${u}  (5τ = ${fmtSmartVal(5 * tauDisp)} ${u})`
    };

    // Step 2: Output at first jump t0+
    let step2Correct, step2Distractors, step2Hint;
    if (net === 'LP') {
      const vInit = seg1.VcStart;
      step2Correct = {
        key: `${fmtSmartVal(vInit)} V`,
        textHtml: L(`Vo(${t0Str}⁺) = ${fmtSmartVal(vInit)} V`),
        feedbackHe: `בדיוק! ברשת ${T('LP')} המוצא הוא המתח על הקבל ${L('VC')}, והוא אינו יכול לקפוץ בבת אחת: ${L(`Vo(t₀⁺) = Vo(t₀⁻) = ${fmtSmartVal(vInit)} V`)}.`,
        isCorrect: true
      };
      step2Distractors = [
        {
          key: `${fmtSmartVal(seg1.Vi)} V`,
          textHtml: L(`Vo(${t0Str}⁺) = ${fmtSmartVal(seg1.Vi)} V`),
          feedbackHe: `טעות קלאסית! ברשת ${T('LP')} המתח על הקבל לא קופץ מיד לרמת המבוא ${L(fmtSmartVal(seg1.Vi) + ' V')}.`
        },
        {
          key: `${fmtSmartVal(seg1.VrStartPlus)} V`,
          textHtml: L(`Vo(${t0Str}⁺) = ${fmtSmartVal(seg1.VrStartPlus)} V`),
          feedbackHe: `זהו המתח על הנגד ${L('VR')} (רשת ${T('HP')}), לא על הקבל ${L('VC')}!`
        },
        {
          key: `${fmtSmartVal(Math.abs(seg1.Vi) > 1e-6 ? -seg1.Vi : 5)} V`,
          textHtml: L(`Vo(${t0Str}⁺) = ${fmtSmartVal(Math.abs(seg1.Vi) > 1e-6 ? -seg1.Vi : 5)} V`),
          feedbackHe: `המתח על הקבל שומר על רציפות מ-${L('t₀⁻')}.`
        },
        {
          key: `${fmtSmartVal((vInit + seg1.Vi) / 2)} V`,
          textHtml: L(`Vo(${t0Str}⁺) = ${fmtSmartVal((vInit + seg1.Vi) / 2)} V`),
          feedbackHe: `הקבל אינו קופץ לחצי הדרך ב-${L('t₀⁺')} — הוא שומר על ערכו הקודם.`
        }
      ];
      step2Hint = `LP: Vo = VC  ⇒  Vo(t₀⁺) = Vo(t₀⁻) = ${fmtSmartVal(vInit)} V`;
    } else {
      const vJump = seg1.VrStartPlus;
      step2Correct = {
        key: `${fmtSmartVal(vJump)} V`,
        textHtml: L(`Vo(${t0Str}⁺) = ${fmtSmartVal(vJump)} V`),
        feedbackHe: `נכון מאוד! ברשת ${T('HP')} כל שינוי המבוא ${L(`ΔVi = ${fmtSmartVal(seg1.deltaVi)} V`)} עובר מיד לנגד המוצא: ${L(`Vo(t₀⁺) = ${fmtSmartVal(vJump)} V`)}.`,
        isCorrect: true
      };
      step2Distractors = [
        {
          key: '0 V (stays)',
          textHtml: L(`Vo(${t0Str}⁺) = 0 V`) + ' (רציפות ללא קפיצה)',
          feedbackHe: `טעות! ברשת ${T('HP')} המוצא הוא על הנגד ולכן <strong>כן קופץ</strong> ב-${L('ΔVi')}; רציפות מתקיימת רק על הקבל (${T('LP')}).`
        },
        {
          key: `${fmtSmartVal(-vJump)} V`,
          textHtml: L(`Vo(${t0Str}⁺) = ${fmtSmartVal(-vJump)} V`),
          feedbackHe: `בדקו את סימן הקפיצה: ${L(`ΔVi = Vi(t₀⁺) - Vi(t₀⁻) = ${fmtSmartVal(seg1.deltaVi)} V`)}.`
        },
        {
          key: `${fmtSmartVal(vJump * 0.5)} V`,
          textHtml: L(`Vo(${t0Str}⁺) = ${fmtSmartVal(vJump * 0.5)} V`),
          feedbackHe: `ברגע הקפיצה הקבל אינו משנה את מטענו, לכן כל הקפיצה (${L('100%')}) עוברת לנגד.`
        },
        {
          key: `${fmtSmartVal(vJump + 2)} V`,
          textHtml: L(`Vo(${t0Str}⁺) = ${fmtSmartVal(vJump + 2)} V`),
          feedbackHe: `השתמשו ב-${L('Vo(t₀⁺) = Vo(t₀⁻) + ΔVi')}.`
        }
      ];
      step2Hint = `HP: Vo(t₀⁺) = Vo(t₀⁻) + ΔVi = 0 + (${fmtSmartVal(seg1.deltaVi)}) = ${fmtSmartVal(vJump)} V`;
    }

    const step2 = {
      stepNum: 2,
      tabHe: '2. קפיצה t₀⁺',
      titleHe: `שלב 2 מתוך 4: מה קורה מיד ברגע הקפיצה הראשון (${L(t0Str + '⁺')})?`,
      promptHe: `ברגע הכניסה לקטע הראשון (${L(t0Str)}), למה שווה מתח המוצא ${L('Vo(t₀⁺)')} ברשת ${T(net)}?`,
      options: finalizeMcOptions(step2Correct, step2Distractors, seedBase + 22, (k) => ({
        key: `${fmtSmartVal((net === 'LP' ? seg1.VcStart : seg1.VrStartPlus) + k * 3)} V`,
        textHtml: L(`Vo(${t0Str}⁺) = ${fmtSmartVal((net === 'LP' ? seg1.VcStart : seg1.VrStartPlus) + k * 3)} V`),
        feedbackHe: `בדקו את כלל הקפיצה של רשת ${T(net)}.`
      })),
      mathHintLtr: step2Hint
    };

    // Step 3: Steady-state limit Vo(∞)
    let step3Correct, step3Distractors, step3Hint;
    if (net === 'LP') {
      const vf = seg1.VcTarget;
      const isZeroTarget = Math.abs(vf) < 1e-9;
      step3Correct = {
        key: `${fmtSmartVal(vf)} V`,
        textHtml: L(`Vo(∞) = ${fmtSmartVal(vf)} V`),
        feedbackHe: `נכון! לאחר ${L('5τ')} במבוא קבוע הקבל מתנהג כנתק, והמוצא של ${T('LP')} מגיע למתח המבוא הנוכחי (${L(fmtSmartVal(vf) + ' V')}).`,
        isCorrect: true
      };
      step3Distractors = isZeroTarget
        ? [
            {
              key: `${fmtSmartVal(seg1.VcStart)} V`,
              textHtml: L(`Vo(∞) = ${fmtSmartVal(seg1.VcStart)} V`),
              feedbackHe: `זהו המתח ההתחלתי של הקבל לפני הפריקה! במצב מתמיד כשהמבוא ${L('0 V')}, הקבל מתפרק עד ${L('0 V')}.`
            },
            {
              key: `${fmtSmartVal(-seg1.VcStart)} V`,
              textHtml: L(`Vo(∞) = ${fmtSmartVal(-seg1.VcStart)} V`),
              feedbackHe: `המתח על הקבל לא הופך סימן בפריקה אל אפס.`
            },
            {
              key: `${fmtSmartVal(0.368 * seg1.VcStart)} V`,
              textHtml: L(`Vo(∞) = ${fmtSmartVal(0.368 * seg1.VcStart)} V`),
              feedbackHe: `זהו המתח אחרי ${L('τ')} אחד (${L('36.8%')}), לא במצב מתמיד (${L('5τ')})!`
            }
          ]
        : [
            {
              key: '0 V',
              textHtml: L('Vo(∞) = 0 V'),
              feedbackHe: `דעיכה תמידית אל ${L('0 V')} מתקיימת ברשת ${T('HP')} (או בפריקה לאפס), לא בטעינת ${T('LP')} למבוא ${L(fmtSmartVal(vf) + ' V')}!`
            },
            {
              key: `${fmtSmartVal(0.632 * vf)} V`,
              textHtml: L(`Vo(∞) = ${fmtSmartVal(0.632 * vf)} V`),
              feedbackHe: `זו הרמה אחרי ${L('τ')} אחד בלבד (${L('63.2%')}), לא במצב מתמיד!`
            },
            {
              key: `${fmtSmartVal(seg1.VcStart)} V`,
              textHtml: L(`Vo(∞) = ${fmtSmartVal(seg1.VcStart)} V`),
              feedbackHe: `זה המתח ההתחלתי ${L('V₀')}, הקבל ממשיך להיטען לכיוון ${L(fmtSmartVal(vf) + ' V')}.`
            }
          ];
      step3Hint = `LP במצב מתמיד (≥5τ): הקבל כנתק  ⇒  Vo(∞) = Vi = ${fmtSmartVal(vf)} V`;
    } else {
      const refMag = Math.abs(seg1.Vi) > 1e-6 ? seg1.Vi : (Math.abs(seg1.prevVi) > 1e-6 ? seg1.prevVi : 10);
      step3Correct = {
        key: '0 V',
        textHtml: L('Vo(∞) = 0 V'),
        feedbackHe: `מדויק! ברשת ${T('HP')}, אחרי ${L('5τ')} הקבל טעון במלואו כנתק ולכן הזרם מתאפס ← המתח על הנגד הוא תמיד ${L('0 V')}.`,
        isCorrect: true
      };
      step3Distractors = [
        {
          key: `${fmtSmartVal(refMag)} V`,
          textHtml: L(`Vo(∞) = ${fmtSmartVal(refMag)} V`),
          feedbackHe: `זהו ערך הסף של ${T('LP')} (הקבל)! ברשת ${T('HP')} המוצא על הנגד דועך תמיד ל-${L('0 V')}.`
        },
        {
          key: `${fmtSmartVal(seg1.VrStartPlus)} V`,
          textHtml: L(`Vo(∞) = ${fmtSmartVal(seg1.VrStartPlus)} V`),
          feedbackHe: `זהו שיא הקפיצה ב-${L('t₀⁺')} — המתח על הנגד דועך משם בחזרה אל האפס.`
        },
        {
          key: `${fmtSmartVal(-Math.abs(seg1.VrStartPlus || refMag))} V`,
          textHtml: L(`Vo(∞) = ${fmtSmartVal(-Math.abs(seg1.VrStartPlus || refMag))} V`),
          feedbackHe: `המתח על הנגד יכול להיות שלילי בזמן מעבר, אך במצב מתמיד הוא מתאפס.`
        }
      ];
      step3Hint = `HP במצב מתמיד (≥5τ): הקבל כנתק (I = 0)  ⇒  Vo(∞) = VR = 0 V`;
    }

    const step3 = {
      stepNum: 3,
      tabHe: '3. מצב מתמיד',
      titleHe: `שלב 3 מתוך 4: לאן שואף המוצא במצב מתמיד (${L('≥ 5τ')})?`,
      promptHe: `אם המבוא בקטע זה (${L('Vi = ' + fmtSmartVal(seg1.Vi) + ' V')}) היה נשאר קבוע זמן רב, למה היה מגיע ${L('Vo')} ברשת ${T(net)}?`,
      options: finalizeMcOptions(step3Correct, step3Distractors, seedBase + 33, (k) => ({
        key: `${fmtSmartVal(k * 4)} V`,
        textHtml: L(`Vo(∞) = ${fmtSmartVal(k * 4)} V`),
        feedbackHe: `בדקו מה קורה לקבל ולזרם במצב מתמיד.`
      })),
      mathHintLtr: step3Hint
    };

    // Step 4: Strategy for next transition / formula / switch
    let step4Correct, step4Distractors, step4Title, step4Prompt, step4Hint;
    if (cfg.hasSwitch && cfg.hasSwitch.enabled) {
      const seg2 = postSegs[1] || seg1;
      const tau2Disp = E.fromSeconds(seg2.tau_s, u);
      const r2OnlyDisp = E.fromSeconds(cfg.hasSwitch.R2_ohm * cfg.C_F, u);
      const rSeriesDisp = E.fromSeconds((cfg.R1_ohm + cfg.hasSwitch.R2_ohm) * cfg.C_F, u);
      step4Title = 'שלב 4 מתוך 4: השפעת סגירת המפסק באמצע התהליך';
      step4Prompt = `ברגע שהמפסק ${L('S')} מחבר את ${L('R₂')} במקביל ל-${L('R₁')}, מהו קבוע הזמן החדש ${L('τ₂')} להמשך הטעינה?`;
      step4Correct = {
        key: `par:${fmtSmartVal(tau2Disp)}`,
        textHtml: `מחבר מקבילי ${L('R_eq = R₁ || R₂')}, לכן ${L(`τ₂ = ${fmtSmartVal(tau2Disp)} ${u}`)}`,
        feedbackHe: `מצוין! החיבור המקבילי מקטין את ההתנגדות השקולה ל-${L(E.fmtResistance(seg2.R_ohm))}, ולכן ${L(`τ₂ = ${fmtSmartVal(tau2Disp)} ${u}`)}.`,
        isCorrect: true
      };
      step4Distractors = [
        {
          key: `r2:${fmtSmartVal(r2OnlyDisp)}`,
          textHtml: `מחשב לפי ${L('R₂')} בלבד: ${L(`τ₂ = ${fmtSmartVal(r2OnlyDisp)} ${u}`)}`,
          feedbackHe: `לא לשכוח ש-${L('R₁')} עדיין מחובר במעגל! מחשבים שקול מקבילי ${L('R₁ || R₂')}.`
        },
        {
          key: `ser:${fmtSmartVal(rSeriesDisp)}`,
          textHtml: `מחבר בטור ${L('R₁ + R₂')}, לכן ${L(`τ₂ = ${fmtSmartVal(rSeriesDisp)} ${u}`)}`,
          feedbackHe: `המפסק מחבר את ${L('R₂')} <strong>במקביל</strong> ל-${L('R₁')}, לא בטור.`
        },
        {
          key: `same:${fmtSmartVal(tauDisp)}`,
          textHtml: `קבוע הזמן נשאר ללא שינוי: ${L(`τ₂ = ${fmtSmartVal(tauDisp)} ${u}`)}`,
          feedbackHe: `סגירת המפסק משנה את ההתנגדות במעגל ולכן משנה גם את ${L('τ')} מרגע הסגירה!`
        }
      ];
      step4Hint = `R_eq = (R₁·R₂)/(R₁+R₂) = ${E.fmtResistance(seg2.R_ohm)}  ⇒  τ₂ = ${fmtSmartVal(tau2Disp)} ${u}`;
    } else if (postSegs.length >= 2) {
      const seg2 = postSegs[1];
      const t2Str = `${fmtSmartVal(E.fromSeconds(seg2.tStart, u))} ${u}`;
      step4Title = `שלב 4 מתוך 4: מעבר לקטע הבא ב-${L(t2Str)}`;
      step4Prompt = `כדי למצוא מתח או זמן <strong>אחרי</strong> השינוי הבא במבוא (${L('t > ' + t2Str)}), מה חובה לעשות קודם?`;
      if (net === 'LP') {
        step4Correct = {
          key: 'lp-chain',
          textHtml: `לחשב את ${L(`Vo(${t2Str})`)} של סוף הקטע הקודם, ולהציב אותו כ-${L('V₀')} חדש עם ${L(`Δt = t - ${fmtSmartVal(E.fromSeconds(seg2.tStart, u))}`)}`,
          feedbackHe: `בדיוק! אי אפשר לדלג מעל שינוי במבוא — מציבים את מתח הקבל שנצבר בסוף הקטע הקודם כמתח ההתחלתי החדש!`,
          isCorrect: true
        };
        step4Distractors = [
          {
            key: 'lp-jump',
            textHtml: `להתחיל ישר מ-${L('V₀ = 0 V')} ולמדוד ${L('Δt = t')} מתחילת הגרף`,
            feedbackHe: `טעות! גם ה-${L('V₀')} (מתח הקבל שנצבר) וגם ${L('Δt = t - t₂')} משתנים בקטע החדש.`
          },
          {
            key: 'lp-single',
            textHtml: `להשתמש בנוסחה אחת מהתחלה כי הקבל מתעלם מהדופק באמצע`,
            feedbackHe: `אי אפשר לדלג בנוסחה אחת מעל קפיצה במתח המבוא!`
          },
          {
            key: 'lp-hp',
            textHtml: `להוסיף קפיצה של ${L(`ΔVi = ${fmtSmartVal(seg2.deltaVi)} V`)} ישירות למוצא`,
            feedbackHe: `זו התנהגות של רשת ${T('HP')} (נגד), לא של קבל ברשת ${T('LP')}!`
          }
        ];
        step4Hint = `סוף קטע 1: Vo(${t2Str}) = ${fmtSmartVal(seg2.VcStart)} V  ⇒  בקטע 2: V₀ = ${fmtSmartVal(seg2.VcStart)} V, Vf = ${fmtSmartVal(seg2.VcTarget)} V`;
      } else {
        step4Correct = {
          key: 'hp-chain',
          textHtml: `לחשב ${L(`Vo(${t2Str}⁻)`)}, להוסיף קפיצה ${L(`ΔVi = ${fmtSmartVal(seg2.deltaVi)} V`)} לקבלת ${L(`Vo(${t2Str}⁺) = ${fmtSmartVal(seg2.VrStartPlus)} V`)}, ולדעוך לאפס`,
          feedbackHe: `מדויק! כך בדיוק נמנעים מטעות ה-"מינוס Vi" ומקבלים את המוצא המדויק אחרי הירידה/קפיצה.`,
          isCorrect: true
        };
        step4Distractors = [
          {
            key: 'hp-minusvi',
            textHtml: `לקפוץ אוטומטית אל ${L(`${fmtSmartVal(seg2.deltaVi)} V`)} בלי לחשב כמה נשאר בסוף הקטע הקודם`,
            feedbackHe: `טעות נפוצה! המוצא קופץ ב-${L('ΔVi')} מתוך הערך שאליו דעך (${L(fmtSmartVal(seg1.VrEndMinus) + ' V')}), לא מאפס!`
          },
          {
            key: 'hp-stay',
            textHtml: `לשמור על רציפות המוצא בלי שום קפיצה ב-${L(t2Str)}`,
            feedbackHe: `רציפות יש רק על הקבל (${T('LP')}); ברשת ${T('HP')} המוצא קופץ בדיוק ב-${L('ΔVi')}.`
          },
          {
            key: 'hp-nonzero',
            textHtml: `לדעוך לכיוון ${L(`Vf = ${fmtSmartVal(seg2.Vi)} V`)} במקום אל ${L('0 V')}`,
            feedbackHe: `הנגד ברשת ${T('HP')} דועך <strong>תמיד</strong> לכיוון ${L('0 V')} בין קפיצות!`
          }
        ];
        step4Hint = `Vo(${t2Str}⁻) = ${fmtSmartVal(seg1.VrEndMinus)} V  ⇒  Vo(${t2Str}⁺) = ${fmtSmartVal(seg1.VrEndMinus)} + (${fmtSmartVal(seg2.deltaVi)}) = ${fmtSmartVal(seg2.VrStartPlus)} V`;
      }
    } else {
      step4Title = 'שלב 4 מתוך 4: בחירת הנוסחה והצבה לקטע';
      step4Prompt = `איזו משוואת זמן מתאימה לחישוב ${L('Vo(t)')} בתוך הקטע הזה (עבור ${L('Δt = t - ' + fmtSmartVal(E.fromSeconds(seg1.tStart, u)))})?`;
      const tauS = fmtSmartVal(tauDisp);
      if (net === 'LP') {
        const isZeroCharge = Math.abs(seg1.VcStart) < 1e-9;
        const goodFormula = isZeroCharge
          ? `Vo(t) = ${fmtSmartVal(seg1.VcTarget)}·(1 - e^(-Δt/${tauS}))`
          : `Vo(t) = ${fmtSmartVal(seg1.VcTarget)} + (${fmtSmartVal(seg1.VcStart)} - ${fmtSmartVal(seg1.VcTarget)})·e^(-Δt/${tauS})`;
        step4Correct = {
          key: 'lp-eq-ok',
          textHtml: L(goodFormula),
          feedbackHe: `נכון! הצבה מדויקת של ${L('V₀')}, ${L('Vf')} ו-${L(`τ = ${tauS} ${u}`)}.`,
          isCorrect: true
        };
        step4Distractors = [
          {
            key: 'lp-eq-hp',
            textHtml: L(`Vo(t) = ${fmtSmartVal(seg1.VrStartPlus || 10)}·e^(-Δt/${tauS})`),
            feedbackHe: `זו משוואה שמתאימה לדעיכה אל אפס / רשת ${T('HP')}, ולא למבנה הקטע הזה.`
          },
          {
            key: 'lp-eq-swap',
            textHtml: L(`Vo(t) = ${fmtSmartVal(seg1.VcStart)} + (${fmtSmartVal(seg1.VcTarget)} - ${fmtSmartVal(seg1.VcStart)})·e^(-Δt/${tauS})`),
            feedbackHe: `הפכת בין ${L('Vf')} ל-${L('V₀')}! הנוסחה הכללית היא ${L('Vf + (V₀ - Vf)·e^(-Δt/τ)')}.`
          },
          {
            key: 'lp-eq-5tau',
            textHtml: L(`Vo(t) = ${fmtSmartVal(seg1.VcTarget)}·(1 - e^(-Δt/${fmtSmartVal(5 * tauDisp)}))`),
            feedbackHe: `במעריך מציבים ${L('τ')}, לא ${L('5τ')}!`
          }
        ];
        step4Hint = goodFormula;
      } else {
        const goodHp = `Vo(t) = ${fmtSmartVal(seg1.VrStartPlus)}·e^(-Δt/${tauS})`;
        step4Correct = {
          key: 'hp-eq-ok',
          textHtml: L(goodHp),
          feedbackHe: `נכון! ברשת ${T('HP')} המוצא דועך מהקפיצה ${L(fmtSmartVal(seg1.VrStartPlus) + ' V')} אל ${L('0 V')}.`,
          isCorrect: true
        };
        step4Distractors = [
          {
            key: 'hp-eq-lp',
            textHtml: L(`Vo(t) = ${fmtSmartVal(seg1.Vi)}·(1 - e^(-Δt/${tauS}))`),
            feedbackHe: `זו משוואת טעינה של ${T('LP')}, לא של ${T('HP')}!`
          },
          {
            key: 'hp-eq-5tau',
            textHtml: L(`Vo(t) = ${fmtSmartVal(seg1.VrStartPlus)}·e^(-Δt/${fmtSmartVal(5 * tauDisp)})`),
            feedbackHe: `במעריך מציבים ${L('τ = ' + tauS)}, לא ${L('5τ')}.`
          },
          {
            key: 'hp-eq-sign',
            textHtml: L(`Vo(t) = ${fmtSmartVal(-seg1.VrStartPlus)}·e^(-Δt/${tauS})`),
            feedbackHe: `בדקו את סימן המוצא ב-${L('t₀⁺')}!`
          }
        ];
        step4Hint = goodHp;
      }
    }

    const step4 = {
      stepNum: 4,
      tabHe: '4. המשך הפתרון',
      titleHe: step4Title,
      promptHe: step4Prompt,
      options: finalizeMcOptions(step4Correct, step4Distractors, seedBase + 44),
      mathHintLtr: step4Hint
    };

    return [step1, step2, step3, step4];
  }

  global.RCContent = {
    FORMULA_ROWS,
    E_TABLE,
    PITFALLS,
    EXERCISES,
    UNIT_PREFIXES,
    TAU_SHORTCUTS,
    generateRandomExercise,
    generateTauMcQuestion,
    buildGuidedStepsForExercise
  };
})(window);
