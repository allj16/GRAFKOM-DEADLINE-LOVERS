const W=2200,H=2400,NS='http://www.w3.org/2000/svg';
const svg=document.getElementById('mapSvg');
svg.setAttribute('width',W);svg.setAttribute('height',H);
function el(t,a={},p=svg){const e=document.createElementNS(NS,t);for(const k in a)e.setAttribute(k,a[k]);p&&p.appendChild(e);return e;}
function g(a={},p=svg){return el('g',a,p);}
const rnd=(a,b)=>a+Math.random()*(b-a);
const rndInt=(a,b)=>Math.floor(rnd(a,b+1));

// ═══════════════════════════════════════
// DEFS & GRADIENTS
// ═══════════════════════════════════════
const defs=el('defs');
const mkGr=(id,stops,x2=0,y2=1)=>{const gr=el('linearGradient',{id,x1:0,y1:0,x2,y2},defs);stops.forEach(([o,c])=>el('stop',{offset:o,'stop-color':c},gr));return gr;};
mkGr('seaGr',[['0%','#b8ddf0'],['100%','#7ab5d0']]);
mkGr('landGr',[['0%','#f2ece0'],['100%','#e8e0d2']]);

const ISL=`M 128,418 C 88,508 72,648 92,808 C 112,968 162,1108 245,1250
  C 335,1400 485,1508 665,1588 C 855,1666 1065,1703 1282,1700
  C 1502,1696 1702,1650 1862,1560 C 2002,1480 2082,1360 2079,1218
  C 2075,1080 1960,970 1820,890 C 1680,810 1499,760 1319,700
  C 1159,646 1009,588 859,528 C 719,473 579,418 439,388
  C 339,366 222,370 128,418 Z`;
const iClip=el('clipPath',{id:'iClip'},defs);
el('path',{d:ISL},iClip);

const RA_R=32, RA_BYPASS_R=RA_R+14;
const RY=1480; // TETAP DISEDIAKAN AGAR SISTEM TIDAK ERROR

// ═══════════════════════════════════════
// NODE DEFINITIONS + ZONES (area acak)
// ═══════════════════════════════════════
// Zone: [xMin, xMax, yMin, yMax] — area boleh bergerak saat acak
// FIXED = tidak boleh bergerak: TP, PELB, BRIDGE
const NODE_DEF={
  TP:     {x:288, y:448,  name:'Tanjungpinang',          kind:'city',    fixed:true},
  PELB:   {x:170, y:538,  name:'Pelabuhan Tanjungpinang',kind:'port',    fixed:true},
  BATU10: {x:428, y:568,  name:'Taman Batu 10',          kind:'landmark',zone:[340,580,480,680]},
  SIMP1:  {x:565, y:680,  name:'Simpang Batu 12',        kind:'junction',zone:[480,700,600,800]},
  SEILEK: {x:645, y:862,  name:'Sei Lekop',              kind:'village', zone:[540,750,780,980]},
  KM16:   {x:768, y:748,  name:'Bundaran KM 16',         kind:'roundabout',ra:true,zone:[680,900,660,860]},
  KM18:   {x:928, y:858,  name:'KM 18',                  kind:'village', zone:[840,1060,780,980]},
  TOAPAYA:{x:1085,y:698,  name:'Toapaya',                kind:'village', zone:[960,1200,620,820]},
  KIJANG: {x:1048,y:992,  name:'Bundaran Kijang',        kind:'roundabout',ra:true,zone:[940,1160,880,1100]},
  KIJPSR: {x:992, y:1118, name:'Pasar Kijang',           kind:'market',  zone:[880,1100,1040,1220]},
  KAWALU: {x:1168,y:1225, name:'Kawal Utara',            kind:'village', zone:[1060,1280,1140,1360]},
  LAGOI:  {x:1280,y:700,  name:'Kawasan Lagoi',          kind:'resort',  zone:[1160,1420,600,820]},
  INL:    {x:1420,y:840,  name:'Simpang Utara',          kind:'junction',zone:[1300,1560,740,960]},
  BERAK:  {x:1750,y:1060, name:'Tanjung Berakit',        kind:'village', zone:[1620,1900,920,1160]},
  BRIDGE: {x:1180,y:1480, name:'Jembatan Kawal',         kind:'bridge',  fixed:true},
  KAWAL:  {x:1180,y:1590, name:'Simpang Kawal',          kind:'junction',zone:[1080,1320,1540,1660]},
  KAWALK: {x:1068,y:1650, name:'Kawal Kota',             kind:'city',    zone:[940,1180,1580,1700]},
  TKJUNC: {x:1600,y:1490, name:'Simpang Trikora',        kind:'junction',zone:[1480,1740,1380,1560]},
  TK1:    {x:1720,y:1380, name:'Pantai Trikora 1',       kind:'beach',   zone:[1600,1860,1260,1460]},
  TK2:    {x:1840,y:1310, name:'Pantai Trikora 2',       kind:'beach',   zone:[1720,1960,1180,1400]},
  TK3:    {x:1920,y:1170, name:'Pantai Trikora 3',       kind:'beach',   zone:[1800,2020,1060,1260]},
  TK4:    {x:1940,y:1040, name:'Pantai Trikora 4',       kind:'beach',   zone:[1820,2000,920,1120]},
};

// Posisi aktif (akan dimodifikasi saat acak)
let NODES={};
function resetNodes(){
  NODES={};
  for(const k in NODE_DEF){
    NODES[k]={...NODE_DEF[k]};
  }
}
resetNodes();

// ═══════════════════════════════════════════════════════════
// BOBOT JARAK NYATA (km) — SINKRON DENGAN PPT SLIDE 8
// Node PPT: A=BATU10, B=KM16, C=KAWALU, D=TK1, E=TK4
// A–B: 6 km, A–C: 14 km, B–C: 8 km, B–D: 22 km, C–D: 14 km, D–E: 8 km
// Node lain menggunakan jarak proporsional dari koordinat SVG (/40)
// ═══════════════════════════════════════════════════════════
const PPT_KM={
  'BATU10|KM16': 6,
  'BATU10|KAWALU': 14,
  'KM16|KAWALU': 8,
  'KM16|TK1': 22,
  'KAWALU|TK1': 14,
  'TK1|TK4': 8,
};
function getPptKm(a,b){
  const k1=a+'|'+b, k2=b+'|'+a;
  return PPT_KM[k1]||PPT_KM[k2]||null;
}

const EDGES_DEF_ORIG=[
  ['TP','PELB'],['TP','BATU10'],
  ['BATU10','SIMP1'],['SIMP1','KM16'],
  ['SIMP1','SEILEK'],['SEILEK','KM18'],
  ['KM16','KM18'],['KM16','TOAPAYA'],
  ['TOAPAYA','LAGOI'],['TOAPAYA','INL'],
  ['LAGOI','INL'],['INL','BERAK'],
  ['BERAK','TKJUNC'],['KM18','KIJANG'],
  ['KIJANG','KIJPSR'],['KIJPSR','KAWALU'],
  ['KIJANG','KAWALU'],['KAWALU','BRIDGE'],
  ['BRIDGE','KAWAL'],['KAWAL','KAWALK'],
  ['KAWAL','TKJUNC'],['INL','TKJUNC'],
  ['TKJUNC','TK1'],['TK1','TK2'],
  ['TK2','TK3'],['TK3','TK4'],
  ['TK4','BERAK'],['KAWALK','KIJPSR'],
];
function bezPt(ax,ay,bx,by,cx,cy,t){
  if(cx===undefined)return{x:ax+(bx-ax)*t,y:ay+(by-ay)*t};
  return{x:(1-t)*(1-t)*ax+2*(1-t)*t*cx+t*t*bx,y:(1-t)*(1-t)*ay+2*(1-t)*t*cy+t*t*by};
}
function clipToRing(fromX,fromY,raX,raY,cx,cy){
  const R=RA_BYPASS_R,steps=120;
  for(let i=0;i<=steps;i++){
    const t=i/steps;let px,py;
    if(cx!==undefined){px=(1-t)*(1-t)*fromX+2*(1-t)*t*cx+t*t*raX;py=(1-t)*(1-t)*fromY+2*(1-t)*t*cy+t*t*raY;}
    else{px=fromX+(raX-fromX)*t;py=fromY+(raY-fromY)*t;}
    if(Math.hypot(px-raX,py-raY)<=R)return t;
  }
  return 1;
}
function buildPts(ax,ay,bx,by,cx,cy,t0=0,t1=1,steps=48){
  const pts=[];
  for(let i=0;i<=steps;i++){const t=t0+(t1-t0)*(i/steps);pts.push([...Object.values(bezPt(ax,ay,bx,by,cx,cy,t))]);}
  return pts;
}
function curveLen(pts){let L=0;for(let i=1;i<pts.length;i++)L+=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);return L;}
function auto_curve(ax,ay,bx,by,jitter=0.12){
  const mx=(ax+bx)/2,my=(ay+by)/2;const dx=bx-ax,dy=by-ay;
  const nx=-dy,ny=dx;const L=Math.hypot(nx,ny)||1;
  const j=(Math.random()-0.5)*2*jitter;
  return{cx:mx+nx/L*Math.hypot(dx,dy)*j,cy:my+ny/L*Math.hypot(dx,dy)*j};
}
let ADJ={},EMETA=[];

function buildGraph(){
  ADJ={}; EMETA=[];
  const edgeSet=new Set();
  
  EDGES_DEF_ORIG.forEach(([a,b])=>{
    const key=[a,b].sort().join('|');
    if(edgeSet.has(key)) return; edgeSet.add(key);
    
    const A=NODES[a], B=NODES[b];
    
    // Ctrl point: pakai auto-curve (slight random bend)
    const {cx,cy}=autoCurve(A.x,A.y,B.x,B.y,0.10);
    let t0=0, t1=1;
    if(NODES[b].ra){const t=clipToRing(A.x,A.y,B.x,B.y,cx,cy);t1=t;}
    if(NODES[a].ra){const t=clipToRing(B.x,B.y,A.x,A.y,cx,cy);t0=1-t;}
    const pts=buildPts(A.x,A.y,B.x,B.y,cx,cy,t0,t1);
    const svgLen=curveLen(pts);
    
    // ═════════════════════════════════════════════════════════════
    // SINKRONISASI PPT SLIDE 8: BOBOT KM NYATA
    // Jika edge ini ada di tabel PPT, pakai nilai km asli.
    // Edge lain: konversi proporsional dari pixel SVG (/40)
    // ═════════════════════════════════════════════════════════════
    const pptKm=getPptKm(a,b);
    // len = nilai km yang dipakai Dijkstra; lenKm = ditampilkan ke user
    const lenKm = pptKm !== null ? pptKm : parseFloat((svgLen/40).toFixed(1));
    const len = lenKm; // Dijkstra kini pakai satuan km
    
    const isTrikoraRoute = ['TKJUNC','TK1','TK2','TK3','TK4','KAWAL','BRIDGE'].some(n=>n===a||n===b);
    
    const meta={
      a, b, cx, cy, t0, t1, pts,
      svgLen,      // panjang kurva pixel (untuk animasi)
      len,         // bobot km (untuk Dijkstra & tampilan)
      lenKm,       // label km di UI
      isPptEdge: pptKm !== null, // flag: edge ini dari PPT
      scenic: isTrikoraRoute
    };
    
    ADJ[a]=ADJ[a]||[]; ADJ[b]=ADJ[b]||[];
    ADJ[a].push({to:b, len, meta}); ADJ[b].push({to:a, len, meta});
    EMETA.push(meta);
  });
}

