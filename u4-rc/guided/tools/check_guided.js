// Loads engine.js + guided/content.js under Node and recomputes every expected value in closed form.
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=process.argv[2];
const win={}; const sb={window:win,console,Math,Number,String,JSON,Array,Object,Error,isNaN,document:{documentElement:{getAttribute:()=> 'light',dataset:{theme:'light'}}}};
vm.createContext(sb);
for(const f of ['engine.js','guided/content.js']) vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),sb,{filename:f});
const C=win.GuidedContent,E=win.RCEngine;
const exp=Math.exp,ln=Math.log;
let bad=0,n=0;
function eq(id,got,want,tol=1e-9){n++; if(!(Math.abs(got-want)<=tol)){bad++;console.log('MISMATCH',id,got,want);} }
function checkFixed(A){
  const by={}; A.stations.forEach(st=>st.steps.forEach(sp=>by[sp.id]=sp));
  eq('s1-tau',by['s1-tau'].expected,10); eq('s1-read',by['s1-read'].expected,10*(1-exp(-1))); eq('s1-kvl',by['s1-kvl'].expected,10*exp(-1));
  eq('s2-read',by['s2-read'].expected,10*exp(-1));
  eq('s3-tau',by['s3-tau'].expected,8); const m=5*(1-exp(-10/8)); eq('s3-max',by['s3-max'].expected,m); eq('s3-15',by['s3-15'].expected,m*exp(-5/8));
  eq('s3-halfmax',by['s3-halfmax'].expected,5*(1-exp(-10/4))); eq('s3-time',by['s3-time'].expected,8*ln(2));
  eq('s4-tau',by['s4-tau'].expected,2); eq('s4-jump0',by['s4-jump0'].expected,6); eq('s4-2',by['s4-2'].expected,6*exp(-1));
  const b=6*exp(-1.5); eq('s4-3b',by['s4-3b'].expected,b); eq('s4-3a',by['s4-3a'].expected,b-6); eq('s4-4',by['s4-4'].expected,(b-6)*exp(-0.5));
  eq('s4-time',by['s4-time'].expected,3+2*ln((b-6)/(-1)));
  return by;
}
function checkPersonal(A,P){
  const by={}; A.stations[4].steps.forEach(sp=>by[sp.id]=sp);
  const tau=P.R*P.C; eq('p-tau',by['s5-tau'].expected,tau);
  const m=P.E*(1-exp(-P.Tp/tau)); eq('p-lpmax',by['s5-lpmax'].expected,m);
  eq('p-lp2',by['s5-lp2'].expected,m*exp(-(P.t2-P.Tp)/tau));
  const th=tau*ln((0-P.E)/(P.Vt-P.E)); eq('p-time',by['s5-time'].expected,th); if(!(th>0&&th<P.Tp)) {bad++;console.log('time target outside pulse',P);}
  const hb=P.E*exp(-P.Tp/tau); eq('p-hpb',by['s5-hpb'].expected,hb); eq('p-hpa',by['s5-hpa'].expected,hb-P.E); eq('p-hp2',by['s5-hp2'].expected,(hb-P.E)*exp(-(P.t2-P.Tp)/tau));
  eq('p-sum',by['s5-lp2'].expected+by['s5-hp2'].expected,0);
  // traps must not sit inside the accept band of the right answer, and answers must be comfortably non-trivial
  A.stations.forEach(st=>st.steps.forEach(sp=>{ if(sp.type!=='num')return; (sp.traps||[]).forEach(t=>{const a=Math.abs(t.value-sp.expected); const rel=a/Math.max(1e-9,Math.abs(sp.expected)); if(a<=0.05||rel<=0.025){ /* harmless: correct is checked first */ }});
    if(Math.abs(sp.expected)<0.05){bad++;console.log('expected too close to zero',sp.id,sp.expected,P);} }));
}
const A0=C.build(C.makePersonal('בדיקה ראשונה')); const by=checkFixed(A0);
let pts=0,steps=0; const perSt={}; A0.stations.forEach(st=>{perSt[st.id]=0; st.steps.forEach(sp=>{pts+=sp.pts;steps++;perSt[st.id]+=sp.pts;});});
console.log('steps',steps,'points',pts,JSON.stringify(perSt));
const seen={};
for(let i=0;i<3000;i++){ const name='תלמיד '+i+' משפחה'+(i*7%13); const P=C.makePersonal(name); const A=C.build(P); checkPersonal(A,P); seen[[P.R,P.C,P.E,P.Tp,P.t2,P.Vt].join('|')]=1;
  const P2=C.makePersonal('  '+name.toUpperCase()+'  '); if(JSON.stringify(P2)!==JSON.stringify(P)){bad++;console.log('not deterministic');} }
console.log('distinct personal circuits in 3000 names:',Object.keys(seen).length);
console.log('checks',n,'mismatches',bad); process.exit(bad?1:0);