//function EdgeD()
function edgeD(m){
  const A=NODES[m.a],B=NODES[m.b];const p0=bezPt(A.x,A.y,B.x,B.y,m.cx,m.cy,m.t0),p1=bezPt(A.x,A.y,B.x,B.y,m.cx,m.cy,m.t1);
  return`M${p0.x.toFixed(1)},${p0.y.toFixed(1)} Q${m.cx.toFixed(1)},${m.cy.toFixed(1)} ${p1.x.toFixed(1)},${p1.y.toFixed(1)}`;
}

const NAT=new Set(['TP|BATU10','BATU10|SIMP1','SIMP1|KM16','KM16|KM18','KM18|KIJANG',
  'KIJANG|KAWALU','KAWALU|BRIDGE','BRIDGE|KAWAL','KAWAL|TKJUNC','TKJUNC|TK1',
  'TK1|TK2','TK2|TK3','TK3|TK4','KAWAL|KAWALK']);
function isNat(m){const k1=m.a+'|'+m.b,k2=m.b+'|'+m.a;return NAT.has(k1)||NAT.has(k2);}

// ═══════════════════════════════════════
// SVG LAYER GROUPS (persistent containers)
// ═══════════════════════════════════════
// Laut & daratan (static)
el('rect',{x:0,y:0,width:W,height:H,fill:'url(#seaGr)'});
for(let y=0;y<H;y+=38)
  el('path',{d:`M0,${y} Q${W*.25},${y-6} ${W*.55},${y+2} Q${W*.8},${y+7} ${W},${y+1}`,stroke:'rgba(255,255,255,.09)','stroke-width':1,fill:'none'});
const landG=g();
el('path',{d:ISL,fill:'url(#landGr)',stroke:'#c8b8a0','stroke-width':2},landG);

// Dynamic layers yang akan di-clear+rebuild saat regen
const grnG=g({'clip-path':'url(#iClip)'});
const beachContainerG=g({'clip-path':'url(#iClip)'});
const riverG=g(); // FIXED — sungai tidak berubah
const shadG=g(),baseG=g(),topG=g(),ctrG=g();
// bundaran G dibuat per-node
let raGroups={};
// jembatan G — FIXED
const bridgeContainerG=g();
const bldG=g({'clip-path':'url(#iClip)'});
const routeG=g();svg.appendChild(routeG);
const lblG=g();
const nodeG=g();
const gpsG=el('g',{style:'display:none'});
el('circle',{cx:0,cy:0,r:26,fill:'rgba(56,184,240,0.15)',stroke:'rgba(56,184,240,0.35)','stroke-width':1.5},gpsG);
el('circle',{cx:0,cy:0,r:11,fill:'#1a6fb5',stroke:'#fff','stroke-width':2.5},gpsG);
el('circle',{cx:0,cy:0,r:4.5,fill:'#fff'},gpsG);
svg.appendChild(gpsG);
const carG=g({style:'display:none'});
el('ellipse',{cx:0,cy:9,rx:18,ry:4,fill:'rgba(0,0,0,.25)'},carG);
el('rect',{x:-16,y:0,width:32,height:11,fill:'#1558c0',stroke:'#0d3d8a','stroke-width':.8,rx:2},carG);
el('path',{d:'M -9,-10 C -12,-10 -14,-6 -14,0 L 14,0 C 14,-6 10,-10 8,-10 Z',fill:'#1a73e8',stroke:'#0d3d8a','stroke-width':.8},carG);
el('path',{d:'M -8,-9 L -12,-1 L -5,-1 L -6,-9 Z',fill:'rgba(178,218,252,.82)'},carG);
el('path',{d:'M 5,-9 L 7,-1 L 12,-1 L 10,-9 Z',fill:'rgba(178,218,252,.82)'},carG);
el('rect',{x:-4,y:-8,width:7,height:7,fill:'rgba(178,218,252,.75)',rx:.5},carG);
el('circle',{cx:-9,cy:11,r:5.5,fill:'#222',stroke:'#555','stroke-width':1.2},carG);
el('circle',{cx:9,cy:11,r:5.5,fill:'#222',stroke:'#555','stroke-width':1.2},carG);
el('circle',{cx:-9,cy:11,r:2.5,fill:'#bbb'},carG);el('circle',{cx:9,cy:11,r:2.5,fill:'#bbb'},carG);
el('rect',{x:13,y:1,width:3.5,height:3,fill:'#fffc99',rx:.5},carG);
el('rect',{x:-17,y:1,width:3,height:3,fill:'#ff3322',rx:.5},carG);
svg.appendChild(carG);

// ═══════════════════════════════════════
// DRAW FUNCTIONS
// ═══════════════════════════════════════

function drawGreen(){
  while(grnG.firstChild)grnG.removeChild(grnG.firstChild);
  // Area hijau mengikuti posisi node terdekat
  const grns=[
    {near:'SEILEK',ox:-120,oy:0,rx:100,ry:70},
    {near:'KIJPSR',ox:-60,oy:60,rx:90,ry:65},
    {near:'BERAK',ox:-120,oy:-60,rx:90,ry:65},
    {near:'TOAPAYA',ox:60,oy:60,rx:80,ry:60},
  ];
  grns.forEach(g2=>{
    const n=NODES[g2.near];
    const cx2=n.x+g2.ox,cy2=n.y+g2.oy;
    // simple ellipse-based green patch
    const d=`M ${cx2-g2.rx},${cy2} Q ${cx2},${cy2-g2.ry} ${cx2+g2.rx},${cy2} Q ${cx2},${cy2+g2.ry} ${cx2-g2.rx},${cy2} Z`;
    el('path',{d,fill:'#b0d870',stroke:'#88b048','stroke-width':1.2,opacity:.92},grnG);
  });
}

function drawBeaches(){
  while(beachContainerG.firstChild)beachContainerG.removeChild(beachContainerG.firstChild);
  [{key:'TK1',rx:82,ry:52,rot:-18},{key:'TK2',rx:74,ry:48,rot:-10},
   {key:'TK3',rx:65,ry:43,rot:-3},{key:'TK4',rx:62,ry:40,rot:5}].forEach(b=>{
    const n=NODES[b.key];
    const bg2=g({transform:`rotate(${b.rot},${n.x},${n.y})`},beachContainerG);
    el('ellipse',{cx:n.x,cy:n.y,rx:b.rx,ry:b.ry,fill:'#f0d888',stroke:'#d8bc60','stroke-width':1.5,opacity:.95},bg2);
    el('ellipse',{cx:n.x+b.rx*.15,cy:n.y+b.ry*.3,rx:b.rx*.65,ry:b.ry*.35,fill:'#a0d0e8',opacity:.72},bg2);
    for(let i=0;i<3;i++){const wy=n.y+b.ry*.28+i*6;el('path',{d:`M${n.x-b.rx*.45},${wy} Q${n.x},${wy-5} ${n.x+b.rx*.45},${wy}`,stroke:'rgba(255,255,255,.65)','stroke-width':1.2,fill:'none'},bg2);}
  });
}

// Sungai: FIXED di RY — tidak berubah
function drawRiver(){
  while(riverG.firstChild) riverG.removeChild(riverG.firstChild);
  
  // Aliran air sungai utama dihapus total dari sini agar tidak muncul di peta
  
  // Laguna tetap dipertahankan mengikuti posisi LAGOI agar daerah wisata tidak ikut hilang
  const LAG = NODES.LAGOI;
  el('ellipse',{cx:LAG.x+50,cy:LAG.y+110,rx:58,ry:38,fill:'#6dbee0',stroke:'#4a9fc0','stroke-width':2},riverG);
  el('ellipse',{cx:LAG.x+50,cy:LAG.y+110,rx:58,ry:38,fill:'rgba(255,255,255,.15)'},riverG);
  el('text',{x:LAG.x+50,y:LAG.y+116,fill:'#2a6888','font-size':9,'font-weight':600,'text-anchor':'middle','font-family':'inherit'},riverG).textContent='Laguna Lagoi';
}
  
  function drawRiverSeg(d,w,parent){
    el('path',{d,stroke:'#3a8fb0','stroke-width':w+14,fill:'none','stroke-linecap':'round','stroke-linejoin':'round'},parent);
    el('path',{d,stroke:'#5daed0','stroke-width':w+4,fill:'none','stroke-linecap':'round','stroke-linejoin':'round'},parent);
    el('path',{d,stroke:'#8dd4f0','stroke-width':Math.max(4,w-6),fill:'none','stroke-linecap':'round','stroke-linejoin':'round'},parent);
    const rsh=el('path',{d,stroke:'rgba(255,255,255,.5)','stroke-width':2,fill:'none','stroke-dasharray':'16 12'},parent);
    el('animate',{attributeName:'stroke-dashoffset',from:'0',to:'-56',dur:'3.5s',repeatCount:'indefinite'},rsh);
  }

  // 1. BUAT GROUP KHUSUS SUNGAI YANG DIKUNCI DI DALAM PULAU (CLIP PATH)
  const clippedRiverG = g({'clip-path': 'url(#iClip)'}, riverG);

  // Menggunakan koordinat berliku (path) agar mengalir pas melewati jembatan dan di dalam daratan pulau
  const BRDG=NODE_DEF.BRIDGE; 
  const RD_FULL=`M 400,1480 C 600,1460 750,1520 900,1490 C 1050,1460 1130,1480 ${BRDG.x},1480 C 1220,1480 1250,1510 1350,1490 C 1500,1460 1700,1530 1900,1500`;
  
  // Gambar sungai di dalam group clipped agar tidak bocor ke laut lepas
  drawRiverSeg(RD_FULL,22,clippedRiverG);

  // 2. LAGUNA (Tetap digambar normal di riverG agar tidak terpotong jika di pinggir)
  const LAG=NODES.LAGOI;
  el('ellipse',{cx:LAG.x+50,cy:LAG.y+110,rx:58,ry:38,fill:'#6dbee0',stroke:'#4a9fc0','stroke-width':2},riverG);
  el('ellipse',{cx:LAG.x+50,cy:LAG.y+110,rx:58,ry:38,fill:'rgba(255,255,255,.15)'},riverG);
  el('text',{x:LAG.x+50,y:LAG.y+116,fill:'#2a6888','font-size':9,'font-weight':600,'text-anchor':'middle','font-family':'inherit'},riverG).textContent='Laguna Lagoi';
  
  // 3. TEKS NAMA SUNGAI (Disesuaikan posisinya di dekat jembatan baru)
  el('text',{x:BRDG.x-110,y:1520,fill:'#1e5f7a','font-size':11,'font-weight':700,'font-style':'italic','text-anchor':'middle','font-family':'inherit'},riverG).textContent='Sungai Kawal';


function drawRoads(){
  while(shadG.firstChild)shadG.removeChild(shadG.firstChild);
  while(baseG.firstChild)baseG.removeChild(baseG.firstChild);
  while(topG.firstChild)topG.removeChild(topG.firstChild);
  while(ctrG.firstChild)ctrG.removeChild(ctrG.firstChild);
  EMETA.forEach(m=>{
    const d=edgeD(m),nat=isNat(m),w=nat?20:14;
    el('path',{d,stroke:'rgba(0,0,0,.13)','stroke-width':w+7,fill:'none','stroke-linecap':'round',transform:'translate(1,3)'},shadG);
    el('path',{d,stroke:'#beb090','stroke-width':w+4,fill:'none','stroke-linecap':'round'},baseG);
    el('path',{d,stroke:'#f5f0e6','stroke-width':w,fill:'none','stroke-linecap':'round'},topG);
    el('path',{d,stroke:nat?'#f5c030':'rgba(175,162,115,.45)','stroke-width':nat?2.2:1.2,fill:'none','stroke-dasharray':nat?'0':'10 8'},ctrG);
  });
}

function drawRA(key){
  if(raGroups[key]){try{svg.removeChild(raGroups[key]);}catch(e){}}
  const n=NODES[key],rg=g();
  el('circle',{cx:n.x,cy:n.y,r:RA_R+16,fill:'#beb090'},rg);
  el('circle',{cx:n.x,cy:n.y,r:RA_R+12,fill:'#f5f0e6'},rg);
  el('circle',{cx:n.x+2,cy:n.y+4,r:RA_R+4,fill:'rgba(0,0,0,.12)'},rg);
  el('circle',{cx:n.x,cy:n.y,r:RA_R+2,fill:'#e8e2d2',stroke:'#beb090','stroke-width':1.5},rg);
  el('circle',{cx:n.x,cy:n.y,r:RA_R,fill:'#88b048',stroke:'#609030','stroke-width':2},rg);
  el('circle',{cx:n.x,cy:n.y,r:RA_R*.65,fill:'#6a9838'},rg);
  el('circle',{cx:n.x,cy:n.y,r:RA_R*.32,fill:'#508028'},rg);
  el('circle',{cx:n.x,cy:n.y,r:RA_R*.14,fill:'#e8e0d0'},rg);
  el('circle',{cx:n.x,cy:n.y,r:RA_R+8,fill:'none',stroke:'rgba(180,160,80,.6)','stroke-width':1.2,'stroke-dasharray':'8 6'},rg);
  el('circle',{cx:n.x,cy:n.y,r:RA_BYPASS_R,fill:'none',stroke:'#f5f0e6','stroke-width':10},rg);
  el('circle',{cx:n.x,cy:n.y,r:RA_BYPASS_R,fill:'none',stroke:'rgba(240,190,50,.5)','stroke-width':1.5,'stroke-dasharray':'8 6'},rg);
  // Insert before bridgeContainerG so bridges appear on top
  svg.insertBefore(rg, bridgeContainerG);
  raGroups[key]=rg;
}

// ── JEMBATAN — FIXED, hanya dibangun sekali ──
function drawBridge(){
  while(bridgeContainerG.firstChild) bridgeContainerG.removeChild(bridgeContainerG.firstChild);
  
  const BRDG = NODE_DEF.BRIDGE;
  
  // Membuat grup jembatan tepat di posisi koordinat Jembatan Kawal yang baru
  const bg2 = g({transform:`translate(${BRDG.x},1480)`}, bridgeContainerG);
  
  // 1. Efek Bayangan Jembatan di Atas Air
  el('rect',{x:-22, y:-12, width:44, height:24, fill:'rgba(0,0,0,0.18)', rx:2}, bg2);
  
  // 2. Struktur Utama Badan Jembatan (Warna Beton Abu-abu)
  el('rect',{x:-18, y:-12, width:36, height:24, fill:'#cfc8ae', stroke:'#a09880', 'stroke-width':2, rx:3}, bg2);
  
  // 3. Garis Markah Jalan di Tengah Jembatan
  el('line',{x1:-18, y1:0, x2:18, y2:0, stroke:'#fff', 'stroke-dasharray':'5,3', 'stroke-width':1.5}, bg2);
  
  // 4. Pembatas Pengaman Jembatan (Railing Atas & Bawah)
  el('line',{x1:-18, y1:-11, x2:18, y2:-11, stroke:'#7a7260', 'stroke-width':1.5}, bg2);
  el('line',{x1:-18, y1:11,  x2:18, y2:11,  stroke:'#7a7260', 'stroke-width':1.5}, bg2);
}

function bezAtY(ax,ay,bx,by,cxb,cyb,targetY){
  const qa=ay-2*cyb+by,qb=2*cyb-2*ay,qc=ay-targetY;let t=null;
  if(Math.abs(qa)<.001){const tt=-qc/qb;if(tt>=0&&tt<=1)t=tt;}
  else{const d=qb*qb-4*qa*qc;if(d>=0){const t1=(-qb+Math.sqrt(d))/(2*qa),t2=(-qb-Math.sqrt(d))/(2*qa);if(t1>=0&&t1<=1)t=t1;else if(t2>=0&&t2<=1)t=t2;}}
  if(t===null)return null;
  const px=(1-t)*(1-t)*ax+2*(1-t)*t*cxb+t*t*bx;
  const dx2=2*(1-t)*(cxb-ax)+2*t*(bx-cxb),dy2=2*(1-t)*(cyb-ay)+2*t*(by-cyb);
  return{x:px,y:targetY,angle:Math.atan2(dy2,dx2)};
}

// Jembatan dibangun sekali — FIXED
function buildBridges(){
  while(bridgeContainerG.firstChild)bridgeContainerG.removeChild(bridgeContainerG.firstChild);
  const bridgeDone=new Set();
  // Dari graph asli — cari edge yang melintasi RY
  EDGES_DEF_ORIG.forEach(([a,b])=>{
    const bk=[a,b].sort().join('|');if(bridgeDone.has(bk))return;
    // Gunakan posisi FIXED (NODE_DEF) untuk sungai
    const A=NODE_DEF[a]||NODES[a],B=NODE_DEF[b]||NODES[b];
    if(!A||!B)return;
    const minY=Math.min(A.y,B.y),maxY=Math.max(A.y,B.y);
    if(minY>=RY||maxY<RY)return;
    const t0e=(RY-A.y)/(B.y-A.y);const xEst=A.x+(B.x-A.x)*t0e;
    if(xEst<400||xEst>1420)return;
    bridgeDone.add(bk);
    // Auto curve untuk jembatan ini
    const{cx,cy}=autoCurve(A.x,A.y,B.x,B.y,0);
    const info=bezAtY(A.x,A.y,B.x,B.y,cx,cy,RY);
    if(!info)return;
    const sinA=Math.abs(Math.sin(info.angle));
    drawBridge(info.x,info.y,info.angle,sinA>0.15?Math.min(92,Math.max(58,38/sinA)):74,'Jembatan Kawal');
  });
  // Jembatan fix tambahan (posisi FIXED)
  if(!bridgeDone.has('BRIDGE|KAWALU')){
    const ang=Math.atan2(NODE_DEF.BRIDGE.y-NODE_DEF.KAWALU.y,NODE_DEF.BRIDGE.x-NODE_DEF.KAWALU.x);
    drawBridge(NODE_DEF.BRIDGE.x,NODE_DEF.BRIDGE.y,ang,60,'Jembatan Kawal');
    bridgeDone.add('BRIDGE|KAWALU');
  }
  if(!bridgeDone.has('KAWAL|TKJUNC')){
    drawBridge(1390,1540,Math.atan2(1490-1590,1600-1180),72,'Jembatan Trikora');
    bridgeDone.add('KAWAL|TKJUNC');
  }
  if(!bridgeDone.has('KAWALK|KIJPSR')){
    // Gunakan posisi asli
    const A=NODE_DEF.KAWALK,B=NODE_DEF.KIJPSR;
    const{cx:cx2,cy:cy2}=autoCurve(A.x,A.y,B.x,B.y,0);
    const info=bezAtY(A.x,A.y,B.x,B.y,cx2,cy2,RY);
    if(info&&info.x>400&&info.x<1420){
      const s=Math.abs(Math.sin(info.angle));
      drawBridge(info.x,info.y,info.angle,s>0.15?Math.min(92,Math.max(58,38/s)):74,'Jembatan Kawal');
      bridgeDone.add('KAWALK|KIJPSR');
    }
  }
}

// ── BANGUNAN ──
function dToRoads(x,y){let m=Infinity;for(const e of EMETA)for(let i=0;i<e.pts.length-1;i++){const[x1,y1]=e.pts[i],[x2,y2]=e.pts[i+1];const dx=x2-x1,dy=y2-y1,L2=dx*dx+dy*dy||1;const t=Math.max(0,Math.min(1,((x-x1)*dx+(y-y1)*dy)/L2));const d=Math.hypot(x-x1-t*dx,y-y1-t*dy);if(d<m)m=d;}return m;}
function dToNode(x,y){let m=Infinity;for(const k in NODES){const d=Math.hypot(x-NODES[k].x,y-NODES[k].y);if(d<m)m=d;}return m;}
function inWater(x,y){
  if(x<152||y>1668||x>2072)return true;
  if(Math.abs(y-RY)<42&&x>400&&x<1440)return true;
  const LAG=NODES.LAGOI;
  if(Math.hypot(x-(LAG.x+50),y-(LAG.y+110))<64)return true;
  return false;
}
function nearBeach(x,y){
  for(const bk of['TK1','TK2','TK3','TK4']){
    const n=NODES[bk];const r={TK1:85,TK2:78,TK3:68,TK4:65}[bk];
    if(Math.hypot(x-n.x,y-n.y)<r)return true;
  }
  return false;
}
function nearRA(x,y){for(const k of['KM16','KIJANG'])if(Math.hypot(x-NODES[k].x,y-NODES[k].y)<RA_R+28)return true;return false;}
function darken(hex,a){const n=parseInt(hex.replace('#',''),16);return`#${[16,8,0].map(s=>Math.max(0,((n>>s)&255)-a).toString(16).padStart(2,'0')).join('')}`;}
const hC=['#e8dcc8','#ddd4c0','#e4d8c4','#d8cfc0','#e2d4bc'],bC=['#d4caba','#c8bfb0','#d0c8b8','#ccbfb0'];
function drawHouse(x,y,w,h,col,parent){
  const bg=g({},parent);
  el('rect',{x:x+2,y:y+3,width:w,height:h,fill:'rgba(0,0,0,.15)',rx:2},bg);
  el('rect',{x,y,width:w,height:h,fill:col,stroke:'rgba(0,0,0,.2)','stroke-width':.8,rx:1},bg);
  el('polygon',{points:`${x-2},${y} ${x+w/2},${y-h*.38} ${x+w+2},${y}`,fill:darken(col,28),stroke:'rgba(0,0,0,.18)','stroke-width':.7},bg);
  el('rect',{x:x+w/2-2.2,y:y+h*.7,width:4.4,height:h*.28,fill:'rgba(0,0,0,.3)',rx:1},bg);
  if(w>14){el('rect',{x:x+3,y:y+3,width:w*.19,height:h*.22,fill:'rgba(188,218,252,.8)',rx:.5},bg);el('rect',{x:x+w-3-w*.19,y:y+3,width:w*.19,height:h*.22,fill:'rgba(188,218,252,.8)',rx:.5},bg);}
}
function drawBuilding(x,y,w,h,col,parent){
  const bg=g({},parent);
  el('rect',{x:x+2,y:y+3,width:w,height:h,fill:'rgba(0,0,0,.15)',rx:2},bg);
  el('rect',{x,y,width:w,height:h,fill:col,stroke:'rgba(0,0,0,.2)','stroke-width':1,rx:2},bg);
  el('rect',{x:x-1,y:y-3,width:w+2,height:5,fill:darken(col,18),stroke:'rgba(0,0,0,.18)','stroke-width':.8,rx:1},bg);
  const cc=Math.max(1,Math.floor(w/10)),rr=Math.max(1,Math.floor(h/12));
  const cw3=(w-6)/cc,ch3=(h-8)/rr;
  for(let r2=0;r2<rr;r2++)for(let c2=0;c2<cc;c2++)el('rect',{x:x+3+c2*cw3+1,y:y+4+r2*ch3+1,width:Math.max(2,cw3-2),height:Math.max(2,ch3-2),fill:Math.random()>.38?'rgba(198,228,252,.82)':'rgba(58,78,98,.58)',rx:.5},bg);
}
const SKIP_BLD=new Set(['BRIDGE','KM16','KIJANG']);
function drawBuildings(){
  while(bldG.firstChild)bldG.removeChild(bldG.firstChild);
  Object.keys(NODES).forEach(k=>{
    if(SKIP_BLD.has(k))return;const n=NODES[k];
    const cnt={city:8,village:4,market:5,beach:2,port:4,resort:5,junction:2,landmark:3}[n.kind]||3;
    let pl=0,tr=0;
    while(pl<cnt&&tr<80){tr++;const ang=rnd(0,Math.PI*2),dist=rnd(30,72);const bx=n.x+Math.cos(ang)*dist,by=n.y+Math.sin(ang)*dist;
      if(dToRoads(bx,by)<13||dToRoads(bx,by)>64)continue;
      if(dToNode(bx,by)<28||inWater(bx,by)||nearBeach(bx,by)||nearRA(bx,by))continue;
      const city=n.kind==='city'||n.kind==='market'||n.kind==='resort';
      if(city&&Math.random()>.5){const bw=rnd(18,30),bh=rnd(14,22);drawBuilding(bx-bw/2,by-bh/2,bw,bh,bC[Math.floor(rnd(0,bC.length))],bldG);}
      else{const hw=rnd(12,20),hh=rnd(10,16);drawHouse(bx-hw/2,by-hh/2,hw,hh,hC[Math.floor(rnd(0,hC.length))],bldG);}
      pl++;
    }
  });
  EMETA.forEach(m=>{if(m.len<180)return;const steps=Math.floor(m.len/90);for(let i=1;i<steps;i++){if(Math.random()>.35)continue;const t=i/steps,idx=Math.floor(t*(m.pts.length-1));const p1=m.pts[idx],p2=m.pts[Math.min(idx+1,m.pts.length-1)];const dx=p2[0]-p1[0],dy=p2[1]-p1[1],L=Math.hypot(dx,dy)||1;const nx=dy/L,ny=-dx/L;const side=Math.random()>.5?1:-1;const off=rnd(22,42);const bxr=p1[0]+nx*off*side,byr=p1[1]+ny*off*side;if(dToNode(bxr,byr)<30||dToRoads(bxr,byr)<11||inWater(bxr,byr)||nearBeach(bxr,byr)||nearRA(bxr,byr))continue;const hw=rnd(11,17),hh=rnd(9,14);drawHouse(bxr-hw/2,byr-hh/2,hw,hh,hC[Math.floor(rnd(0,hC.length))],bldG);}});
}

// LABELS
function drawLabels(){
  while(lblG.firstChild)lblG.removeChild(lblG.firstChild);
  function lbl(x,y,txt,sz,col,fw='700'){el('text',{x,y,fill:col,'font-size':sz,'font-weight':fw,'text-anchor':'middle','font-family':'inherit',stroke:'rgba(255,255,255,.85)','stroke-width':3,'paint-order':'stroke'},lblG).textContent=txt;}
  lbl(105,1102,'SELAT RIAU',19,'rgba(22,78,122,.45)','600');
  lbl(2042,792,'LAUT CHINA SELATAN',16,'rgba(22,78,122,.45)','600');
  const TP=NODES.TP,KIJ=NODES.KIJANG,KW=NODES.KAWALK,LAG=NODES.LAGOI;
  lbl(TP.x,TP.y-68,'TANJUNGPINANG',15,'#202124');
  lbl(KIJ.x,KIJ.y-70,'KIJANG',14,'#202124');
  lbl(KW.x,KW.y+54,'KAWAL',13,'#202124');
  lbl(LAG.x,LAG.y-60,'KAWASAN LAGOI',12,'#202124');
  ['TK1','TK2','TK3','TK4'].forEach((k,i)=>{const n=NODES[k];lbl(n.x,n.y+70,'Trikora '+(i+1),10,'#186878');});
  lbl(NODES.PELB.x,NODES.PELB.y-30,'Pelabuhan',11,'#3c4f8a');
}

// ── PINS ──
const NC={city:'#1a73e8',junction:'#fbbc04',village:'#34a853',market:'#e91e63',beach:'#00acc1',port:'#3f51b5',resort:'#9c27b0',bridge:'#795548',roundabout:'#ff7043',landmark:'#43a047'};
function drawPins(){
  while(nodeG.firstChild)nodeG.removeChild(nodeG.firstChild);
  Object.keys(NODES).forEach(key=>{
    const n=NODES[key],c=NC[n.kind]||'#666';
    if(key==='BRIDGE')return;
    const pg=g({'data-key':key,class:'poi',style:'cursor:pointer'},nodeG);
    const pulse=el('circle',{cx:n.x,cy:n.y-18,r:14,fill:'none',stroke:c,'stroke-width':2,opacity:0},pg);
    el('animate',{attributeName:'r',from:'10',to:'24',dur:'2.2s',repeatCount:'indefinite'},pulse);
    el('animate',{attributeName:'opacity',from:'0.55',to:'0',dur:'2.2s',repeatCount:'indefinite'},pulse);
    el('ellipse',{cx:n.x+1,cy:n.y+10,rx:6,ry:2.5,fill:'rgba(0,0,0,.22)'},pg);
    el('path',{d:`M${n.x},${n.y-28} C${n.x-12},${n.y-28} ${n.x-12},${n.y-10} ${n.x},${n.y-10} C${n.x+12},${n.y-10} ${n.x+12},${n.y-28} ${n.x},${n.y-28} Z`,fill:c,stroke:'rgba(0,0,0,.2)','stroke-width':.8},pg);
    el('path',{d:`M${n.x},${n.y-10} L${n.x},${n.y+1}`,stroke:c,'stroke-width':2.5,'stroke-linecap':'round'},pg);
    el('circle',{cx:n.x,cy:n.y-19,r:6,fill:'rgba(255,255,255,.92)'},pg);
    el('circle',{cx:n.x,cy:n.y-19,r:3.8,fill:c},pg);
    const lbg=g({opacity:0,'pointer-events':'none'},pg);
    const tw=Math.max(68,n.name.length*6+14);
    el('rect',{x:n.x-tw/2,y:n.y-56,width:tw,height:20,fill:'#0c1423',rx:5,stroke:'rgba(255,255,255,.18)','stroke-width':1},lbg);
    el('text',{x:n.x,y:n.y-41,fill:'#f0f4f8','font-size':10,'font-weight':700,'text-anchor':'middle','font-family':'inherit'},lbg).textContent=n.name;
    el('polygon',{points:`${n.x-4},${n.y-36} ${n.x+4},${n.y-36} ${n.x},${n.y-30}`,fill:'#0c1423'},lbg);
    pg.addEventListener('mouseenter',()=>lbg.setAttribute('opacity',1));
    pg.addEventListener('mouseleave',()=>lbg.setAttribute('opacity',0));
    pg.addEventListener('click',e=>{e.stopPropagation();onPoiClick(key);});
    pg.addEventListener('touchend',e=>{e.preventDefault();e.stopPropagation();onPoiClick(key);});

    // ── Label huruf PPT (A/B/C/D/E) untuk 5 node utama ──
    const pptLabel={BATU10:'A',KM16:'B',KAWALU:'C',TK1:'D',TK4:'E'}[key];
    if(pptLabel){
      el('circle',{cx:n.x+14,cy:n.y-30,r:8,fill:'rgba(56,184,240,.9)',stroke:'#fff','stroke-width':1.5},pg);
      el('text',{x:n.x+14,y:n.y-26,fill:'#fff','font-size':9,'font-weight':800,'text-anchor':'middle','font-family':'inherit'},pg).textContent=pptLabel;
    }
  });
}

// ═══════════════════════════════════════
// FULL MAP RENDER
// ═══════════════════════════════════════
function renderMap(){
  buildGraph();
  drawGreen();
  drawBeaches();
  drawRiver();
  drawRoads();
  ['KM16','KIJANG'].forEach(drawRA);
  // Jembatan hanya dibangun sekali (atau setelah reset node)
  drawBuildings();
  drawLabels();
  drawPins();
  // Pastikan urutan layer benar
  svg.appendChild(routeG);
  svg.appendChild(lblG);
  svg.appendChild(nodeG);
  svg.appendChild(gpsG);
  svg.appendChild(carG);
}

// ═══════════════════════════════════════
// ROUTING
// ═══════════════════════════════════════
function dijkstra(s,e,scenicW=1){
  const dist={},prev={};for(const k in NODES){dist[k]=Infinity;prev[k]=null;}
  dist[s]=0;const Q=new Set(Object.keys(NODES));
  while(Q.size){let u=null,du=Infinity;for(const k of Q)if(dist[k]<du){du=dist[k];u=k;}if(!u||u===e)break;Q.delete(u);
    for(const nb of(ADJ[u]||[])){const cost=nb.len*(nb.meta.scenic?scenicW:1);const alt=dist[u]+cost;if(alt<dist[nb.to]){dist[nb.to]=alt;prev[nb.to]=u;}}}
  if(dist[e]===Infinity)return null;const path=[];let c=e;while(c){path.unshift(c);c=prev[c];}return path;
}
function snapToRing(raKey,px,py){
  const N=NODES[raKey],ang=Math.atan2(py-N.y,px-N.x);
  return[N.x+Math.cos(ang)*RA_BYPASS_R,N.y+Math.sin(ang)*RA_BYPASS_R];
}
function ringArcPts(raKey,entryPt,exitPt){
  const N=NODES[raKey];
  const eAng=Math.atan2(entryPt[1]-N.y,entryPt[0]-N.x);
  const xAng=Math.atan2(exitPt[1]-N.y,exitPt[0]-N.x);
  let da=xAng-eAng;
  while(da>Math.PI)da-=Math.PI*2;while(da<-Math.PI)da+=Math.PI*2;
  const absda=Math.abs(da),dir=da>=0?1:-1;
  const steps=Math.max(8,Math.ceil(absda/(Math.PI/16)));
  const pts=[];
  for(let i=0;i<=steps;i++){const ang=eAng+dir*absda*(i/steps);pts.push([N.x+Math.cos(ang)*RA_BYPASS_R,N.y+Math.sin(ang)*RA_BYPASS_R]);}
  return pts;
}
function pathPts(nodes){
  const pts=[];
  for(let i=0;i<nodes.length-1;i++){
    const a=nodes[i],b=nodes[i+1];
    const nb=ADJ[a]?.find(x=>x.to===b);if(!nb)continue;
    const meta=nb.meta,forward=meta.a===a;
    const seg=forward?meta.pts:[...meta.pts].reverse();
    const startIdx=pts.length===0?0:1;
    for(let s=startIdx;s<seg.length;s++)pts.push(seg[s]);
    if(NODES[b]?.ra&&i+2<=nodes.length-1){
      const c=nodes[i+2];const nb2=ADJ[b]?.find(x=>x.to===c);
      if(nb2){
        const seg2=(nb2.meta.a===b)?nb2.meta.pts:[...nb2.meta.pts].reverse();
        const entrySnap=snapToRing(b,seg[seg.length-1][0],seg[seg.length-1][1]);
        const exitSnap=snapToRing(b,seg2[0][0],seg2[0][1]);
        pts[pts.length-1]=entrySnap;
        const arc=ringArcPts(b,entrySnap,exitSnap);
        for(let s=1;s<arc.length;s++)pts.push(arc[s]);
      }
    }
  }
  return pts;
}
function smoothD(pts){
  if(pts.length<2)return'';
  let d=`M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for(let i=1;i<pts.length-1;i++){const mx=(pts[i][0]+pts[i+1][0])/2,my=(pts[i][1]+pts[i+1][1])/2;d+=` Q${pts[i][0].toFixed(1)},${pts[i][1].toFixed(1)} ${mx.toFixed(1)},${my.toFixed(1)}`;}
  d+=` L${pts[pts.length-1][0].toFixed(1)},${pts[pts.length-1][1].toFixed(1)}`;return d;
}
function polyLen(pts){let L=0;for(let i=1;i<pts.length;i++)L+=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);return L;}

// ═══════════════════════════════════════
// STATE & UI
// ═══════════════════════════════════════
let startNode=null,endNode=null,fastestPath=null,scenicPath=null;
let routePts=[],routeType='fastest',animRun=false,animId=null,segIdx=0,segProg=0,pickMode=null,selRouteType='fastest';

const POIS=[
  {key:'TP',label:'Tanjungpinang',sub:'Ibukota Provinsi Kepri'},
  {key:'PELB',label:'Pelabuhan TP',sub:'Terminal feri utama'},
  {key:'KM16',label:'Bundaran KM 16',sub:'Persimpangan utama'},
  {key:'SEILEK',label:'Sei Lekop',sub:'Desa pesisir'},
  {key:'TOAPAYA',label:'Toapaya',sub:'Kecamatan Toapaya'},
  {key:'KIJANG',label:'Bundaran Kijang',sub:'Kota kedua terbesar'},
  {key:'KIJPSR',label:'Pasar Kijang',sub:'Pusat perdagangan'},
  {key:'KAWALU',label:'Kawal Utara',sub:'Menuju jembatan'},
  {key:'BRIDGE',label:'Jembatan Kawal',sub:'Di atas Sungai Kawal'},
  {key:'KAWAL',label:'Simpang Kawal',sub:'Persimpangan Kawal'},
  {key:'KAWALK',label:'Kawal Kota',sub:'Pusat kota Kawal'},
  {key:'LAGOI',label:'Kawasan Lagoi',sub:'Resor & pariwisata 🌴'},
  {key:'BERAK',label:'Tanjung Berakit',sub:'Ujung utara Bintan'},
  {key:'TK1',label:'Pantai Trikora 1',sub:'Wisata bahari 🌊'},
  {key:'TK2',label:'Pantai Trikora 2',sub:'Wisata bahari 🌊'},
  {key:'TK3',label:'Pantai Trikora 3',sub:'Wisata bahari 🌊'},
  {key:'TK4',label:'Pantai Trikora 4',sub:'Wisata bahari 🌊'},
];

function buildPoiList(){
  const list=document.getElementById('poiList');list.innerHTML='';
  POIS.forEach(p=>{
    const row=document.createElement('div');row.className='poiRow';
    if(startNode===p.key)row.classList.add('sel-s');if(endNode===p.key)row.classList.add('sel-e');
    const badge=startNode===p.key?'<span class="poiBadge s">AWAL</span>':endNode===p.key?'<span class="poiBadge e">TUJUAN</span>':'';
    row.innerHTML=`<div class="poiDot" style="background:${NC[NODES[p.key].kind]||'#666'}"></div><div class="poiInfo"><div class="poiName">${p.label}</div><div class="poiSub">${p.sub}</div></div>${badge}`;
    row.onclick=()=>{onPoiClick(p.key);document.getElementById('sidebar').classList.remove('open');};
    list.appendChild(row);
  });
}

function updateSearchBar(){
  const sv=document.getElementById('pickStartVal'),ev=document.getElementById('pickEndVal');
  sv.textContent=startNode?NODES[startNode].name:'Ketuk marker atau pilih...';sv.classList.toggle('ph',!startNode);
  ev.textContent=endNode?NODES[endNode].name:'Ketuk marker atau pilih...';ev.classList.toggle('ph',!endNode);
  document.getElementById('pickStartRow').classList.toggle('active-pick',pickMode==='start');
  document.getElementById('pickEndRow').classList.toggle('active-pick',pickMode==='end');
}
document.getElementById('pickStartRow').onclick=()=>{pickMode=pickMode==='start'?null:'start';if(pickMode)document.getElementById('sidebar').classList.add('open');updateSearchBar();if(pickMode)showToast('Pilih Titik Awal dari daftar atau ketuk marker');};
document.getElementById('pickEndRow').onclick=()=>{pickMode=pickMode==='end'?null:'end';if(pickMode)document.getElementById('sidebar').classList.add('open');updateSearchBar();if(pickMode)showToast('Pilih Titik Tujuan dari daftar atau ketuk marker');};
document.getElementById('btnSwap').onclick=e=>{e.stopPropagation();[startNode,endNode]=[endNode,startNode];updateSearchBar();buildPoiList();refreshPins();if(startNode&&endNode)computeRoutes();else{routePts=[];renderRoute();document.getElementById('routeInfo').classList.remove('show');}};
document.getElementById('btnClear').onclick=e=>{e.stopPropagation();startNode=null;endNode=null;pickMode=null;routePts=[];fastestPath=null;scenicPath=null;updateSearchBar();buildPoiList();refreshPins();renderRoute();document.getElementById('routeInfo').classList.remove('show');document.getElementById('bottomPanel').classList.remove('show');document.getElementById('dijkstraPanel').classList.remove('open');document.getElementById('btnDijTrace').classList.remove('show','active');document.querySelectorAll('.poi').forEach(pg=>{pg.style.filter='';});stopAnim();showToast('Rute dibersihkan');};
document.getElementById('closeSidebar').onclick=()=>document.getElementById('sidebar').classList.remove('open');
document.getElementById('btnMenu').onclick=()=>document.getElementById('sidebar').classList.toggle('open');

function onPoiClick(key){
  if(pickMode==='start'){startNode=key;if(endNode===key)endNode=null;pickMode=endNode?null:'end';}
  else if(pickMode==='end'){endNode=key;if(startNode===key)startNode=null;pickMode=startNode?null:'start';}
  else{if(!startNode){startNode=key;pickMode='end';showToast('Sekarang pilih titik tujuan');}
    else if(!endNode&&key!==startNode){endNode=key;pickMode=null;}
    else{startNode=key;endNode=null;pickMode='end';routePts=[];renderRoute();document.getElementById('routeInfo').classList.remove('show');document.getElementById('bottomPanel').classList.remove('show');stopAnim();}}
  updateSearchBar();buildPoiList();refreshPins();
  if(startNode&&endNode)computeRoutes();
  panTo(NODES[key].x,NODES[key].y,Math.max(scale,.72));
}

function refreshPins(){
  document.querySelectorAll('.poi').forEach(pg=>{
    const k=pg.getAttribute('data-key');const base=NC[NODES[k]?.kind]||'#666';
    const c=k===startNode?'#34c87a':k===endNode?'#e03020':base;
    pg.querySelectorAll('path,polygon').forEach(p=>{const f=p.getAttribute('fill');if(f&&!f.includes('rgba')&&f!=='rgba(255,255,255,.92)')p.setAttribute('fill',c);});
    pg.querySelectorAll('circle').forEach(ci=>{const f=ci.getAttribute('fill');if(f&&f.startsWith('#')&&f.length===7)ci.setAttribute('fill',c);});
  });
}

document.getElementById('btnFastest').onclick=()=>{selRouteType='fastest';document.getElementById('btnFastest').classList.add('sel');document.getElementById('btnScenic').classList.remove('sel');if(fastestPath)setActiveRoute('fastest');};
document.getElementById('btnScenic').onclick=()=>{selRouteType='scenic';document.getElementById('btnScenic').classList.add('sel');document.getElementById('btnFastest').classList.remove('sel');if(scenicPath)setActiveRoute('scenic');};

function computeRoutes(){fastestPath=dijkstra(startNode,endNode,1);scenicPath=dijkstra(startNode,endNode,0.5);setActiveRoute(selRouteType);}

// Hitung total jarak km dari path (pakai meta.lenKm, bukan pixel)
function pathKm(nodes){
  let total=0;
  for(let i=0;i<nodes.length-1;i++){
    const a=nodes[i],b=nodes[i+1];
    const nb=ADJ[a]?.find(x=>x.to===b);
    if(nb) total+=nb.meta.lenKm;
  }
  return total.toFixed(1);
}

function setActiveRoute(type){
  const path=(type==='scenic'&&scenicPath)?scenicPath:fastestPath;
  if(!path){showToast('Rute tidak ditemukan');return;}
  routePts=pathPts(path);routeType=type;
  const km=pathKm(path);
  const mnt=Math.round(+km/45*60);
  document.getElementById('riDist').textContent=km+' km';document.getElementById('riTime').textContent='~'+mnt+' mnt';
  document.getElementById('routeInfo').classList.add('show');
  document.getElementById('bpTitle').textContent=(NODES[startNode]?.name||'?')+' → '+(NODES[endNode]?.name||'?');
  document.getElementById('bpSub').textContent=type==='scenic'?'Rute scenic · melewati area wisata':'Rute tercepat · jarak terpendek';
  document.getElementById('bpDist').textContent=km+' km';document.getElementById('bpTime').textContent=mnt+' mnt';
  document.getElementById('bottomPanel').classList.add('show');
  renderRoute();
  const xs=routePts.map(p=>p[0]),ys=routePts.map(p=>p[1]);
  const mx=(Math.min(...xs)+Math.max(...xs))/2,my=(Math.min(...ys)+Math.max(...ys))/2;
  const rw=Math.max(...xs)-Math.min(...xs)+200,rh=Math.max(...ys)-Math.min(...ys)+200;
  panTo(mx,my,Math.min(5,Math.max(.2,Math.min(mapWrap.clientWidth/rw,mapWrap.clientHeight/rh)*.88)));
  showToast(km+' km · '+mnt+' mnt · '+(type==='scenic'?'Scenic 🌴':'Tercepat ⚡'));
  // Tampilkan trace Dijkstra otomatis bila melibatkan node PPT
  const pptNodes=new Set(['BATU10','KM16','KAWALU','TK1','TK4']);
  const hasPpt=path.some(n=>pptNodes.has(n));
  if(hasPpt) showDijkstraTrace(path);
}
function renderRoute(){
  routeG.innerHTML='';if(!routePts.length)return;
  const d=smoothD(routePts),col=routeType==='scenic'?'#f0923a':'#1a6fb5';
  el('path',{d,stroke:col,'stroke-width':20,fill:'none','stroke-linecap':'round',opacity:.12},routeG);
  el('path',{d,stroke:col,'stroke-width':9,fill:'none','stroke-linecap':'round'},routeG);
  const dash=el('path',{d,stroke:'rgba(255,255,255,.72)','stroke-width':2.2,fill:'none','stroke-dasharray':'14 14'},routeG);
  el('animate',{attributeName:'stroke-dashoffset',from:'0',to:'-56',dur:'2s',repeatCount:'indefinite'},dash);
  el('path',{id:'traveled',d:'',stroke:routeType==='scenic'?'#d06820':'#188038','stroke-width':9,fill:'none','stroke-linecap':'round'},routeG);

  // ── Tampilkan label bobot km di atas tiap segmen rute ──
  const activePath=routeType==='scenic'?scenicPath:fastestPath;
  if(activePath){
    for(let i=0;i<activePath.length-1;i++){
      const a=activePath[i],b=activePath[i+1];
      const nb=ADJ[a]?.find(x=>x.to===b);
      if(!nb)continue;
      const pts=nb.meta.pts;
      const mid=pts[Math.floor(pts.length/2)];
      const km=nb.meta.lenKm;
      const bg=el('rect',{x:mid[0]-16,y:mid[1]-12,width:32,height:14,rx:5,fill:'rgba(12,20,35,.82)',stroke:nb.meta.isPptEdge?'rgba(56,184,240,.5)':'rgba(255,255,255,.1)','stroke-width':nb.meta.isPptEdge?1.2:0.8},routeG);
      const lbl=el('text',{x:mid[0],y:mid[1]-1,fill:nb.meta.isPptEdge?'#38b8f0':'#8ab','font-size':8,'font-weight':700,'text-anchor':'middle','font-family':'inherit'},routeG);
      lbl.textContent=km+' km';
    }
  }
}

// ── ANIMASI ──
const spdRange=document.getElementById('spdRange'),spdValEl=document.getElementById('spdVal');
spdRange.oninput=()=>{spdValEl.textContent=spdRange.value+'×';updEng(+spdRange.value);};
document.getElementById('btnGo').onclick=()=>{
  if(!routePts.length||animRun)return;
  if(segIdx>=routePts.length-2){segIdx=0;segProg=0;document.getElementById('traveled')?.setAttribute('d','');document.getElementById('bpProgBar').style.width='0%';}
  animRun=true;document.getElementById('bpProg').classList.add('show');carG.style.display='';
  document.getElementById('btnGo').style.display='none';document.getElementById('btnStop').style.display='';
  startEng();updEng(+spdRange.value);animStep();
};
document.getElementById('btnStop').onclick=function(){
  if(animRun){animRun=false;cancelAnimationFrame(animId);stopEng();this.textContent='▶ Lanjut';this.classList.replace('stop','go');
    const self=this,prevOC=this.onclick;
    this.onclick=function(){animRun=true;self.textContent='⏸ Pause';self.classList.replace('go','stop');self.onclick=prevOC;startEng();updEng(+spdRange.value);animStep();};}
};
document.getElementById('btnClose').onclick=()=>{
  startNode=null;endNode=null;pickMode=null;routePts=[];fastestPath=null;scenicPath=null;
  renderRoute();updateSearchBar();buildPoiList();refreshPins();
  document.getElementById('routeInfo').classList.remove('show');document.getElementById('bottomPanel').classList.remove('show');
  document.getElementById('bpProg').classList.remove('show');stopAnim();
};
function animStep(){
  if(!animRun)return;
  const spd=+spdRange.value;segProg+=spd*.045;
  while(segProg>=1&&segIdx<routePts.length-2){segProg-=1;segIdx++;}
  const cur=routePts[segIdx],nxt=routePts[Math.min(segIdx+1,routePts.length-1)];
  const cx=cur[0]+(nxt[0]-cur[0])*Math.min(segProg,1),cy=cur[1]+(nxt[1]-cur[1])*Math.min(segProg,1);
  carG.setAttribute('transform',`translate(${cx},${cy}) rotate(${Math.atan2(nxt[1]-cur[1],nxt[0]-cur[0])*180/Math.PI})`);
  document.getElementById('traveled')?.setAttribute('d',smoothD([...routePts.slice(0,segIdx+1),[cx,cy]]));
  document.getElementById('bpProgBar').style.width=Math.round(segIdx/(routePts.length-1)*100)+'%';
  const cw=mapWrap.clientWidth,ch=mapWrap.clientHeight;
  if(Math.abs(cx*scale+tx-cw/2)>85||Math.abs(cy*scale+ty-ch/2)>85){tx+=(cw/2-cx*scale-tx)*.1;ty+=(ch/2-cy*scale-ty)*.1;if(scale<1.4)scale+=(1.4-scale)*.05;applyT();}
  if(segIdx>=routePts.length-2){animRun=false;stopEng();if(!muted)setTimeout(()=>{if(audioCtx)playHorn();},300);
    document.getElementById('btnGo').textContent='↺ Ulangi';document.getElementById('btnGo').style.display='';document.getElementById('btnStop').style.display='none';
    showToast('🎉 Tiba di '+NODES[endNode].name+'!');return;}
  animId=requestAnimationFrame(animStep);
}
function stopAnim(){animRun=false;cancelAnimationFrame(animId);stopEng();carG.style.display='none';segIdx=0;segProg=0;document.getElementById('btnGo').textContent='▶ Mulai';document.getElementById('btnGo').style.display='';document.getElementById('btnStop').style.display='none';}

// ── AUDIO ──
let audioCtx=null,engNodes={},engOn=false,muted=false;
document.getElementById('muteBtn').onclick=()=>{muted=!muted;document.getElementById('muteBtn').textContent=muted?'🔇':'🔊';document.getElementById('muteBtn').classList.toggle('muted',muted);if(muted&&engOn)stopEng();};
function initAudio(){if(audioCtx)return;audioCtx=new(window.AudioContext||window.webkitAudioContext)();}
function startEng(){if(muted)return;initAudio();if(engOn)return;engOn=true;const mg=audioCtx.createGain();mg.gain.setValueAtTime(0,audioCtx.currentTime);mg.gain.linearRampToValueAtTime(0.13,audioCtx.currentTime+0.5);mg.connect(audioCtx.destination);const o1=audioCtx.createOscillator();o1.type='sawtooth';o1.frequency.value=60;const o2=audioCtx.createOscillator();o2.type='square';o2.frequency.value=120;const lfo=audioCtx.createOscillator();lfo.type='sine';lfo.frequency.value=16;const lg=audioCtx.createGain();lg.gain.value=7;lfo.connect(lg);lg.connect(o1.frequency);const flt=audioCtx.createBiquadFilter();flt.type='lowpass';flt.frequency.value=380;const g1=audioCtx.createGain();g1.gain.value=0.6;const g2=audioCtx.createGain();g2.gain.value=0.4;o1.connect(g1);g1.connect(flt);o2.connect(g2);g2.connect(flt);flt.connect(mg);o1.start();o2.start();lfo.start();engNodes={mg,o1,o2,lfo};if(!muted)playHorn();}
function playHorn(){if(muted||!audioCtx)return;const hg=audioCtx.createGain();hg.gain.setValueAtTime(0,audioCtx.currentTime);hg.gain.linearRampToValueAtTime(0.26,audioCtx.currentTime+0.05);hg.gain.setValueAtTime(0.26,audioCtx.currentTime+0.22);hg.gain.linearRampToValueAtTime(0,audioCtx.currentTime+0.4);hg.connect(audioCtx.destination);const h1=audioCtx.createOscillator();h1.type='sine';h1.frequency.value=440;const h2=audioCtx.createOscillator();h2.type='sine';h2.frequency.value=554;h1.connect(hg);h2.connect(hg);h1.start();h2.start();h1.stop(audioCtx.currentTime+0.45);h2.stop(audioCtx.currentTime+0.45);}
function updEng(s){if(!engOn||!engNodes.o1||muted)return;const f=1+(s/60)*2.2,t=audioCtx.currentTime;engNodes.o1.frequency.setTargetAtTime(60*f,t,.3);engNodes.o2.frequency.setTargetAtTime(120*f,t,.3);engNodes.lfo.frequency.setTargetAtTime(16*f,t,.3);}
function stopEng(){if(!engOn||!engNodes.mg)return;engOn=false;try{engNodes.mg.gain.setTargetAtTime(0,audioCtx.currentTime,.35);}catch(e){}setTimeout(()=>{try{engNodes.o1.stop();engNodes.o2.stop();engNodes.lfo.stop();}catch(e){}engNodes={};},1200);}

// ── GPS ──
const BINTAN={minLat:0.78,maxLat:1.25,minLng:104.2,maxLng:104.85},MEXT={x:[128,2079],y:[388,1700]};
function geoToMap(lat,lng){const nx=(lng-BINTAN.minLng)/(BINTAN.maxLng-BINTAN.minLng);const ny=1-(lat-BINTAN.minLat)/(BINTAN.maxLat-BINTAN.minLat);return{x:MEXT.x[0]+nx*(MEXT.x[1]-MEXT.x[0]),y:MEXT.y[0]+ny*(MEXT.y[1]-MEXT.y[0])};}
let gpsWatchId=null,gpsActive=false;
document.getElementById('locBtn').onclick=()=>{
  if(gpsActive){if(gpsWatchId)navigator.geolocation.clearWatch(gpsWatchId);gpsActive=false;gpsG.style.display='none';document.getElementById('locBtn').classList.remove('active');document.getElementById('locBtn').textContent='📍';showToast('GPS dinonaktifkan');return;}
  if(!navigator.geolocation){showToast('GPS tidak tersedia');return;}showToast('Mengaktifkan GPS...');
  gpsWatchId=navigator.geolocation.watchPosition(pos=>{const mp=geoToMap(pos.coords.latitude,pos.coords.longitude);gpsG.style.display='';gpsG.setAttribute('transform',`translate(${mp.x},${mp.y})`);if(!gpsActive){gpsActive=true;document.getElementById('locBtn').classList.add('active');document.getElementById('locBtn').textContent='🔵';showToast('📍 Lokasi aktif ±'+Math.round(pos.coords.accuracy)+'m');}panTo(mp.x,mp.y,Math.max(scale,0.85));},err=>{showToast('GPS error: '+err.message);},{enableHighAccuracy:true,maximumAge:5000,timeout:12000});
};

// ── TRAFFIC ──
document.getElementById('chipTraffic').onclick=function(){
  this.classList.toggle('active');const on=this.classList.contains('active');
  document.querySelectorAll('.tL').forEach(e=>e.remove());
  if(on){const clrs=['#ff5722','#fdd663','#34a853'];EMETA.forEach(m=>{el('path',{d:edgeD(m),stroke:clrs[Math.floor(Math.random()*3)],'stroke-width':5.5,fill:'none','stroke-linecap':'round',opacity:.58,class:'tL'},routeG);});showToast('🚦 Simulasi lalu lintas aktif');}
  else showToast('Lalu lintas disembunyikan');
};

// ── PAN / ZOOM ──
const mapWrap=document.getElementById('mapWrap');
let scale=.42,tx=0,ty=0,drag=false,sX=0,sY=0,sTx=0,sTy=0;
function applyT(){svg.style.transform=`translate(${tx}px,${ty}px) scale(${scale})`;}
function fitAll(){const cw=mapWrap.clientWidth,ch=mapWrap.clientHeight;scale=Math.min(cw/(W+40),ch/(H+40))*.92;tx=(cw-W*scale)/2;ty=(ch-H*scale)/2;applyT();}
function panTo(wx,wy,sc=scale){const cw=mapWrap.clientWidth,ch=mapWrap.clientHeight;scale=sc;tx=cw/2-wx*scale;ty=ch/2-wy*scale;applyT();}
// Smooth pan with lerp
function smoothPanTo(wx,wy,sc=scale,dur=600){
  const st=performance.now(),sx=tx,sy=ty,ss=scale;
  const ex=mapWrap.clientWidth/2-wx*sc,ey=mapWrap.clientHeight/2-wy*sc;
  function step(now){
    const p=Math.min(1,(now-st)/dur),e=1-Math.pow(1-p,3);
    tx=sx+(ex-sx)*e;ty=sy+(ey-sy)*e;scale=ss+(sc-ss)*e;applyT();
    if(p<1)requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
mapWrap.addEventListener('mousedown',e=>{if(e.target.closest('.poi'))return;drag=true;sX=e.clientX;sY=e.clientY;sTx=tx;sTy=ty;mapWrap.classList.add('grabbing');});
window.addEventListener('mousemove',e=>{if(!drag)return;tx=sTx+(e.clientX-sX);ty=sTy+(e.clientY-sY);applyT();});
window.addEventListener('mouseup',()=>{drag=false;mapWrap.classList.remove('grabbing');});
mapWrap.addEventListener('wheel',e=>{e.preventDefault();const r=mapWrap.getBoundingClientRect();const mx=e.clientX-r.left,my=e.clientY-r.top;const ns=Math.min(6,Math.max(.1,scale*(e.deltaY<0?1.13:.885)));tx=mx-(mx-tx)*(ns/scale);ty=my-(my-ty)*(ns/scale);scale=ns;applyT();},{passive:false});
let tp2=null,pD2=null,lastTap=0;
mapWrap.addEventListener('touchstart',e=>{if(e.touches.length===1){tp2={x:e.touches[0].clientX,y:e.touches[0].clientY,tx,ty};const now=Date.now();if(now-lastTap<300){const r=mapWrap.getBoundingClientRect();const mx=e.touches[0].clientX-r.left,my=e.touches[0].clientY-r.top;const ns=Math.min(6,scale*1.65);tx=mx-(mx-tx)*(ns/scale);ty=my-(my-ty)*(ns/scale);scale=ns;applyT();}lastTap=now;}if(e.touches.length===2)pD2=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);},{passive:true});
mapWrap.addEventListener('touchmove',e=>{if(e.touches.length===1&&tp2){tx=tp2.tx+(e.touches[0].clientX-tp2.x);ty=tp2.ty+(e.touches[0].clientY-tp2.y);applyT();}if(e.touches.length===2&&pD2){const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);const ns=Math.min(6,Math.max(.1,scale*(d/pD2)));const cx2=mapWrap.clientWidth/2,cy2=mapWrap.clientHeight/2;tx=cx2-(cx2-tx)*(ns/scale);ty=cy2-(cy2-ty)*(ns/scale);scale=ns;pD2=d;applyT();}},{passive:true});
mapWrap.addEventListener('touchend',()=>{tp2=null;pD2=null;},{passive:true});
document.getElementById('btnZin').onclick=()=>{const c=mapWrap.clientWidth/2,d=mapWrap.clientHeight/2;const ns=Math.min(6,scale*1.3);tx=c-(c-tx)*(ns/scale);ty=d-(d-ty)*(ns/scale);scale=ns;applyT();};
document.getElementById('btnZout').onclick=()=>{const c=mapWrap.clientWidth/2,d=mapWrap.clientHeight/2;const ns=Math.max(.1,scale/1.3);tx=c-(c-tx)*(ns/scale);ty=d-(d-ty)*(ns/scale);scale=ns;applyT();};
document.getElementById('btnFit').onclick=fitAll;

function showToast(msg){if(!msg)return;const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');clearTimeout(t._tid);t._tid=setTimeout(()=>t.classList.remove('show'),3200);}

function randMap(){
  // Reset rute aktif dulu
  startNode=null;endNode=null;pickMode=null;routePts=[];fastestPath=null;scenicPath=null;
  renderRoute();updateSearchBar();
  document.getElementById('routeInfo').classList.remove('show');
  document.getElementById('bottomPanel').classList.remove('show');
  stopAnim();

  // Tampilkan overlay loading
  const overlay=document.getElementById('regenOverlay');
  overlay.classList.add('show');

  setTimeout(()=>{
    // Geser posisi node dalam zone masing-masing (kecuali fixed)
    for(const k in NODE_DEF){
      const def=NODE_DEF[k];
      if(def.fixed){
        // Tetap di posisi asal
        NODES[k]={...def};
      } else if(def.zone){
        const[xMin,xMax,yMin,yMax]=def.zone;
        // Geser acak dalam zone, dengan margin dari tepi
        NODES[k]={
          ...def,
          x: Math.round(rnd(xMin, xMax)),
          y: Math.round(rnd(yMin, yMax)),
        };
      } else {
        NODES[k]={...def};
      }
    }

    // Pastikan node RA tidak terlalu dekat satu sama lain
    const raKeys=['KM16','KIJANG'];
    let attempts=0;
    while(attempts<50){
      const [ra1,ra2]=[NODES.KM16,NODES.KIJANG];
      if(Math.hypot(ra1.x-ra2.x,ra1.y-ra2.y)>200)break;
      // Reset salah satu
      const def2=NODE_DEF.KM16;
      if(def2.zone){const[x1,x2,y1,y2]=def2.zone;NODES.KM16.x=Math.round(rnd(x1,x2));NODES.KM16.y=Math.round(rnd(y1,y2));}
      attempts++;
    }

    // Rebuild peta
    renderMap();
    buildPoiList();

    // Jembatan tetap dari posisi FIXED NODE_DEF
    buildBridges();

    // Pastikan order SVG benar setelah regen
    svg.appendChild(routeG);
    svg.appendChild(lblG);
    svg.appendChild(nodeG);
    svg.appendChild(gpsG);
    svg.appendChild(carG);

    overlay.classList.remove('show');
    fitAll();
    showToast('🗺️ Layout peta diacak! Jembatan & sungai tetap di posisi asli.');
  }, 80); // delay kecil agar overlay sempat render
}
// ═══════════════════════════════════════
// 🎯 ACAK RUTE — pilih start & end acak
// Tidak mengubah peta sama sekali
// ═══════════════════════════════════════
function randRoute(){
  const routable=Object.keys(NODES).filter(k=>k!=='BRIDGE');
  if(routable.length<2){showToast('Tidak cukup node');return;}

  // Pilih 2 node berbeda secara acak
  let s,e,attempt=0;
  do{
    s=routable[Math.floor(Math.random()*routable.length)];
    e=routable[Math.floor(Math.random()*routable.length)];
    attempt++;
  }while((s===e||!dijkstra(s,e,1))&&attempt<50);

  if(s===e||!dijkstra(s,e,1)){showToast('Tidak bisa menemukan rute acak');return;}

  // Reset state sebelumnya
  stopAnim();
  document.getElementById('bpProg').classList.remove('show');
  document.getElementById('btnGo').textContent='▶ Mulai';
  document.getElementById('btnGo').style.display='';
  document.getElementById('btnStop').style.display='none';
  pickMode=null;

  startNode=s;
  endNode=e;
  updateSearchBar();
  buildPoiList();
  refreshPins();
  computeRoutes();

  showToast(`🎯 Rute acak: ${NODES[s].name} → ${NODES[e].name}`);
}

document.getElementById('btnRandMap').onclick=randMap;
document.getElementById('btnRandPos').onclick=randRoute;

function dijkstraWithTrace(s, e, scenicW=1){
  const allNodes=Object.keys(NODES).filter(k=>k!=='BRIDGE');
  const dist={}, prev={}, visited=new Set();
  for(const k of allNodes){dist[k]=Infinity; prev[k]=null;}
  dist[s]=0;
  const Q=new Set(allNodes);
  const steps=[];
  const snapTable=()=>{ // snapshot dist table saat ini
    const snap={};allNodes.forEach(k=>snap[k]=dist[k]);
    return snap;
  };

  while(Q.size){
    // Pilih u: node di Q dengan dist minimum (O(V) scan = O(V²) total)
    let u=null,du=Infinity;
    for(const k of Q)if(dist[k]<du){du=dist[k];u=k;}
    if(!u||dist[u]===Infinity)break;
    Q.delete(u); visited.add(u);

    const neighbors=[];
    for(const nb of(ADJ[u]||[])){
      const cost=nb.meta.len*(nb.meta.scenic?scenicW:1);
      const alt=dist[u]+cost;
      const updated=alt<dist[nb.to];
      if(updated){dist[nb.to]=alt; prev[nb.to]=u;}
      neighbors.push({to:nb.to,cost:+cost.toFixed(1),alt:+alt.toFixed(1),updated,prev:u});
    }

    steps.push({
      iter: steps.length+1,
      u, du: +du.toFixed(1),
      neighbors,
      table: snapTable(),
      visited: new Set(visited)
    });

    if(u===e)break;
  }

  if(dist[e]===Infinity)return{path:null,steps,dist};
  const path=[];let c=e;while(c){path.unshift(c);c=prev[c];}
  return{path,steps,dist};
}

function showDijkstraTrace(existingPath){
  if(!startNode||!endNode)return;
  const{path,steps,dist}=dijkstraWithTrace(startNode,endNode,1);

  // Hitung total km dari path
  let totalKm=0;
  if(path) for(let i=0;i<path.length-1;i++){
    const nb=ADJ[path[i]]?.find(x=>x.to===path[i+1]);
    if(nb)totalKm+=nb.meta.lenKm;
  }

  // ── Langkah iterasi ──
  const stepsEl=document.getElementById('djSteps');
  stepsEl.innerHTML='';
  steps.forEach((st,idx)=>{
    const div=document.createElement('div');
    div.className='djStep';
    const updStr=st.neighbors.filter(n=>n.updated).map(n=>`${NODES[n.to]?.name||n.to} = ${n.alt} km`).join(', ')||'(tidak ada update)';
    div.innerHTML=`<div class="djStepNum">Iterasi ${st.iter}</div>
      <div class="djStepDesc">Proses: <b>${NODES[st.u]?.name||st.u}</b> (d=${st.du} km)</div>
      <div class="djStepSub">Update: ${updStr}</div>`;
    div.onclick=()=>{
      document.querySelectorAll('.djStep').forEach(d=>d.classList.remove('active'));
      div.classList.add('active');
      highlightStep(st);
    };
    stepsEl.appendChild(div);
  });

  // ── Tabel iterasi ──
  const pptN=['BATU10','KM16','KAWALU','TK1','TK4'];
  const pathNodes=path||[];
  const showNodes=pptN.every(n=>Object.keys(NODES).includes(n))&&
    pptN.some(n=>pathNodes.includes(n)) ? pptN :
    pathNodes.slice(0,6);

  const wrap=document.getElementById('djTableWrap');
  wrap.innerHTML='';
  const tbl=document.createElement('table');
  tbl.className='djTable';
  // Header
  const hdr=tbl.insertRow();
  hdr.insertCell().outerHTML='<th>Iter</th>';
  hdr.insertCell().outerHTML='<th>U (proses)</th>';
  showNodes.forEach(n=>{
    const th=document.createElement('th');
    th.textContent=pptN.includes(n)?({BATU10:'A',KM16:'B',KAWALU:'C',TK1:'D',TK4:'E'}[n]||n.slice(0,4)):n.slice(0,4);
    th.title=NODES[n]?.name||n;
    hdr.appendChild(th);
  });
  // Rows: baris awal (init)
  const initRow=tbl.insertRow();
  initRow.insertCell().textContent='0';
  initRow.insertCell().textContent=NODES[startNode]?.name?.slice(0,6)||startNode;
  showNodes.forEach(n=>{
    const td=initRow.insertCell();
    td.textContent=n===startNode?'0':'∞';
    if(n!==startNode)td.className='inf';
  });
  // Baris tiap iterasi
  steps.forEach(st=>{
    const row=tbl.insertRow();
    if(st.u===endNode)row.className='highlight';
    else if([...st.visited].length===steps.length)row.className='visited';
    row.insertCell().textContent=st.iter;
    row.insertCell().textContent=(NODES[st.u]?.name||st.u).slice(0,6);
    showNodes.forEach(n=>{
      const td=row.insertCell();
      const v=st.table[n];
      td.textContent=v===Infinity?'∞':v.toFixed(1);
      if(v===Infinity)td.className='inf';
    });
  });
  wrap.appendChild(tbl);

  // ── Hasil jalur ──
  const res=document.getElementById('djResult');
  res.innerHTML='';
  if(path){
    const row=document.createElement('div');row.className='djPathRow';
    path.forEach((n,i)=>{
      const pptLabel={BATU10:'A',KM16:'B',KAWALU:'C',TK1:'D',TK4:'E'}[n];
      const span=document.createElement('span');span.className='djPathNode';
      span.textContent=(pptLabel?pptLabel+' · ':'')+((NODES[n]?.name||n).split(' ').slice(0,2).join(' '));
      row.appendChild(span);
      if(i<path.length-1){const arr=document.createElement('span');arr.className='djPathArrow';arr.textContent='→';row.appendChild(arr);}
    });
    res.appendChild(row);
    const total=document.createElement('div');
    total.style.cssText='margin-top:6px;font-size:11px;color:var(--text2)';
    total.innerHTML=`Total: <span class="djTotalKm">${totalKm.toFixed(1)} km</span>`;
    res.appendChild(total);
  } else {
    res.innerHTML='<span style="color:var(--red);font-size:11px">Rute tidak ditemukan</span>';
  }

  // Tampilkan panel & tombol
  document.getElementById('dijkstraPanel').classList.add('open');
  document.getElementById('btnDijTrace').classList.add('show','active');
}

function highlightStep(st){
  document.querySelectorAll('.poi').forEach(pg=>{
    const k=pg.getAttribute('data-key');
    const isU=k===st.u;
    const isUpdated=st.neighbors.some(n=>n.to===k&&n.updated);
    pg.style.filter=isU?'drop-shadow(0 0 10px #38b8f0)':isUpdated?'drop-shadow(0 0 7px #34c87a)':'';
  });
}

// ── Toggle panel ──
document.getElementById('btnDijTrace').onclick=()=>{
  const panel=document.getElementById('dijkstraPanel');
  const isOpen=panel.classList.toggle('open');
  document.getElementById('btnDijTrace').classList.toggle('active',isOpen);
};
document.getElementById('djClose').onclick=()=>{
  document.getElementById('dijkstraPanel').classList.remove('open');
  document.getElementById('btnDijTrace').classList.remove('active');
  document.querySelectorAll('.poi').forEach(pg=>{pg.style.filter='';});
};

document.getElementById('btnDemoPPT').onclick=()=>{
  stopAnim();
  startNode='BATU10'; endNode='TK4';
  pickMode=null;
  updateSearchBar(); buildPoiList(); refreshPins();
  computeRoutes();
  panTo(1200, 1050, 0.38);
  showToast('🎯 Demo PPT: Batu 10 (A) → Pantai Trikora 4 (E)');
};

buildBridges();
// Render peta pertama kali
renderMap();
buildPoiList();
updateSearchBar();

window.addEventListener('resize',fitAll);
fitAll();
setTimeout(()=>showToast('🗺️ Ketuk marker · 🎯 Rute Acak · 📊 Trace Dijkstra otomatis'),900);
