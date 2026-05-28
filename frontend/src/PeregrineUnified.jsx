import { useState, useRef, useEffect } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from "recharts";

// ─── THEME ───────────────────────────────────────────────────────────────────
const T = {
  bg:'#0B0B12', surf:'#111119', surf2:'#141420', border:'#1C1C28',
  b2:'#252535', txt:'#E4E4EF', sec:'#8888A0', dim:'#44445A',
  acc:'#F5A623', aD:'#1C1600', ok:'#34D399', oD:'#0D1A12',
  bad:'#F87171', bD:'#1A0A0A', inf:'#60A5FA', iD:'#0A1428',
  pur:'#A78BFA', pD:'#12102A',
};
const PER = '#DA532C'; // Peregrine brand orange

const inp = (extra={}) => ({ background:T.bg, border:`1px solid ${T.b2}`, borderRadius:7, padding:'8px 12px', color:T.txt, fontSize:13, outline:'none', width:'100%', boxSizing:'border-box', ...extra });
const lbl = { display:'block', fontSize:10, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:T.sec, marginBottom:5 };
const card = (extra={}) => ({ background:T.surf, border:`1px solid ${T.border}`, borderRadius:12, padding:18, ...extra });
const pill = (on, color=T.acc) => ({ padding:'5px 12px', borderRadius:6, fontSize:11, fontWeight:600, cursor:'pointer', border:'none', background: on ? color : '#1C1C28', color: on ? (color===T.acc?'#0B0B12':T.txt) : T.sec, transition:'all .12s' });

// ─── DATA ────────────────────────────────────────────────────────────────────
const REVENUE = [
  {m:'Jan',r:312400,t:300000},{m:'Feb',r:289600,t:300000},{m:'Mar',r:341200,t:320000},
  {m:'Apr',r:378900,t:340000},{m:'May',r:504900,t:360000},
];
const WEEKLY = [{d:'Mon',r:18400},{d:'Tue',r:22100},{d:'Wed',r:19800},{d:'Thu',r:31200},{d:'Fri',r:28700}];
const LOCATIONS = [
  {rank:1,name:'Jonesboro, AR',  rev:142800,orders:89, growth:12.4},
  {rank:2,name:'Little Rock, AR',rev:118600,orders:74, growth:8.1 },
  {rank:3,name:'Memphis, TN',    rev:97200, orders:61, growth:3.2 },
  {rank:4,name:'Nashville, TN',  rev:83400, orders:52, growth:-2.1},
  {rank:5,name:'Tulsa, OK',      rev:61900, orders:38, growth:15.7},
];
const CAT_DATA = [
  {n:'Apparel',v:31,c:T.acc},{n:'Drinkware',v:22,c:T.ok},{n:'Bags',v:18,c:T.inf},
  {n:'Tech',v:14,c:T.pur},{n:'Writing',v:9,c:T.bad},{n:'Awards',v:6,c:'#FB923C'},
];
const NOTIFS = [
  {id:1,type:'sale',    title:'New Order #4821',          desc:'Acme Corp — $2,340',               time:'2m ago', read:false},
  {id:2,type:'ship',    title:'Tracking Needed',          desc:'Order #4798 — Delta Industries',   time:'18m ago',read:false},
  {id:3,type:'sale',    title:'New Order #4820',          desc:'Summit Tools — $890',              time:'1h ago', read:false},
  {id:4,type:'remind',  title:'Invoice Overdue',          desc:'TechBuild LLC — INV-302',          time:'3h ago', read:true },
  {id:5,type:'ship',    title:'Confirm Delivery',         desc:'Order #4791 — Riverside Co.',      time:'5h ago', read:true },
  {id:6,type:'sale',    title:'New Order #4819',          desc:'Blue Ridge Supply — $4,120',       time:'1d ago', read:true },
];
const N_COLOR = {sale:T.ok, ship:T.acc, remind:T.bad};

const ORDERS_DATA = [
  {id:'#4821',company:'Acme Corp',        amount:2340,  status:'Processing',carrier:null,   tracking:null,              stage:'needs_tracking'},
  {id:'#4820',company:'Summit Tools',     amount:890,   status:'Confirmed', carrier:null,   tracking:null,              stage:'needs_tracking'},
  {id:'#4819',company:'Blue Ridge Supply',amount:4120,  status:'Shipped',   carrier:'UPS',  tracking:'1Z999AA10123456', stage:'in_transit'},
  {id:'#4818',company:'Delta Industries', amount:1650,  status:'Delivered', carrier:'FedEx',tracking:'789331234567',    stage:'delivered'},
];
const STATUS_S = {
  Processing:{bg:'#1E1540',c:T.pur}, Confirmed:{bg:'#0F2820',c:T.ok},
  Shipped:{bg:'#231A08',c:T.acc},    Delivered:{bg:'#102210',c:'#86EFAC'},
};

const PRODUCTS = [
  {id:1,name:"Hanes 5.2oz T-Shirt",     sku:'HN-5250', cat:'Apparel',   cost:5.80, mType:'pct',mVal:38,setup:0,  ship:0,  active:true, esp:false},
  {id:2,name:"UltraClub Polo Shirt",    sku:'UC-8210', cat:'Apparel',   cost:16.50,mType:'pct',mVal:42,setup:15, ship:0,  active:true, esp:false},
  {id:3,name:"Non-Woven Tote Bag",      sku:'TB-NW80', cat:'Bags',      cost:1.90, mType:'pct',mVal:50,setup:0,  ship:0,  active:true, esp:false},
  {id:4,name:"BIC Clic Stic Pen",       sku:'BIC-CSA', cat:'Writing',   cost:0.55, mType:'pct',mVal:55,setup:0,  ship:0,  active:true, esp:false},
  {id:5,name:"USB Flash Drive 8GB",     sku:'USB-8GB', cat:'Tech',      cost:4.20, mType:'pct',mVal:50,setup:0,  ship:0,  active:true, esp:false},
  {id:6,name:"Ceramic Mug 11oz",        sku:'MUG-11Z', cat:'Drinkware', cost:3.40, mType:'pct',mVal:45,setup:10, ship:0,  active:true, esp:false},
  {id:7,name:"Crystal Award",           sku:'AWD-CRY', cat:'Awards',    cost:0,    mType:'pct',mVal:0, setup:0,  ship:0,  active:true, esp:true },
];
const calcP = (p) => {
  const markup = p.mType==='pct' ? p.cost*(p.mVal/100) : p.mVal;
  return (p.cost + markup + p.setup + p.ship).toFixed(2);
};

const PROCESSORS = [
  {id:'stripe',   name:'Stripe',    logo:'S', color:'#635BFF', connected:true,  live:true },
  {id:'clover',   name:'Clover',    logo:'C', color:'#1DA462', connected:true,  live:true },
  {id:'heartland',name:'Heartland', logo:'H', color:'#E63946', connected:true,  live:false},
  {id:'square',   name:'Square',    logo:'■', color:'#3E4348', connected:false, live:false},
];

const CARRIERS = [
  {id:'ups',  name:'UPS',   connected:true, color:'#F5A623'},{id:'fedex',name:'FedEx', connected:true, color:'#A78BFA'},
  {id:'usps', name:'USPS',  connected:true, color:'#60A5FA'},{id:'dhl',  name:'DHL',   connected:false,color:'#F5A623'},
];

const STAFF = [
  {id:1,name:'David R.',  role:'super_admin',    loc:'All Locations',   active:true },
  {id:2,name:'Sarah M.',  role:'location_admin', loc:'Jonesboro, AR',   active:true },
  {id:3,name:'James T.',  role:'salesperson',    loc:'Jonesboro, AR',   active:true },
  {id:4,name:'Karen L.',  role:'csr',            loc:'Jonesboro, AR',   active:true },
  {id:5,name:'Lisa R.',   role:'location_admin', loc:'Little Rock, AR', active:true },
  {id:6,name:'Angela B.', role:'salesperson',    loc:'Nashville, TN',   active:false},
];
const ROLE_C = {super_admin:T.acc, location_admin:T.pur, salesperson:T.inf, csr:T.ok};

const ACCOUNTS = [
  {id:1,company:'Acme Corporation',  sub:'acme',     tier:2,loc:'Jonesboro, AR',  users:4,active:true, primary:'#1E40AF',logo:'A'},
  {id:2,company:'Summit Tools Inc',  sub:'summit',   tier:1,loc:'Jonesboro, AR',  users:2,active:true, primary:'#065F46',logo:'S'},
  {id:3,company:'Blue Ridge Supply', sub:'blueridge',tier:3,loc:'Little Rock, AR',users:6,active:true, primary:'#7C3AED',logo:'B'},
  {id:4,company:'Delta Industries',  sub:'delta',    tier:2,loc:'Memphis, TN',    users:3,active:true, primary:'#B45309',logo:'D'},
  {id:5,company:'Coastal Builders',  sub:'coastal',  tier:1,loc:'Nashville, TN',  users:1,active:false,primary:'#0369A1',logo:'C'},
];

const TAGS_INIT = {
  ga4:{name:'Google Analytics 4',logo:'G',color:'#E37400',id:'G-XXXXXXXX',active:true},
  meta:{name:'Meta Pixel',logo:'f',color:'#1877F2',id:'',active:false},
  tiktok:{name:'TikTok Pixel',logo:'♪',color:'#FF0050',id:'',active:false},
  linkedin:{name:'LinkedIn Tag',logo:'in',color:'#0A66C2',id:'',active:false},
  gtm:{name:'Google Tag Manager',logo:'▣',color:'#4285F4',id:'',active:false},
};

// CUSTOMER PORTAL DATA
const CUST_PRODS = [
  {id:1,name:'Hanes T-Shirt',    cat:'apparel',  price:12.50,min:12, icon:'👕',color:'#4A90D9'},
  {id:2,name:'UltraClub Polo',   cat:'apparel',  price:28.00,min:6,  icon:'👔',color:'#7B68EE'},
  {id:3,name:'Non-Woven Tote',   cat:'bags',     price:3.75, min:50, icon:'👜',color:'#27AE60'},
  {id:4,name:'BIC Clic Stic Pen',cat:'writing',  price:1.25, min:100,icon:'✏️',color:'#E74C3C'},
  {id:5,name:'USB Drive 8GB',    cat:'tech',     price:8.75, min:25, icon:'💾',color:'#1ABC9C'},
  {id:6,name:'Ceramic Mug 11oz', cat:'drinkware',price:7.50, min:24, icon:'☕',color:'#E67E22'},
  {id:7,name:'Crystal Award',    cat:'awards',   price:null, min:1,  icon:'🏆',color:'#5D6D7E',esp:true},
];
const CUST_ORDERS = [
  {id:'ORD-4821',date:'Apr 28',items:3,total:487.50,status:'Processing',tracking:null},
  {id:'ORD-4798',date:'Apr 15',items:1,total:225.00,status:'Shipped',   tracking:'1Z999AA10123456784',carrier:'UPS',eta:'May 6'},
  {id:'ORD-4771',date:'Apr 1', items:5,total:1240,  status:'Delivered', tracking:'789331234567',      carrier:'FedEx',eta:'Delivered'},
];

// ─── NAV ─────────────────────────────────────────────────────────────────────
const ADMIN_NAV = [
  {id:'dashboard',    icon:'▦',  label:'Dashboard'       },
  {id:'orders',       icon:'≡',  label:'Orders'          },
  {id:'products',     icon:'⬜', label:'Products'        },
  {id:'shipping',     icon:'🚚', label:'Shipping'        },
  {id:'analytics',    icon:'▤',  label:'Analytics'       },
  {id:'tags',         icon:'🏷️', label:'Tag Manager'     },
  {id:'ai',           icon:'✦',  label:'AI Assistant'    },
  {id:'users',        icon:'⬡',  label:'Staff Users'     },
  {id:'customers',    icon:'+',  label:'Customers'       },
  {id:'vendors',      icon:'🔄', label:'Vendor Sync'     },
];

const Tip = ({content}) => <div style={{background:'#181825',border:`1px solid ${T.b2}`,borderRadius:8,padding:'10px 14px',fontSize:12,color:T.sec,whiteSpace:'pre-wrap',lineHeight:1.6}}>{content}</div>;
const fmtM = n => `$${(n/1000).toFixed(0)}k`;
const fmtF = n => `$${Number(n).toLocaleString()}`;

// ─── CUSTOM TOOLTIP ───────────────────────────────────────────────────────────
const ChartTip = ({active,payload,label}) => {
  if(!active||!payload?.length) return null;
  return <div style={{background:'#181825',border:`1px solid ${T.b2}`,borderRadius:8,padding:'10px 14px'}}>
    <div style={{fontSize:11,color:T.sec,marginBottom:4}}>{label}</div>
    {payload.map((p,i)=><div key={i} style={{fontSize:12,fontWeight:600,color:p.color||T.acc}}>{p.name}: {typeof p.value==='number'&&p.value>1000?fmtF(p.value):p.value}</div>)}
  </div>;
};

// ─── TOGGLE ───────────────────────────────────────────────────────────────────
const Toggle = ({on,set,color=T.ok}) => (
  <div onClick={()=>set(v=>!v)} style={{width:38,height:21,borderRadius:11,background:on?`${color}33`:'#1C1C28',border:`1px solid ${on?color:T.b2}`,cursor:'pointer',position:'relative',transition:'all .2s',flexShrink:0}}>
    <div style={{position:'absolute',top:3,left:on?18:3,width:13,height:13,borderRadius:'50%',background:on?color:T.dim,transition:'left .2s'}}/>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════════
export default function PeregrinePortal() {
  const [mode,    setMode]    = useState('admin');     // 'admin' | 'customer'
  const [view,    setView]    = useState('dashboard');
  const [sideCol, setSideCol] = useState(true);
  const [notifs,  setNotifs]  = useState(NOTIFS);
  const unread = notifs.filter(n=>!n.read).length;

  // shared state lifted up
  const [orders,   setOrders]   = useState(ORDERS_DATA);
  const [products, setProducts] = useState(PRODUCTS);
  const [staff,    setStaff]    = useState(STAFF);
  const [accounts, setAccounts] = useState(ACCOUNTS);
  const [tags,     setTags]     = useState(TAGS_INIT);

  const markRead = id => setNotifs(n=>n.map(x=>x.id===id?{...x,read:true}:x));
  const markAll  = () => setNotifs(n=>n.map(x=>({...x,read:true})));

  return (
    <div style={{display:'flex',height:'100vh',background:T.bg,color:T.txt,fontFamily:"'Helvetica Neue',Arial,sans-serif",overflow:'hidden'}}>

      {/* ── SIDEBAR ── */}
      <aside style={{width:sideCol?220:62,background:'#0E0E17',borderRight:`1px solid ${T.border}`,display:'flex',flexDirection:'column',transition:'width .2s',overflow:'hidden',flexShrink:0}}>
        {/* Logo + mode switcher */}
        <div style={{padding:'14px 12px 12px',borderBottom:`1px solid ${T.border}`}}>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:sideCol?12:0}}>
            <div style={{width:34,height:34,background:PER,borderRadius:9,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,fontSize:16,color:'#fff',flexShrink:0,letterSpacing:'-0.02em'}}>P</div>
            {sideCol&&<div style={{lineHeight:1.2}}>
              <div style={{fontSize:11,fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',color:T.txt}}>Peregrine</div>
              <div style={{fontSize:9,color:T.dim,letterSpacing:'0.06em',textTransform:'uppercase'}}>Solutions</div>
            </div>}
          </div>
          {sideCol&&<div style={{display:'flex',gap:5}}>
            <button onClick={()=>setMode('admin')}   style={{...pill(mode==='admin', PER),flex:1,fontSize:10,padding:'5px 0'}}>Admin</button>
            <button onClick={()=>setMode('customer')} style={{...pill(mode==='customer', PER),flex:1,fontSize:10,padding:'5px 0'}}>Portal</button>
          </div>}
        </div>

        {/* Nav items */}
        <nav style={{flex:1,padding:'10px 8px',overflow:'auto'}}>
          {ADMIN_NAV.map(item=>{
            const active = view===item.id&&mode==='admin';
            return <div key={item.id} onClick={()=>{setView(item.id);setMode('admin');}} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 10px',borderRadius:8,cursor:'pointer',marginBottom:2,background:active?'#1A1A28':'transparent',color:active?PER:T.dim,transition:'all .15s',whiteSpace:'nowrap',fontSize:13,fontWeight:active?600:400}}>
              <span style={{fontSize:15,width:18,textAlign:'center',flexShrink:0}}>{item.icon}</span>
              {sideCol&&<span>{item.label}</span>}
              {sideCol&&item.id==='orders'&&orders.filter(o=>o.stage==='needs_tracking').length>0&&
                <span style={{marginLeft:'auto',background:T.bad,color:'#fff',borderRadius:10,fontSize:9,fontWeight:800,padding:'2px 6px'}}>{orders.filter(o=>o.stage==='needs_tracking').length}</span>}
              {sideCol&&item.id==='dashboard'&&unread>0&&
                <span style={{marginLeft:'auto',background:PER,color:'#fff',borderRadius:10,fontSize:9,fontWeight:800,padding:'2px 6px'}}>{unread}</span>}
            </div>;
          })}
        </nav>

        <div style={{padding:'10px 8px',borderTop:`1px solid ${T.border}`}}>
          <div onClick={()=>setSideCol(v=>!v)} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 10px',borderRadius:8,cursor:'pointer',color:T.dim,fontSize:12}}>
            <span style={{width:18,textAlign:'center',flexShrink:0}}>{sideCol?'◀':'▶'}</span>
            {sideCol&&<span>Collapse</span>}
          </div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>

        {/* Header */}
        <header style={{height:54,background:'#0E0E17',borderBottom:`1px solid ${T.border}`,padding:'0 22px',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <span style={{fontSize:14,fontWeight:600,color:T.txt}}>{mode==='customer'?'Customer Portal Preview':ADMIN_NAV.find(n=>n.view===view||n.id===view)?.label||view.charAt(0).toUpperCase()+view.slice(1)}</span>
            {mode==='customer'&&<span style={{fontSize:10,background:PER+'25',color:PER,borderRadius:5,padding:'2px 8px',fontWeight:700,border:`1px solid ${PER}40`}}>acme.peregrinesolutions.com</span>}
          </div>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            {mode==='admin'&&<div onClick={()=>setView('dashboard')} style={{position:'relative',background:'#181825',border:`1px solid ${T.b2}`,borderRadius:8,width:34,height:34,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:14}}>
              🔔
              {unread>0&&<span style={{position:'absolute',top:-4,right:-4,background:PER,color:'#fff',borderRadius:10,fontSize:9,fontWeight:800,minWidth:16,height:16,display:'flex',alignItems:'center',justifyContent:'center',padding:'0 3px'}}>{unread}</span>}
            </div>}
            <div style={{padding:'5px 14px',borderRadius:7,background:mode==='customer'?PER+'25':'transparent',border:`1px solid ${mode==='customer'?PER:T.b2}`,cursor:'pointer',fontSize:12,color:mode==='customer'?PER:T.sec,fontWeight:600}} onClick={()=>setMode(m=>m==='admin'?'customer':'admin')}>
              {mode==='admin'?'Preview Portal →':'← Admin'}
            </div>
            <div style={{width:32,height:32,borderRadius:8,background:PER,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,color:'#fff',cursor:'pointer'}}>JD</div>
          </div>
        </header>

        {/* Content */}
        <div style={{flex:1,overflow:'auto'}}>
          {mode==='customer'
            ? <CustomerPortal />
            : <AdminContent view={view} setView={setView}
                orders={orders} setOrders={setOrders}
                products={products} setProducts={setProducts}
                staff={staff} setStaff={setStaff}
                accounts={accounts} setAccounts={setAccounts}
                tags={tags} setTags={setTags}
                notifs={notifs} markRead={markRead} markAll={markAll} unread={unread}
              />
          }
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN CONTENT ROUTER
// ═══════════════════════════════════════════════════════════════════════════════
function AdminContent({view,setView,orders,setOrders,products,setProducts,staff,setStaff,accounts,setAccounts,tags,setTags,notifs,markRead,markAll,unread}) {
  const p = {padding:22};
  switch(view) {
    case 'dashboard':  return <Dashboard setView={setView} notifs={notifs} markRead={markRead} markAll={markAll} unread={unread} orders={orders} />;
    case 'orders':     return <Orders orders={orders} setOrders={setOrders} />;
    case 'products':   return <ProductPricing products={products} setProducts={setProducts} />;
    case 'shipping':   return <Shipping orders={orders} setOrders={setOrders} />;
    case 'analytics':  return <Analytics />;
    case 'tags':       return <TagManager tags={tags} setTags={setTags} accounts={accounts} />;
    case 'ai':         return <AIAssistant />;
    case 'users':      return <Users staff={staff} setStaff={setStaff} />;
    case 'customers':  return <Customers accounts={accounts} setAccounts={setAccounts} />;
    case 'vendors':    return <VendorSync />;
    default:           return <div style={{...p,color:T.sec,fontSize:13}}>Select a section from the sidebar.</div>;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
function Dashboard({setView,notifs,markRead,markAll,unread,orders}) {
  return <div style={{padding:22}}>
    {/* KPIs */}
    <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:16}}>
      {[
        {l:'Revenue MTD',v:'$504,900',s:'+9.2%',up:true, c:T.acc},
        {l:'Orders MTD', v:'314',     s:'+14',  up:true, c:T.ok },
        {l:'Pending Ship',v:'23',     s:'5 need tracking',up:null,c:T.bad},
        {l:'Active Customers',v:'87', s:'+3 this month', up:true,c:T.pur},
      ].map(k=><div key={k.l} style={card()}>
        <div style={{fontSize:10,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:T.dim,marginBottom:6}}>{k.l}</div>
        <div style={{fontSize:24,fontWeight:700,color:k.c,marginBottom:3,letterSpacing:'-0.03em'}}>{k.v}</div>
        <div style={{fontSize:11,color:k.up===null?T.sec:k.up?T.ok:T.bad}}>{k.up===true?'↑':k.up===false?'↓':''} {k.s}</div>
      </div>)}
    </div>

    <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:14,marginBottom:14}}>
      {/* Revenue chart */}
      <div style={card()}>
        <div style={{fontSize:12,fontWeight:600,marginBottom:14}}>Revenue vs Target — 2026</div>
        <ResponsiveContainer width="100%" height={170}>
          <LineChart data={REVENUE}>
            <CartesianGrid stroke={T.border} strokeDasharray="3 3" vertical={false}/>
            <XAxis dataKey="m" tick={{fill:T.dim,fontSize:11}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fill:T.dim,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={fmtM}/>
            <Tooltip content={<ChartTip/>}/>
            <Line type="monotone" dataKey="r" stroke={T.acc} strokeWidth={2.5} dot={{fill:T.acc,r:4}} name="Revenue"/>
            <Line type="monotone" dataKey="t" stroke={T.dim} strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="Target"/>
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Location rankings */}
      <div style={card()}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:12}}>
          <div style={{fontSize:12,fontWeight:600}}>Location Rankings</div>
          <span onClick={()=>setView('analytics')} style={{fontSize:11,color:PER,cursor:'pointer',fontWeight:600}}>All →</span>
        </div>
        {LOCATIONS.slice(0,5).map((loc,i)=>{
          const rc={1:T.acc,2:'#9CA3AF',3:'#CD7C3E'}[loc.rank];
          return <div key={loc.rank} style={{marginBottom:10}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:3,alignItems:'center'}}>
              <div style={{display:'flex',alignItems:'center',gap:7}}>
                <div style={{width:18,height:18,borderRadius:5,background:rc?rc+'25':T.border,color:rc||T.dim,fontSize:9,fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center',border:`1px solid ${rc?rc+'50':T.b2}`}}>{loc.rank}</div>
                <span style={{fontSize:11,color:T.sec}}>{loc.name.split(',')[0]}</span>
              </div>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <span style={{fontSize:10,color:loc.growth>0?T.ok:T.bad,fontWeight:600}}>{loc.growth>0?'+':''}{loc.growth}%</span>
                <span style={{fontSize:11,fontWeight:600,color:T.txt}}>{fmtF(loc.rev)}</span>
              </div>
            </div>
            <div style={{height:2,background:T.b2,borderRadius:2}}>
              <div style={{height:2,background:rc||PER,borderRadius:2,width:`${(loc.rev/142800)*100}%`,opacity:rc?1:0.5}}/>
            </div>
          </div>;
        })}
      </div>
    </div>

    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
      {/* Notifications */}
      <div style={card()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
          <div style={{fontSize:12,fontWeight:600}}>Notifications {unread>0&&<span style={{background:PER,color:'#fff',borderRadius:10,fontSize:9,fontWeight:800,padding:'2px 7px',marginLeft:6}}>{unread}</span>}</div>
          <span onClick={markAll} style={{fontSize:11,color:T.dim,cursor:'pointer'}}>Mark all read</span>
        </div>
        {notifs.slice(0,5).map(n=><div key={n.id} onClick={()=>markRead(n.id)} style={{display:'flex',gap:9,padding:'8px 0',borderBottom:`1px solid ${T.border}`,cursor:'pointer',alignItems:'flex-start'}}>
          <div style={{width:7,height:7,borderRadius:'50%',background:N_COLOR[n.type]||T.dim,flexShrink:0,marginTop:4}}/>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:12,fontWeight:n.read?400:600,color:n.read?T.sec:T.txt,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{n.title}</div>
            <div style={{fontSize:11,color:T.dim}}>{n.desc}</div>
          </div>
          <span style={{fontSize:10,color:T.b2,flexShrink:0}}>{n.time}</span>
        </div>)}
      </div>

      {/* Recent Orders */}
      <div style={card()}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:12}}>
          <div style={{fontSize:12,fontWeight:600}}>Recent Orders</div>
          <span onClick={()=>setView('orders')} style={{fontSize:11,color:PER,cursor:'pointer',fontWeight:600}}>All →</span>
        </div>
        {orders.map((o,i)=>{
          const st=STATUS_S[o.status]||{};
          return <div key={o.id} style={{display:'flex',alignItems:'center',padding:'9px 0',borderBottom:i<orders.length-1?`1px solid ${T.border}`:'none',gap:10}}>
            <span style={{fontSize:12,fontFamily:'monospace',color:PER,flexShrink:0}}>{o.id}</span>
            <span style={{flex:1,fontSize:12,color:T.txt,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{o.company}</span>
            <span style={{fontSize:12,fontWeight:700}}>${o.amount.toLocaleString()}</span>
            <span style={{background:st.bg,color:st.c,borderRadius:5,fontSize:10,fontWeight:600,padding:'2px 7px'}}>{o.status}</span>
          </div>;
        })}
      </div>
    </div>
  </div>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ORDERS
// ═══════════════════════════════════════════════════════════════════════════════
function Orders({orders,setOrders}) {
  const [tracking,setTracking]=useState({});
  const [carrier, setCarrier] =useState({});
  const [invoice, setInvoice] =useState(null);

  const submit = id => {
    const tr=tracking[id]; if(!tr) return;
    setOrders(p=>p.map(o=>o.id===id?{...o,stage:'in_transit',status:'Shipped',tracking:tr,carrier:carrier[id]||'UPS'}:o));
    setTracking(t=>({...t,[id]:''}));
  };
  const markDelivered = id => setOrders(p=>p.map(o=>o.id===id?{...o,stage:'delivered',status:'Delivered'}:o));
  const markPaid      = id => { setOrders(p=>p.map(o=>o.id===id?{...o,invoiceStatus:'paid'}:o)); setInvoice(null); };

  const needsTrack=orders.filter(o=>o.stage==='needs_tracking');
  const inTransit =orders.filter(o=>o.stage==='in_transit');
  const delivered =orders.filter(o=>o.stage==='delivered');

  return <div style={{padding:22}}>
    <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:18}}>
      {[{l:'Needs Tracking',v:needsTrack.length,c:T.bad,bg:T.bD},{l:'In Transit',v:inTransit.length,c:T.acc,bg:T.aD},{l:'Delivered',v:delivered.length,c:T.ok,bg:T.oD},{l:'Invoices Pending',v:orders.filter(o=>o.invoiceStatus!=='paid').length,c:T.pur,bg:T.pD}].map(k=>(
        <div key={k.l} style={{...card(),background:k.bg,border:`1px solid ${k.c}30`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{fontSize:12,fontWeight:600,color:k.c}}>{k.l}</span>
          <span style={{fontSize:28,fontWeight:700,color:k.c}}>{k.v}</span>
        </div>
      ))}
    </div>

    {/* How invoicing works now */}
    <div style={{...card({background:T.iD,border:`1px solid ${T.inf}30`,marginBottom:18})}}>
      <div style={{fontSize:12,fontWeight:600,color:T.inf,marginBottom:4}}>Invoicing Flow (no payment processor required)</div>
      <div style={{fontSize:11,color:T.sec,lineHeight:1.7}}>Orders are placed and tracked here. When delivered, mark it delivered and generate a PDF invoice to send to the customer. When they pay — by check, wire, or however they pay you — mark the invoice paid manually. Your existing accounting system (DemandBridge or otherwise) stays as your financial record of truth.</div>
    </div>

    {needsTrack.length>0&&<>
      <div style={{fontSize:10,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:T.bad,marginBottom:10}}>⚠ Needs Tracking Number</div>
      {needsTrack.map(o=><div key={o.id} style={{...card(),border:`1px solid ${T.bad}30`,marginBottom:10}}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:12}}>
          <div><div style={{fontSize:13,fontWeight:700,fontFamily:'monospace',color:PER}}>{o.id}</div><div style={{fontSize:13,fontWeight:600,color:T.txt}}>{o.company}</div></div>
          <div style={{textAlign:'right'}}><div style={{fontSize:14,fontWeight:700}}>${o.amount.toLocaleString()}</div><div style={{fontSize:11,color:T.pur,marginTop:2}}>Invoice pending</div></div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'130px 1fr 90px',gap:8}}>
          <select style={{...inp(),appearance:'none',fontSize:12}} value={carrier[o.id]||'UPS'} onChange={e=>setCarrier(c=>({...c,[o.id]:e.target.value}))}>
            {['UPS','FedEx','USPS','DHL'].map(c=><option key={c}>{c}</option>)}
          </select>
          <input style={{...inp(),fontSize:12}} placeholder="Enter tracking number…" value={tracking[o.id]||''} onChange={e=>setTracking(t=>({...t,[o.id]:e.target.value}))} onKeyDown={e=>e.key==='Enter'&&submit(o.id)}/>
          <button onClick={()=>submit(o.id)} style={{background:PER,border:'none',borderRadius:7,color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer'}}>Submit</button>
        </div>
      </div>)}
    </>}

    {inTransit.length>0&&<>
      <div style={{fontSize:10,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:T.acc,marginBottom:10,marginTop:8}}>🚚 In Transit</div>
      {inTransit.map(o=><div key={o.id} style={{...card(),marginBottom:10}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div><div style={{fontSize:13,fontWeight:700,fontFamily:'monospace',color:PER}}>{o.id}</div><div style={{fontSize:13,color:T.txt,marginTop:2}}>{o.company}</div></div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <span style={{fontSize:11,background:T.aD,color:T.acc,borderRadius:5,padding:'2px 7px',fontWeight:600}}>{o.carrier}</span>
            <span style={{fontSize:12,fontFamily:'monospace',color:T.sec}}>{o.tracking}</span>
            <button onClick={()=>setInvoice(invoice===o.id?null:o.id)} style={{background:T.pD,border:`1px solid ${T.pur}30`,borderRadius:7,color:T.pur,fontSize:11,fontWeight:600,cursor:'pointer',padding:'5px 12px'}}>📄 Invoice</button>
            <button onClick={()=>markDelivered(o.id)} style={{background:T.oD,border:`1px solid ${T.ok}30`,borderRadius:7,color:T.ok,fontSize:12,fontWeight:600,cursor:'pointer',padding:'6px 14px'}}>Mark Delivered</button>
          </div>
        </div>
        {invoice===o.id&&<div style={{marginTop:12,background:T.pD,border:`1px solid ${T.pur}30`,borderRadius:10,padding:14}}>
          <div style={{fontSize:12,fontWeight:600,color:T.pur,marginBottom:8}}>Invoice — {o.company} — ${o.amount.toLocaleString()}</div>
          <div style={{fontSize:11,color:T.sec,marginBottom:12}}>Send invoice to customer, then mark paid when payment is received by your team.</div>
          <div style={{display:'flex',gap:8}}>
            <button style={{flex:1,background:T.pur,border:'none',borderRadius:7,color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer',padding:'8px 0'}}>📧 Email Invoice PDF</button>
            <button onClick={()=>markPaid(o.id)} style={{padding:'8px 14px',background:T.oD,border:`1px solid ${T.ok}30`,borderRadius:7,color:T.ok,fontSize:12,fontWeight:600,cursor:'pointer'}}>✓ Mark Paid</button>
            <button onClick={()=>setInvoice(null)} style={{padding:'8px 10px',background:'none',border:'none',color:T.dim,cursor:'pointer'}}>✕</button>
          </div>
        </div>}
      </div>)}
    </>}

    {delivered.length>0&&<>
      <div style={{fontSize:10,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:T.ok,marginBottom:10,marginTop:8}}>✓ Delivered</div>
      {delivered.map(o=><div key={o.id} style={{...card(),opacity:0.75,display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
        <div style={{display:'flex',gap:10,alignItems:'center'}}>
          <span style={{fontSize:13,fontFamily:'monospace',color:PER}}>{o.id}</span>
          <span style={{fontSize:13,color:T.sec}}>{o.company}</span>
          {o.carrier&&<span style={{fontSize:11,background:'#1C1C28',color:T.sec,borderRadius:5,padding:'2px 7px'}}>{o.carrier}</span>}
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          {o.invoiceStatus==='paid'
            ?<span style={{fontSize:11,background:T.oD,color:T.ok,borderRadius:5,padding:'2px 8px',fontWeight:600}}>✓ Invoice Paid</span>
            :<><span style={{fontSize:11,color:T.pur,fontWeight:600}}>Invoice Pending</span><button onClick={()=>markPaid(o.id)} style={{background:T.pD,border:`1px solid ${T.pur}30`,borderRadius:6,color:T.pur,fontSize:11,fontWeight:600,cursor:'pointer',padding:'4px 10px'}}>Mark Paid</button></>
          }
          <span style={{fontSize:11,background:T.oD,color:T.ok,borderRadius:5,padding:'2px 8px',fontWeight:600}}>✓ Delivered</span>
        </div>
      </div>)}
    </>}
  </div>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCTS & PRICING
// ═══════════════════════════════════════════════════════════════════════════════
function ProductPricing({products,setProducts}) {
  const [sel,    setSel]    = useState(null);
  const [form,   setForm]   = useState(null);
  const [saved,  setSaved]  = useState(false);

  const openEdit = (p) => { setSel(p.id); setForm({...p,cost:String(p.cost),mVal:String(p.mVal)}); setSaved(false); };
  const toggle   = (id) => setProducts(ps=>ps.map(p=>p.id===id?{...p,active:!p.active}:p));

  const handleSave = () => {
    setProducts(ps=>ps.map(p=>p.id===form.id?{...form,cost:parseFloat(form.cost)||0,mVal:parseFloat(form.mVal)||0}:p));
    setSaved(true); setTimeout(()=>setSaved(false),1500);
  };

  const pricing = form ? (() => {
    const c=parseFloat(form.cost)||0, v=parseFloat(form.mVal)||0;
    const markup = form.mType==='pct' ? c*(v/100) : v;
    return {markup, total:c+markup+parseFloat(form.setup||0)+parseFloat(form.ship||0)};
  })() : null;

  return <div style={{display:'flex',height:'100%'}}>
    <div style={{flex:1,overflow:'auto',padding:22}}>
      <div style={{...card(),overflow:'hidden',padding:0}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr>{['Product','SKU','Category','Cost','Sale Price','Margin','Status',''].map(h=>(
            <th key={h} style={{textAlign:'left',fontSize:10,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:T.dim,padding:'11px 14px',borderBottom:`1px solid ${T.border}`}}>{h}</th>
          ))}</tr></thead>
          <tbody>
            {products.map((p,i)=>{
              const price = p.esp ? null : parseFloat(calcP(p));
              const cost  = p.cost||0;
              const margin= cost>0&&price?((price-cost)/cost*100).toFixed(0):null;
              return <tr key={p.id} style={{borderBottom:i<products.length-1?`1px solid ${T.border}`:'none',opacity:p.active?1:0.45}}>
                <td style={{padding:'11px 14px'}}>
                  <div style={{fontSize:13,fontWeight:500,color:T.txt,marginBottom:2}}>{p.name}</div>
                  {p.esp&&<span style={{fontSize:9,fontWeight:700,background:T.aD,color:T.acc,borderRadius:4,padding:'1px 5px'}}>ESP+</span>}
                </td>
                <td style={{padding:'11px 14px',fontSize:11,fontFamily:'monospace',color:T.sec}}>{p.sku}</td>
                <td style={{padding:'11px 14px',fontSize:12,color:T.sec}}>{p.cat}</td>
                <td style={{padding:'11px 14px',fontSize:13}}>{p.esp?'—':`$${p.cost.toFixed(2)}`}</td>
                <td style={{padding:'11px 14px'}}>
                  {p.esp?<span style={{fontSize:12,color:T.acc}}>Quote only</span>:<span style={{fontSize:13,fontWeight:600,color:T.txt}}>${price}</span>}
                </td>
                <td style={{padding:'11px 14px',fontSize:13,color:p.esp?T.dim:T.ok}}>{p.esp?'—':margin?`${margin}%`:'—'}</td>
                <td style={{padding:'11px 14px'}}>
                  <div onClick={()=>toggle(p.id)} style={{width:34,height:19,borderRadius:10,background:p.active?`${T.ok}33`:'#1C1C28',border:`1px solid ${p.active?T.ok:T.b2}`,cursor:'pointer',position:'relative',transition:'all .2s'}}>
                    <div style={{position:'absolute',top:3,left:p.active?16:3,width:11,height:11,borderRadius:'50%',background:p.active?T.ok:T.dim,transition:'left .2s'}}/>
                  </div>
                </td>
                <td style={{padding:'11px 14px'}}>
                  <button onClick={()=>openEdit(p)} style={{background:'#1C1C28',border:'none',borderRadius:6,color:T.sec,fontSize:12,cursor:'pointer',padding:'5px 12px'}}>Edit</button>
                </td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
    </div>

    {/* Edit panel */}
    {form&&<div style={{width:400,borderLeft:`1px solid ${T.border}`,background:'#0E0E17',display:'flex',flexDirection:'column',overflow:'hidden',flexShrink:0}}>
      <div style={{padding:'14px 18px',borderBottom:`1px solid ${T.border}`,display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
        <div style={{fontSize:14,fontWeight:600}}>Edit Product</div>
        <div style={{display:'flex',gap:8}}>
          {saved&&<span style={{fontSize:12,color:T.ok,fontWeight:600}}>✓ Saved</span>}
          <button onClick={handleSave} style={{background:T.acc,border:'none',borderRadius:7,color:'#0B0B12',fontSize:13,fontWeight:700,cursor:'pointer',padding:'7px 16px'}}>Save</button>
          <button onClick={()=>setSel(null)&&setForm(null)} style={{background:'#1C1C28',border:'none',borderRadius:7,color:T.sec,fontSize:13,cursor:'pointer',padding:'7px 12px'}}>✕</button>
        </div>
      </div>
      <div style={{flex:1,overflow:'auto',padding:18}}>
        <div style={{marginBottom:12}}><label style={lbl}>Product Name</label><input style={inp()} value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/></div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
          <div><label style={lbl}>SKU</label><input style={inp()} value={form.sku} onChange={e=>setForm(f=>({...f,sku:e.target.value}))}/></div>
          <div><label style={lbl}>Category</label><input style={inp()} value={form.cat} onChange={e=>setForm(f=>({...f,cat:e.target.value}))}/></div>
        </div>
        {!form.esp&&<>
          <div style={{marginBottom:12}}><label style={lbl}>Cost of Goods ($)</label><input style={inp()} type="number" step="0.01" value={form.cost} onChange={e=>setForm(f=>({...f,cost:e.target.value}))}/></div>
          <div style={{marginBottom:10}}>
            <label style={lbl}>Markup Type</label>
            <div style={{display:'flex',gap:8,marginBottom:8}}>
              <button onClick={()=>setForm(f=>({...f,mType:'pct'}))}    style={{...pill(form.mType==='pct'),flex:1}}>% Percentage</button>
              <button onClick={()=>setForm(f=>({...f,mType:'dollar'}))} style={{...pill(form.mType==='dollar'),flex:1}}>$ Dollar</button>
            </div>
            <input style={inp()} type="number" step="0.01" value={form.mVal} onChange={e=>setForm(f=>({...f,mVal:e.target.value}))} placeholder={form.mType==='pct'?'e.g. 40':'e.g. 5.00'}/>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
            <div><label style={lbl}>Setup Fee ($)</label><input style={inp()} type="number" step="0.01" value={form.setup} onChange={e=>setForm(f=>({...f,setup:e.target.value}))}/></div>
            <div><label style={lbl}>Shipping ($)</label><input style={inp()} type="number" step="0.01" value={form.ship} onChange={e=>setForm(f=>({...f,ship:e.target.value}))}/></div>
          </div>
          {pricing&&<div style={{background:T.oD,border:`1px solid ${T.ok}30`,borderRadius:10,padding:14}}>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:`${T.ok}99`,marginBottom:10}}>Live Price Breakdown</div>
            {[['Cost',`$${parseFloat(form.cost||0).toFixed(2)}`],[form.mType==='pct'?`Markup (${form.mVal||0}%)`:` Markup`,`+$${pricing.markup.toFixed(2)}`],['Setup Fee',`+$${parseFloat(form.setup||0).toFixed(2)}`],['Shipping',`+$${parseFloat(form.ship||0).toFixed(2)}`]].map(([l,v])=>(
              <div key={l} style={{display:'flex',justifyContent:'space-between',fontSize:12,color:T.sec,marginBottom:5}}><span>{l}</span><span>{v}</span></div>
            ))}
            <div style={{height:1,background:`${T.ok}25`,margin:'8px 0'}}/>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline'}}>
              <span style={{fontSize:13,fontWeight:600,color:T.txt}}>Customer Sale Price</span>
              <span style={{fontSize:20,fontWeight:700,color:T.ok}}>${pricing.total.toFixed(2)}</span>
            </div>
          </div>}
        </>}
      </div>
    </div>}
  </div>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAYMENTS
// ═══════════════════════════════════════════════════════════════════════════════
function Payments() {
  const [procs, setProcs]   = useState(PROCESSORS);
  const [selP,  setSelP]    = useState('stripe');
  const [wfTab, setWfTab]   = useState('processors');

  const toggle = id => setProcs(p=>p.map(x=>x.id===id?{...x,connected:!x.connected}:x));
  const toggleLive = id => setProcs(p=>p.map(x=>x.id===id?{...x,live:!x.live}:x));

  return <div style={{padding:22}}>
    <div style={{display:'flex',gap:8,marginBottom:16}}>
      {[['processors','Processors'],['workflow','Charge Workflow'],['transactions','Transactions']].map(([k,l])=>(
        <button key={k} onClick={()=>setWfTab(k)} style={{...pill(wfTab===k,PER),padding:'8px 16px',fontSize:12,border:'none'}}>{l}</button>
      ))}
    </div>

    {wfTab==='processors'&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
      <div>
        <div style={{fontSize:10,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:T.dim,marginBottom:10}}>Payment Processors</div>
        {procs.map(p=><div key={p.id} onClick={()=>setSelP(p.id)} style={{...card(),display:'flex',alignItems:'center',gap:12,marginBottom:8,cursor:'pointer',border:`1px solid ${selP===p.id?`${PER}50`:T.border}`}}>
          <div style={{width:42,height:42,borderRadius:10,background:p.color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:900,color:'#fff',flexShrink:0}}>{p.logo}</div>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:600}}>{p.name}</div>
            <div style={{fontSize:11,color:T.sec}}>Payment processor</div>
          </div>
          {p.connected
            ? <div style={{textAlign:'right'}}>
                <div style={{fontSize:11,color:T.ok,fontWeight:600,marginBottom:3}}>✓ Connected</div>
                <div onClick={e=>{e.stopPropagation();toggleLive(p.id);}} style={{fontSize:10,padding:'2px 8px',borderRadius:10,background:p.live?T.oD:T.bD,color:p.live?T.ok:T.bad,cursor:'pointer',fontWeight:600,border:`1px solid ${p.live?T.ok:T.bad}30`}}>
                  {p.live?'Live':'Test Mode'}
                </div>
              </div>
            : <button onClick={e=>{e.stopPropagation();toggle(p.id);}} style={{background:T.acc,border:'none',borderRadius:7,color:'#0B0B12',fontSize:12,fontWeight:700,cursor:'pointer',padding:'7px 14px'}}>Connect</button>
          }
        </div>)}
      </div>
      <div>
        <div style={{fontSize:10,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:T.dim,marginBottom:10}}>Configuration — {procs.find(p=>p.id===selP)?.name}</div>
        <div style={card()}>
          {['Publishable Key','Secret Key'].map(k=><div key={k} style={{marginBottom:12}}>
            <label style={lbl}>{k}</label>
            <input style={inp()} type="password" defaultValue="••••••••••••••••••••••"/>
          </div>)}
          <div style={{display:'flex',gap:8}}>
            <button style={{flex:1,background:T.acc,border:'none',borderRadius:7,color:'#0B0B12',fontSize:13,fontWeight:700,cursor:'pointer',padding:'9px 0'}}>Save Keys</button>
            <button style={{padding:'9px 16px',background:'#1C1C28',border:'none',borderRadius:7,color:T.sec,cursor:'pointer',fontSize:13}}>Test Connection</button>
          </div>
        </div>
        <div style={{...card({marginTop:12}),background:T.iD,border:`1px solid ${T.inf}30`}}>
          <div style={{fontSize:11,fontWeight:700,color:T.inf,marginBottom:6}}>Charge on Delivery Rule</div>
          <div style={{fontSize:12,color:T.sec,lineHeight:1.65}}>Cards are authorized at order placement but <strong style={{color:T.txt}}>never charged</strong> until staff marks the order delivered. Invoice customers receive a payment link upon delivery.</div>
        </div>
      </div>
    </div>}

    {wfTab==='workflow'&&<div style={{maxWidth:680,margin:'0 auto'}}>
      {[
        {step:1,icon:'🛒',color:T.inf,  title:'Customer Places Order',     desc:'Card is tokenized and authorized — funds reserved but not captured.'},
        {step:2,icon:'📦',color:T.acc,  title:'Staff Fulfills & Ships',    desc:'Tracking entered in admin. Payment still on hold — not yet captured.'},
        {step:3,icon:'✅',color:T.ok,   title:'Delivered → Charge Captured',desc:'Staff marks delivered. API call captures the authorized amount instantly.'},
        {step:4,icon:'📊',color:T.pur,  title:'Sales Report Updated',      desc:'Transaction logged, dashboard KPIs refresh, receipt sent to customer.'},
      ].map((s,i)=><div key={s.step} style={{display:'flex',gap:14,marginBottom:0}}>
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',flexShrink:0}}>
          <div style={{width:42,height:42,borderRadius:12,background:`${s.color}20`,border:`1.5px solid ${s.color}50`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>{s.icon}</div>
          {i<3&&<div style={{width:2,height:28,background:T.b2,margin:'4px 0'}}/>}
        </div>
        <div style={{flex:1,paddingBottom:i<3?20:0}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:5}}>
            <span style={{fontSize:10,fontWeight:700,background:`${s.color}20`,color:s.color,borderRadius:5,padding:'2px 7px'}}>STEP {s.step}</span>
            <span style={{fontSize:14,fontWeight:600}}>{s.title}</span>
          </div>
          <div style={{fontSize:12,color:T.sec,lineHeight:1.6,background:T.surf2,borderRadius:8,padding:'9px 12px',border:`1px solid ${T.border}`}}>{s.desc}</div>
        </div>
      </div>)}
    </div>}

    {wfTab==='transactions'&&<>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:14}}>
        {[{l:'Captured Today',v:'$4,850',c:T.ok},{l:'Authorized/Hold',v:'$487',c:T.acc},{l:'Pending ACH',v:'$890',c:T.inf},{l:'Invoiced',v:'$1,120',c:T.pur}].map(k=>(
          <div key={k.l} style={card()}><div style={{fontSize:10,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:T.dim,marginBottom:6}}>{k.l}</div><div style={{fontSize:22,fontWeight:700,color:k.c}}>{k.v}</div></div>
        ))}
      </div>
      <div style={{...card(),overflow:'hidden',padding:0}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr>{['ID','Order','Customer','Amount','Processor','Status'].map(h=>(
            <th key={h} style={{textAlign:'left',fontSize:10,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:T.dim,padding:'11px 14px',borderBottom:`1px solid ${T.border}`}}>{h}</th>
          ))}</tr></thead>
          <tbody>
            {[
              {id:'TXN-9841',order:'#4798',cust:'Delta Industries',amt:1650,proc:'Clover',   status:'Captured'},
              {id:'TXN-9840',order:'#4791',cust:'Coastal Builders',amt:3200,proc:'Stripe',   status:'Captured'},
              {id:'TXN-9839',order:'#4785',cust:'Acme Corp',       amt:487, proc:'Stripe',   status:'Authorized'},
              {id:'TXN-9838',order:'#4781',cust:'Summit Tools',    amt:890, proc:'Heartland', status:'Pending'},
            ].map((t,i)=>{
              const sc={Captured:{bg:T.oD,c:T.ok},Authorized:{bg:T.aD,c:T.acc},Pending:{bg:T.iD,c:T.inf}}[t.status]||{};
              return <tr key={t.id} style={{borderBottom:i<3?`1px solid ${T.border}`:'none'}}>
                <td style={{padding:'11px 14px',fontSize:11,fontFamily:'monospace',color:T.acc}}>{t.id}</td>
                <td style={{padding:'11px 14px',fontSize:12,fontFamily:'monospace',color:T.sec}}>{t.order}</td>
                <td style={{padding:'11px 14px',fontSize:13,fontWeight:500}}>{t.cust}</td>
                <td style={{padding:'11px 14px',fontSize:13,fontWeight:700}}>${t.amt.toLocaleString()}</td>
                <td style={{padding:'11px 14px',fontSize:12,color:T.sec}}>{t.proc}</td>
                <td style={{padding:'11px 14px'}}><span style={{background:sc.bg,color:sc.c,borderRadius:5,fontSize:11,fontWeight:600,padding:'2px 8px'}}>{t.status}</span></td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
    </>}
  </div>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHIPPING
// ═══════════════════════════════════════════════════════════════════════════════
function Shipping({orders,setOrders}) {
  return <div style={{padding:22}}>
    <div style={{display:'grid',gridTemplateColumns:'1fr 280px',gap:14}}>
      <div>
        <div style={{fontSize:10,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:T.dim,marginBottom:10}}>Carrier Connections</div>
        <div style={{...card({marginBottom:14,background:T.iD,border:`1px solid ${T.inf}30`})}}>
          <div style={{fontSize:12,fontWeight:600,color:T.inf,marginBottom:4}}>EasyPost Abstraction Layer</div>
          <div style={{fontSize:11,color:T.sec,lineHeight:1.65}}>One API key connects UPS, FedEx, USPS, DHL, and 100+ carriers. Tracking webhooks push live status updates automatically. Enter your EasyPost key once — all connected carriers share it.</div>
          <div style={{marginTop:10,display:'flex',gap:8}}>
            <input style={{...inp(),flex:1}} type="password" defaultValue="EZTKtest_••••••••••••••••••" placeholder="EasyPost API key"/>
            <button style={{background:T.acc,border:'none',borderRadius:7,color:'#0B0B12',fontSize:12,fontWeight:700,cursor:'pointer',padding:'8px 16px',whiteSpace:'nowrap'}}>Save</button>
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
          {CARRIERS.map(c=><div key={c.id} style={{...card(),display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:38,height:34,borderRadius:8,background:c.color+'20',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,color:c.color,border:`1px solid ${c.color}30`}}>{c.name.slice(0,3)}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:12,fontWeight:600}}>{c.name}</div>
              <div style={{fontSize:10,color:T.dim}}>via EasyPost</div>
            </div>
            {c.connected
              ? <span style={{fontSize:10,color:T.ok,fontWeight:600}}>✓ Active</span>
              : <button style={{background:T.acc,border:'none',borderRadius:6,color:'#0B0B12',fontSize:11,fontWeight:700,cursor:'pointer',padding:'5px 10px'}}>Enable</button>
            }
          </div>)}
        </div>

        <div style={{fontSize:10,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:T.dim,marginBottom:10}}>Tracking Webhooks</div>
        <div style={card()}>
          {['shipment.tracking_updated','shipment.out_for_delivery','shipment.delivered','shipment.delivery_failed'].map(ev=>(
            <div key={ev} style={{display:'flex',gap:10,padding:'8px 0',borderBottom:`1px solid ${T.border}`}}>
              <span style={{color:T.ok,fontSize:11}}>●</span>
              <code style={{fontSize:11,color:T.acc}}>{ev}</code>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div style={{fontSize:10,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:T.dim,marginBottom:10}}>Avg Delivery Times</div>
        <div style={card()}>
          {[{n:'UPS',d:'3.2 days',c:T.acc,w:80},{n:'FedEx',d:'2.8 days',c:T.pur,w:70},{n:'USPS',d:'4.6 days',c:T.inf,w:55}].map(s=>(
            <div key={s.n} style={{marginBottom:12}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4}}><span style={{color:T.sec}}>{s.n}</span><span style={{fontWeight:600}}>{s.d}</span></div>
              <div style={{height:3,background:T.b2,borderRadius:2}}><div style={{height:3,background:s.c,borderRadius:2,width:`${s.w}%`}}/></div>
            </div>
          ))}
        </div>
        <div style={{...card({marginTop:12})}}>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:T.dim,marginBottom:10}}>This Month</div>
          {[['Shipped','47'],['On Time','44 (93.6%)'],['Avg Cost','$18.40'],['Pending Capture','$4,762']].map(([l,v])=>(
            <div key={l} style={{display:'flex',justifyContent:'space-between',fontSize:12,padding:'7px 0',borderBottom:`1px solid ${T.border}`}}><span style={{color:T.sec}}>{l}</span><span style={{fontWeight:600}}>{v}</span></div>
          ))}
        </div>
      </div>
    </div>
  </div>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANALYTICS
// ═══════════════════════════════════════════════════════════════════════════════
function Analytics() {
  const [aTab, setATab] = useState('overview');
  return <div style={{padding:22}}>
    <div style={{display:'flex',gap:8,marginBottom:16}}>
      {[['overview','Overview'],['rankings','Location Rankings'],['categories','Categories']].map(([k,l])=>(
        <button key={k} onClick={()=>setATab(k)} style={{...pill(aTab===k,PER),fontSize:12,border:'none',padding:'8px 16px'}}>{l}</button>
      ))}
    </div>

    {aTab==='overview'&&<>
      <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12,marginBottom:14}}>
        {[{l:'Revenue MTD',v:'$504,900',c:T.acc},{l:'Orders MTD',v:'314',c:T.ok},{l:'Avg Order',v:'$1,608',c:T.inf},{l:'Customers',v:'87',c:T.pur},{l:'vs Target',v:'83%',c:T.acc}].map(k=>(
          <div key={k.l} style={card()}><div style={{fontSize:10,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:T.dim,marginBottom:6}}>{k.l}</div><div style={{fontSize:22,fontWeight:700,color:k.c}}>{k.v}</div></div>
        ))}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:14}}>
        <div style={card()}>
          <div style={{fontSize:12,fontWeight:600,marginBottom:14}}>Revenue vs Target — 2026</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={REVENUE}>
              <CartesianGrid stroke={T.border} strokeDasharray="3 3" vertical={false}/>
              <XAxis dataKey="m" tick={{fill:T.dim,fontSize:11}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:T.dim,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={fmtM}/>
              <Tooltip content={<ChartTip/>}/>
              <Line type="monotone" dataKey="r" stroke={T.acc} strokeWidth={2.5} dot={{fill:T.acc,r:4}} name="Revenue"/>
              <Line type="monotone" dataKey="t" stroke={T.dim} strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="Target"/>
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div style={card()}>
          <div style={{fontSize:12,fontWeight:600,marginBottom:14}}>This Week</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={WEEKLY} barSize={24}>
              <CartesianGrid stroke={T.border} strokeDasharray="3 3" vertical={false}/>
              <XAxis dataKey="d" tick={{fill:T.dim,fontSize:11}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:T.dim,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={fmtM}/>
              <Tooltip content={<ChartTip/>}/>
              <Bar dataKey="r" fill={T.acc} radius={[4,4,0,0]} name="Revenue"/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>}

    {aTab==='rankings'&&<>
      <div style={{...card({overflow:'hidden',padding:0})}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr>{['Rank','Location','MTD Revenue','Orders','Growth','YTD'].map(h=>(
            <th key={h} style={{textAlign:'left',fontSize:10,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:T.dim,padding:'12px 16px',borderBottom:`1px solid ${T.border}`}}>{h}</th>
          ))}</tr></thead>
          <tbody>
            {LOCATIONS.map((loc,i)=>{
              const rc={1:T.acc,2:'#9CA3AF',3:'#CD7C3E'}[loc.rank];
              return <tr key={loc.rank} style={{borderBottom:i<LOCATIONS.length-1?`1px solid ${T.border}`:'none'}}>
                <td style={{padding:'13px 16px'}}><div style={{width:26,height:26,borderRadius:6,background:rc?`${rc}20`:T.border,color:rc||T.dim,fontSize:11,fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center'}}>{loc.rank}</div></td>
                <td style={{padding:'13px 16px',fontSize:13,fontWeight:600}}>{loc.name}</td>
                <td style={{padding:'13px 16px',fontSize:13,fontWeight:700}}>{fmtF(loc.rev)}</td>
                <td style={{padding:'13px 16px',fontSize:13,color:T.sec}}>{loc.orders}</td>
                <td style={{padding:'13px 16px'}}><span style={{fontSize:13,fontWeight:600,color:loc.growth>0?T.ok:T.bad}}>{loc.growth>0?'+':''}{loc.growth}%</span></td>
                <td style={{padding:'13px 16px',fontSize:12,color:T.sec}}>{fmtF(loc.rev*4.2)}</td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
      <div style={{...card({marginTop:14})}}>
        <div style={{fontSize:12,fontWeight:600,marginBottom:14}}>Revenue Comparison</div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={LOCATIONS} barSize={36}>
            <CartesianGrid stroke={T.border} strokeDasharray="3 3" vertical={false}/>
            <XAxis dataKey="name" tick={{fill:T.dim,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={n=>n.split(',')[0]}/>
            <YAxis tick={{fill:T.dim,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={fmtM}/>
            <Tooltip content={<ChartTip/>}/>
            <Bar dataKey="rev" radius={[5,5,0,0]} name="Revenue">
              {LOCATIONS.map((_,i)=><Cell key={i} fill={i===0?T.acc:i===1?'#9CA3AF':i===2?'#CD7C3E':`${T.b2}80`}/>)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>}

    {aTab==='categories'&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
      <div style={card()}>
        <div style={{fontSize:12,fontWeight:600,marginBottom:14}}>Revenue by Category</div>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie data={CAT_DATA} cx="50%" cy="50%" innerRadius={70} outerRadius={110} dataKey="v" paddingAngle={2}>
              {CAT_DATA.map((e,i)=><Cell key={i} fill={e.c}/>)}
            </Pie>
            <Tooltip formatter={v=>`${v}%`} contentStyle={{background:'#181825',border:`1px solid ${T.b2}`,borderRadius:8}}/>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div>{CAT_DATA.map(c=><div key={c.n} style={{...card({marginBottom:8})}}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <div style={{width:10,height:10,borderRadius:'50%',background:c.c}}/>
            <span style={{fontSize:13,fontWeight:500}}>{c.n}</span>
          </div>
          <span style={{fontSize:14,fontWeight:700,color:c.c}}>{c.v}%</span>
        </div>
        <div style={{height:3,background:T.b2,borderRadius:2}}><div style={{height:3,background:c.c,borderRadius:2,width:`${c.v*3}%`}}/></div>
      </div>)}</div>
    </div>}
  </div>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAG MANAGER
// ═══════════════════════════════════════════════════════════════════════════════
function TagManager({tags,setTags,accounts}) {
  const [selAcct, setSelAcct] = useState(0); // 0 = global

  const toggleTag = (key) => setTags(t=>({...t,[key]:{...t[key],active:!t[key].active}}));

  return <div style={{display:'flex',height:'100%'}}>
    <div style={{width:220,borderRight:`1px solid ${T.border}`,padding:12,flexShrink:0}}>
      <div style={{fontSize:10,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:T.dim,marginBottom:10}}>Portal</div>
      {[{id:0,name:'Global Default',sub:'All portals'},...accounts.map(a=>({id:a.id,name:a.company,sub:`${a.sub}.peregrinesolutions.com`}))].map(c=>(
        <div key={c.id} onClick={()=>setSelAcct(c.id)} style={{padding:'9px 11px',borderRadius:8,cursor:'pointer',marginBottom:4,background:selAcct===c.id?'#1A1A28':'transparent',border:`1px solid ${selAcct===c.id?`${PER}40`:T.border}`,transition:'all .12s'}}>
          <div style={{fontSize:12,fontWeight:selAcct===c.id?600:400,color:selAcct===c.id?T.txt:T.sec}}>{c.name}</div>
          <div style={{fontSize:9,color:T.dim,fontFamily:'monospace',marginTop:2}}>{c.sub}</div>
        </div>
      ))}
    </div>
    <div style={{flex:1,overflow:'auto',padding:22}}>
      <div style={{fontSize:13,fontWeight:600,marginBottom:4}}>{selAcct===0?'Global Default':'Customer Tags'}</div>
      <div style={{fontSize:11,color:T.dim,marginBottom:16}}>{selAcct===0?'Applied to all portals as baseline':'Tags for this specific portal only'}</div>
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {Object.entries(tags).map(([key,tag])=>(
          <div key={key} style={{...card(),display:'flex',alignItems:'center',gap:14,border:`1px solid ${tag.active?`${T.ok}30`:T.border}`}}>
            <div style={{width:38,height:38,borderRadius:8,background:tag.color+'20',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:900,color:tag.color,flexShrink:0,border:`1px solid ${tag.color}30`}}>{tag.logo}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:600,marginBottom:3}}>{tag.name}</div>
              {tag.id
                ? <code style={{fontSize:11,color:T.acc,background:T.bg,borderRadius:5,padding:'1px 6px'}}>{tag.id}</code>
                : <span style={{fontSize:11,color:T.dim}}>No ID configured</span>
              }
            </div>
            <div style={{display:'flex',gap:10,alignItems:'center'}}>
              <input style={{...inp(),width:160,fontSize:12,fontFamily:'monospace'}} placeholder={`Enter ${tag.name} ID…`} value={tag.id} onChange={e=>setTags(t=>({...t,[key]:{...t[key],id:e.target.value}}))}/>
              <Toggle on={tag.active} set={()=>toggleTag(key)}/>
            </div>
          </div>
        ))}
      </div>
      <div style={{...card({marginTop:14,background:T.iD,border:`1px solid ${T.inf}30`})}}>
        <div style={{fontSize:12,fontWeight:600,color:T.inf,marginBottom:4}}>How it works</div>
        <div style={{fontSize:11,color:T.sec,lineHeight:1.65}}>Active tags are automatically injected into the <code style={{color:T.acc}}>&lt;head&gt;</code> of each customer's branded portal at page load. Global tags fire on all portals. Customer-specific tags are additive.</div>
      </div>
    </div>
  </div>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// AI ASSISTANT
// ═══════════════════════════════════════════════════════════════════════════════
function AIAssistant() {
  const [msgs,    setMsgs]    = useState([{role:'ai',text:"Hi! I'm the Peregrine AI assistant. I can help find products, check order status, draft communications, or answer questions. What do you need?"}]);
  const [input,   setInput]   = useState('');
  const [thinking,setThinking]=useState(false);
  const [mode,    setMode]    = useState('staff');
  const ref = useRef(null);

  useEffect(()=>{ref.current?.scrollIntoView({behavior:'smooth'});},[msgs,thinking]);

  const send = async () => {
    if(!input.trim()||thinking) return;
    const msg = input; setInput(''); setThinking(true);
    setMsgs(m=>[...m,{role:'user',text:msg}]);
    try {
      const sys = mode==='customer'
        ? `You are a helpful AI assistant for Peregrine Solutions, a promotional products company. Help customers find products, check orders, and request quotes. Be friendly and concise.`
        : `You are an internal AI assistant for Peregrine Solutions staff. Help with product lookups, customer communications, pricing questions, and order management. Be concise and professional.`;
      const res = await fetch('https://api.anthropic.com/v1/messages',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({model:'claude-sonnet-4-5',max_tokens:1000,system:sys,messages:[...msgs.filter(m=>m.role!=='ai').map(m=>({role:'user',content:m.text})),{role:'user',content:msg}]}),
      });
      const data = await res.json();
      setMsgs(m=>[...m,{role:'ai',text:data.content?.[0]?.text||"I couldn't process that. Please try again."}]);
    } catch {
      setMsgs(m=>[...m,{role:'ai',text:"Connection error. Please try again."}]);
    } finally { setThinking(false); }
  };

  return <div style={{display:'grid',gridTemplateColumns:'1fr 380px',height:'100%',gap:0}}>
    <div style={{padding:22,borderRight:`1px solid ${T.border}`,overflow:'auto'}}>
      <div style={{fontSize:13,fontWeight:600,marginBottom:16}}>Configuration</div>
      <div style={card({marginBottom:12})}>
        <div style={{fontSize:11,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:T.dim,marginBottom:12}}>Anthropic API</div>
        <div style={{marginBottom:10}}><label style={lbl}>API Key</label><input style={inp()} type="password" defaultValue="sk-ant-api03-••••••••••••••••••••"/></div>
        <div style={{marginBottom:10}}><label style={lbl}>Model</label>
          <select style={{...inp(),appearance:'none'}}>
            <option>Claude Sonnet 4.5 — Recommended</option>
            <option>Claude Opus 4.5 — Most Capable</option>
            <option>Claude Haiku 4.5 — Fastest</option>
          </select>
        </div>
        <button style={{width:'100%',background:T.acc,border:'none',borderRadius:7,color:'#0B0B12',fontSize:13,fontWeight:700,cursor:'pointer',padding:'9px 0'}}>Save Configuration</button>
      </div>
      <div style={card({marginBottom:12})}>
        <div style={{fontSize:11,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:T.dim,marginBottom:12}}>Usage This Month</div>
        {[['Customer Conversations','847',T.acc],['Staff Conversations','213',T.inf],['Total Messages','4,821',T.ok],['Est. API Cost','$18.40',T.sec]].map(([l,v,c])=>(
          <div key={l} style={{display:'flex',justifyContent:'space-between',fontSize:12,padding:'8px 0',borderBottom:`1px solid ${T.border}`}}><span style={{color:T.sec}}>{l}</span><span style={{fontWeight:700,color:c}}>{v}</span></div>
        ))}
      </div>
      <div style={{...card(),background:T.oD,border:`1px solid ${T.ok}30`}}>
        <div style={{fontSize:11,fontWeight:700,color:T.ok,marginBottom:8}}>Context Auto-Injected Per Session</div>
        {['Customer account & pricing tier','Last 10 orders with tracking status','Customer\'s product catalog','ESP+ quote-only product flags','Staff role & location context'].map(i=>(
          <div key={i} style={{display:'flex',gap:8,fontSize:12,color:T.sec,marginBottom:4}}><span style={{color:T.ok}}>✓</span>{i}</div>
        ))}
      </div>
    </div>

    <div style={{display:'flex',flexDirection:'column',overflow:'hidden'}}>
      <div style={{background:PER,padding:'13px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:9}}>
          <div style={{width:28,height:28,background:'rgba(255,255,255,0.2)',borderRadius:7,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13}}>✦</div>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:'#fff'}}>Peregrine AI</div>
            <div style={{fontSize:8,color:'rgba(255,255,255,0.6)',letterSpacing:'0.06em',textTransform:'uppercase'}}>Powered by Claude</div>
          </div>
        </div>
        <div style={{display:'flex',gap:6}}>
          {[['customer','Customer'],['staff','Staff']].map(([k,l])=>(
            <button key={k} onClick={()=>{setMode(k);setMsgs([{role:'ai',text:k==='customer'?"Hi! I can help you find products or check on orders.":"Hi! Ready to help with products, orders, or customer info."}]);}} style={{padding:'4px 10px',borderRadius:5,border:'none',cursor:'pointer',fontSize:10,fontWeight:600,background:mode===k?'rgba(255,255,255,0.3)':'rgba(255,255,255,0.12)',color:'#fff'}}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{flex:1,padding:14,overflowY:'auto',display:'flex',flexDirection:'column',gap:10,minHeight:0}}>
        {msgs.map((m,i)=>(
          <div key={i} style={{display:'flex',justifyContent:m.role==='user'?'flex-end':'flex-start'}}>
            <div style={{maxWidth:'85%',background:m.role==='user'?PER:T.surf2,color:m.role==='user'?'#fff':T.txt,borderRadius:m.role==='user'?'12px 12px 3px 12px':'12px 12px 12px 3px',padding:'9px 12px',fontSize:12,lineHeight:1.6,border:m.role==='ai'?`1px solid ${T.border}`:'none'}}>{m.text}</div>
          </div>
        ))}
        {thinking&&<div style={{display:'flex',justifyContent:'flex-start'}}>
          <div style={{background:T.surf2,border:`1px solid ${T.border}`,borderRadius:'12px 12px 12px 3px',padding:'10px 14px',display:'flex',gap:5}}>
            {[0,1,2].map(i=><div key={i} style={{width:7,height:7,borderRadius:'50%',background:T.dim,animation:`pulse ${0.6+i*0.2}s ease-in-out infinite alternate`}}/>)}
          </div>
        </div>}
        <div ref={ref}/>
      </div>
      <div style={{padding:'10px 14px',borderTop:`1px solid ${T.border}`,display:'flex',gap:8,flexShrink:0}}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Ask about products, orders, customers…" style={{...inp(),flex:1,fontSize:12}}/>
        <button onClick={send} disabled={thinking} style={{background:PER,border:'none',borderRadius:8,color:'#fff',fontSize:14,cursor:thinking?'default':'pointer',padding:'8px 14px',fontWeight:700,opacity:thinking?0.5:1}}>→</button>
      </div>
    </div>
    <style>{`@keyframes pulse{from{opacity:.2}to{opacity:1}}`}</style>
  </div>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// USERS
// ═══════════════════════════════════════════════════════════════════════════════
function Users({staff,setStaff}) {
  const [panelOpen,setPanelOpen]=useState(false);
  const [form,setForm]=useState({name:'',email:'',role:'salesperson',loc:'Jonesboro, AR',active:true});
  const [confirm,setConfirm]=useState(null);
  const [saved,setSaved]=useState(false);

  const toggleActive = id => setStaff(s=>s.map(x=>x.id===id?{...x,active:!x.active}:x));
  const deleteUser   = id => { setStaff(s=>s.filter(x=>x.id!==id)); setConfirm(null); };
  const save = () => {
    setStaff(s=>[...s,{id:Math.max(...s.map(x=>x.id))+1,...form,lastLogin:'Never'}]);
    setSaved(true); setTimeout(()=>{setSaved(false);setPanelOpen(false);},1200);
  };

  const LOCS = ['Jonesboro, AR','Little Rock, AR','Memphis, TN','Nashville, TN','Tulsa, OK'];

  return <div style={{display:'flex',height:'100%'}}>
    <div style={{flex:1,overflow:'auto',padding:22}}>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:16}}>
        <div style={{display:'flex',gap:12,alignItems:'center'}}>
          <div style={{fontSize:11,color:T.dim}}>Location cap: <strong style={{color:T.txt}}>10 users max</strong></div>
          {['Jonesboro','Little Rock','Memphis'].map(l=>(
            <span key={l} style={{fontSize:10,background:'#1C1C28',color:T.dim,borderRadius:5,padding:'3px 8px'}}>{l}: {staff.filter(s=>s.loc?.includes(l)&&s.active).length}/10</span>
          ))}
        </div>
        <button onClick={()=>setPanelOpen(true)} style={{background:PER,border:'none',borderRadius:8,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',padding:'8px 18px'}}>+ Add Staff</button>
      </div>

      <div style={{...card({overflow:'hidden',padding:0})}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr>{['Name','Email','Role','Location','Status',''].map(h=>(
            <th key={h} style={{textAlign:'left',fontSize:10,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:T.dim,padding:'11px 16px',borderBottom:`1px solid ${T.border}`}}>{h}</th>
          ))}</tr></thead>
          <tbody>
            {staff.map((user,i)=>{
              const rc = ROLE_C[user.role]||T.sec;
              return <tr key={user.id} style={{borderBottom:i<staff.length-1?`1px solid ${T.border}`:'none',opacity:user.active?1:0.45}}>
                <td style={{padding:'12px 16px'}}>
                  <div style={{display:'flex',alignItems:'center',gap:9}}>
                    <div style={{width:32,height:32,borderRadius:'50%',background:`${rc}25`,color:rc,fontSize:11,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{user.name.split(' ').map(n=>n[0]).join('')}</div>
                    <span style={{fontSize:13,fontWeight:600}}>{user.name}</span>
                  </div>
                </td>
                <td style={{padding:'12px 16px',fontSize:12,color:T.sec}}>{user.email||'—'}</td>
                <td style={{padding:'12px 16px'}}><span style={{fontSize:11,fontWeight:600,background:`${rc}18`,color:rc,borderRadius:5,padding:'2px 8px'}}>{user.role.replace('_',' ')}</span></td>
                <td style={{padding:'12px 16px',fontSize:12,color:T.sec}}>{user.loc}</td>
                <td style={{padding:'12px 16px'}}><Toggle on={user.active} set={()=>toggleActive(user.id)}/></td>
                <td style={{padding:'12px 16px'}}><button onClick={()=>setConfirm(user.id)} style={{background:T.bD,border:`1px solid ${T.bad}25`,borderRadius:6,color:T.bad,fontSize:11,cursor:'pointer',padding:'5px 9px'}}>Remove</button></td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
    </div>

    {panelOpen&&<div style={{width:380,borderLeft:`1px solid ${T.border}`,background:'#0E0E17',display:'flex',flexDirection:'column',overflow:'hidden',flexShrink:0}}>
      <div style={{padding:'14px 18px',borderBottom:`1px solid ${T.border}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div style={{fontSize:14,fontWeight:600}}>New Staff User</div>
        <div style={{display:'flex',gap:8}}>
          {saved&&<span style={{fontSize:12,color:T.ok,fontWeight:600}}>✓ Saved</span>}
          <button onClick={save} style={{background:T.acc,border:'none',borderRadius:7,color:'#0B0B12',fontSize:13,fontWeight:700,cursor:'pointer',padding:'7px 16px'}}>Save</button>
          <button onClick={()=>setPanelOpen(false)} style={{background:'#1C1C28',border:'none',borderRadius:7,color:T.sec,cursor:'pointer',padding:'7px 12px'}}>✕</button>
        </div>
      </div>
      <div style={{flex:1,overflow:'auto',padding:18}}>
        {[['Full Name','name','text','First Last'],['Email','email','email','name@company.com']].map(([label,key,type,ph])=>(
          <div key={key} style={{marginBottom:12}}><label style={lbl}>{label}</label><input style={inp()} type={type} placeholder={ph} value={form[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))}/></div>
        ))}
        <div style={{marginBottom:12}}><label style={lbl}>Role</label>
          <select style={{...inp(),appearance:'none'}} value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))}>
            {Object.keys(ROLE_C).map(r=><option key={r} value={r}>{r.replace('_',' ')}</option>)}
          </select>
        </div>
        {form.role!=='super_admin'&&<div style={{marginBottom:12}}><label style={lbl}>Location</label>
          <select style={{...inp(),appearance:'none'}} value={form.loc} onChange={e=>setForm(f=>({...f,loc:e.target.value}))}>
            {LOCS.map(l=><option key={l} value={l}>{l}</option>)}
          </select>
        </div>}
      </div>
    </div>}

    {confirm&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200}}>
      <div style={{background:'#181825',border:`1px solid ${T.bad}40`,borderRadius:14,padding:28,width:340,textAlign:'center'}}>
        <div style={{fontSize:24,marginBottom:10}}>⚠️</div>
        <div style={{fontSize:15,fontWeight:600,marginBottom:6}}>Remove this user?</div>
        <div style={{fontSize:12,color:T.sec,marginBottom:20}}>This will permanently revoke <strong style={{color:T.txt}}>{staff.find(s=>s.id===confirm)?.name}</strong>'s access.</div>
        <div style={{display:'flex',gap:10}}>
          <button onClick={()=>deleteUser(confirm)} style={{flex:1,background:T.bad,border:'none',borderRadius:8,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',padding:'10px 0'}}>Remove</button>
          <button onClick={()=>setConfirm(null)} style={{flex:1,background:'#1C1C28',border:'none',borderRadius:8,color:T.sec,cursor:'pointer',padding:'10px 0',fontSize:13}}>Cancel</button>
        </div>
      </div>
    </div>}
  </div>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CUSTOMERS
// ═══════════════════════════════════════════════════════════════════════════════
function Customers({accounts,setAccounts}) {
  const [creating,setCreating]=useState(false);
  const [form,setForm]=useState({company:'',contact:'',email:'',subdomain:'',tier:1});
  const [step,setStep]=useState(1);
  const [done,setDone]=useState(false);
  const [primaryColor,setPrimaryColor]=useState('#DA532C');

  const create = () => {
    setAccounts(a=>[...a,{id:a.length+1,company:form.company,sub:form.subdomain||'newcustomer',tier:form.tier,loc:'Jonesboro, AR',users:1,active:true,primary:primaryColor,logo:form.company[0]||'?'}]);
    setDone(true);
  };

  if(!creating) return <div style={{padding:22}}>
    <div style={{display:'flex',justifyContent:'space-between',marginBottom:16}}>
      <div style={{display:'flex',gap:12}}>
        <div style={{...card({padding:'10px 16px'}),display:'flex',gap:6,alignItems:'center'}}><span style={{fontSize:20,fontWeight:700,color:T.ok}}>{accounts.filter(a=>a.active).length}</span><span style={{fontSize:12,color:T.dim}}>Active</span></div>
        <div style={{...card({padding:'10px 16px'}),display:'flex',gap:6,alignItems:'center'}}><span style={{fontSize:20,fontWeight:700,color:T.bad}}>{accounts.filter(a=>!a.active).length}</span><span style={{fontSize:12,color:T.dim}}>Inactive</span></div>
      </div>
      <button onClick={()=>{setCreating(true);setDone(false);setStep(1);setForm({company:'',contact:'',email:'',subdomain:'',tier:1});}} style={{background:PER,border:'none',borderRadius:8,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',padding:'9px 20px'}}>+ New Account</button>
    </div>
    <div style={{...card({overflow:'hidden',padding:0})}}>
      <table style={{width:'100%',borderCollapse:'collapse'}}>
        <thead><tr>{['Company','Portal URL','Location','Tier','Users','Status',''].map(h=>(
          <th key={h} style={{textAlign:'left',fontSize:10,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:T.dim,padding:'11px 16px',borderBottom:`1px solid ${T.border}`}}>{h}</th>
        ))}</tr></thead>
        <tbody>
          {accounts.map((acc,i)=>(
            <tr key={acc.id} style={{borderBottom:i<accounts.length-1?`1px solid ${T.border}`:'none',opacity:acc.active?1:0.5}}>
              <td style={{padding:'13px 16px'}}>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <div style={{width:32,height:32,borderRadius:8,background:`${acc.primary}30`,color:acc.primary,fontSize:13,fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{acc.logo}</div>
                  <span style={{fontSize:13,fontWeight:600}}>{acc.company}</span>
                </div>
              </td>
              <td style={{padding:'13px 16px',fontSize:11,fontFamily:'monospace',color:PER}}>{acc.sub}.peregrinesolutions.com</td>
              <td style={{padding:'13px 16px',fontSize:12,color:T.sec}}>{acc.loc}</td>
              <td style={{padding:'13px 16px'}}><span style={{fontSize:11,background:'#1C1C28',color:T.sec,borderRadius:5,padding:'2px 7px'}}>Tier {acc.tier}</span></td>
              <td style={{padding:'13px 16px',fontSize:13}}>{acc.users}</td>
              <td style={{padding:'13px 16px'}}><span style={{fontSize:11,fontWeight:600,background:acc.active?T.oD:T.bD,color:acc.active?T.ok:T.bad,borderRadius:5,padding:'2px 8px'}}>{acc.active?'Active':'Inactive'}</span></td>
              <td style={{padding:'13px 16px'}}><button style={{background:T.iD,border:`1px solid ${T.inf}25`,borderRadius:6,color:T.inf,fontSize:11,cursor:'pointer',padding:'5px 10px',fontWeight:600}}>Portal →</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>;

  if(done) return <div style={{padding:22,display:'flex',alignItems:'center',justifyContent:'center',minHeight:400}}>
    <div style={{...card({textAlign:'center',padding:48,maxWidth:480})}}>
      <div style={{fontSize:40,marginBottom:12}}>🎉</div>
      <div style={{fontSize:18,fontWeight:700,color:T.ok,marginBottom:6}}>Portal Created!</div>
      <div style={{fontSize:13,color:T.sec,marginBottom:20}}><strong style={{color:T.txt}}>{form.company}</strong>'s portal is live at:<br/><span style={{color:PER,fontFamily:'monospace',fontSize:14,fontWeight:600}}>{form.subdomain||'newportal'}.peregrinesolutions.com</span></div>
      <div style={{display:'flex',gap:10,justifyContent:'center'}}>
        <button onClick={()=>setCreating(false)} style={{background:T.ok,border:'none',borderRadius:8,color:'#0B0B12',fontSize:13,fontWeight:700,cursor:'pointer',padding:'10px 24px'}}>View All Accounts</button>
        <button onClick={()=>{setDone(false);setStep(1);}} style={{background:'#1C1C28',border:'none',borderRadius:8,color:T.sec,cursor:'pointer',padding:'10px 20px',fontSize:13}}>Create Another</button>
      </div>
    </div>
  </div>;

  return <div style={{padding:22}}>
    {/* Stepper */}
    <div style={{display:'flex',alignItems:'center',marginBottom:22,maxWidth:600}}>
      {['Company Info','Branding','Users','Done'].map((s,i)=>{
        const done=step>i+1,cur=step===i+1,last=i===3;
        return <div key={s} style={{display:'flex',alignItems:'center',flex:last?'none':1}}>
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',minWidth:70}}>
            <div style={{width:28,height:28,borderRadius:'50%',background:done?T.ok:cur?PER:T.b2,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:done||cur?'#fff':T.dim,marginBottom:4,border:`2px solid ${done?T.ok:cur?PER:T.b2}`}}>{done?'✓':i+1}</div>
            <div style={{fontSize:9,fontWeight:600,color:done?T.ok:cur?PER:T.dim,textAlign:'center'}}>{s}</div>
          </div>
          {!last&&<div style={{flex:1,height:2,background:done?T.ok:T.b2,margin:'0 6px 18px',borderRadius:2}}/>}
        </div>;
      })}
    </div>

    <div style={{display:'grid',gridTemplateColumns:'1fr 300px',gap:16,maxWidth:900}}>
      <div>
        {step===1&&<div style={card()}>
          <div style={{fontSize:13,fontWeight:600,marginBottom:16}}>Company Information</div>
          {[['Company Name','company','text','e.g. Acme Corporation'],['Primary Contact','contact','text','Full name'],['Email','email','email','contact@company.com']].map(([l,k,t,p])=>(
            <div key={k} style={{marginBottom:12}}><label style={lbl}>{l}</label><input style={inp()} type={t} placeholder={p} value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))}/></div>
          ))}
          <div style={{marginBottom:12}}><label style={lbl}>Portal Subdomain</label>
            <div style={{display:'flex'}}>
              <input style={{...inp(),borderRight:'none',borderRadius:'7px 0 0 7px'}} placeholder="acme" value={form.subdomain} onChange={e=>setForm(f=>({...f,subdomain:e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,'')}))}/>
              <div style={{background:'#181825',border:`1px solid ${T.b2}`,borderRadius:'0 7px 7px 0',padding:'8px 12px',fontSize:12,color:T.dim,whiteSpace:'nowrap'}}>.peregrinesolutions.com</div>
            </div>
            {form.subdomain.length>2&&<div style={{fontSize:11,color:T.ok,marginTop:4}}>✓ Available</div>}
          </div>
        </div>}

        {step===2&&<div style={card()}>
          <div style={{fontSize:13,fontWeight:600,marginBottom:16}}>Brand Colors</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
            {[['Primary Color',primaryColor,setPrimaryColor],['Accent Color','#F5A623',()=>{}]].map(([l,v,set])=>(
              <div key={l}><label style={lbl}>{l}</label>
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  <input type="color" value={v} onChange={e=>set(e.target.value)} style={{width:36,height:36,border:'none',borderRadius:7,cursor:'pointer',padding:0}}/>
                  <input style={inp()} value={v} onChange={e=>set(e.target.value)}/>
                </div>
              </div>
            ))}
          </div>
          <label style={lbl}>Logo Upload</label>
          <div style={{border:`2px dashed ${T.b2}`,borderRadius:10,padding:'20px 16px',textAlign:'center',cursor:'pointer',color:T.dim}}>
            <div style={{fontSize:22,marginBottom:5}}>📷</div>
            <div style={{fontSize:12}}>Upload logo (PNG or SVG)</div>
          </div>
        </div>}

        {step===3&&<div style={card()}>
          <div style={{fontSize:13,fontWeight:600,marginBottom:16}}>Initial Users</div>
          <div style={{background:T.bg,border:`1px solid ${T.b2}`,borderRadius:10,padding:14,marginBottom:10}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div><label style={lbl}>Name</label><input style={inp()} placeholder="Primary contact name" value={form.contact} onChange={e=>setForm(f=>({...f,contact:e.target.value}))}/></div>
              <div><label style={lbl}>Email</label><input style={inp()} placeholder="their@email.com" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}/></div>
            </div>
            <div style={{marginTop:10,fontSize:11,color:T.dim}}>Role: <strong style={{color:T.pur}}>Account Admin</strong> — can manage users and place orders</div>
          </div>
          <div style={{fontSize:11,color:T.dim,padding:'10px 12px',background:T.iD,borderRadius:8,border:`1px solid ${T.inf}30`}}>Additional users can be added by the account admin or your team after the portal is created.</div>
        </div>}
      </div>

      {/* Live preview */}
      <div style={card()}>
        <div style={{fontSize:10,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:T.dim,marginBottom:10}}>Portal Preview</div>
        <div style={{background:'#0B0B12',border:`1px solid ${T.b2}`,borderRadius:10,overflow:'hidden'}}>
          <div style={{background:'#141420',padding:'7px 10px',display:'flex',alignItems:'center',gap:6,borderBottom:`1px solid ${T.border}`}}>
            {['#F87171','#F5A623','#34D399'].map(c=><div key={c} style={{width:7,height:7,borderRadius:'50%',background:c}}/>)}
            <div style={{flex:1,background:'#0B0B12',borderRadius:3,padding:'2px 7px',fontSize:8,color:T.dim,fontFamily:'monospace',marginLeft:3}}>{form.subdomain||'yourcompany'}.peregrinesolutions.com</div>
          </div>
          <div style={{padding:12}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
              <div style={{display:'flex',alignItems:'center',gap:7}}>
                <div style={{width:26,height:26,borderRadius:6,background:`${primaryColor}30`,color:primaryColor,fontSize:12,fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center'}}>{form.company[0]||'?'}</div>
                <span style={{fontSize:10,fontWeight:700,color:T.txt}}>{form.company||'Company Name'}</span>
              </div>
            </div>
            <div style={{borderRadius:7,padding:'12px 10px',marginBottom:8,background:`linear-gradient(135deg, ${primaryColor} 0%, #1A1A2E 100%)`,color:'#fff'}}>
              <div style={{fontSize:8,opacity:0.7,marginBottom:2}}>Welcome back</div>
              <div style={{fontSize:11,fontWeight:700}}>{form.contact||'Contact Name'}</div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:5}}>
              {['Products','Orders','Track'].map(l=><div key={l} style={{background:T.surf,border:`1px solid ${T.border}`,borderRadius:5,padding:'5px 0',textAlign:'center',fontSize:7,color:T.sec}}>{l}</div>)}
            </div>
          </div>
        </div>
      </div>
    </div>

    <div style={{display:'flex',justifyContent:'space-between',marginTop:16,maxWidth:900}}>
      <button onClick={()=>setStep(s=>Math.max(1,s-1))} disabled={step===1} style={{padding:'9px 22px',background:'#1C1C28',border:'none',borderRadius:8,color:T.sec,fontSize:13,cursor:step===1?'default':'pointer',opacity:step===1?0.4:1}}>← Back</button>
      {step<3
        ?<button onClick={()=>setStep(s=>s+1)} style={{padding:'9px 24px',background:PER,border:'none',borderRadius:8,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>Next →</button>
        :<button onClick={create} style={{padding:'9px 24px',background:T.ok,border:'none',borderRadius:8,color:'#0B0B12',fontSize:13,fontWeight:700,cursor:'pointer'}}>Create Portal ✓</button>
      }
    </div>
  </div>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CUSTOMER PORTAL
// ═══════════════════════════════════════════════════════════════════════════════
function CustomerPortal() {
  const [cpView,  setCpView]  = useState('home');
  const [cat,     setCat]     = useState('all');
  const [cart,    setCart]    = useState([]);
  const [qtys,    setQtys]    = useState({});
  const [expOrder,setExpOrder]=useState(null);
  const [chatOpen,setChatOpen]=useState(false);
  const [cInput,  setCInput]  = useState('');
  const [cMsgs,   setCMsgs]   = useState([{role:'ai',text:"Hi Jane! I'm your Peregrine AI assistant. I can help you find products, check orders, or get a quote. What do you need?"}]);
  const [cThink,  setCThink]  = useState(false);
  const chatRef = useRef(null);

  useEffect(()=>{chatRef.current?.scrollIntoView({behavior:'smooth'});},[cMsgs,cThink]);

  const cartQty   = cart.reduce((s,i)=>s+i.qty,0);
  const cartTotal = cart.reduce((s,i)=>s+i.price*i.qty,0);

  const addToCart = (p) => {
    const qty=parseInt(qtys[p.id]||p.min);
    setCart(prev=>{const ex=prev.find(i=>i.id===p.id);return ex?prev.map(i=>i.id===p.id?{...i,qty:i.qty+qty}:i):[...prev,{...p,qty}];});
  };

  const custSend = async () => {
    if(!cInput.trim()) return;
    const msg=cInput; setCInput(''); setCThink(true);
    setCMsgs(m=>[...m,{role:'user',text:msg}]);
    try {
      const res=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'claude-sonnet-4-5',max_tokens:600,system:'You are a helpful AI assistant for Peregrine Solutions, a promotional products company. Help customers find products, check orders, and request quotes for custom items. Be friendly, concise, and helpful. If someone asks about a product without a price, say "I can get you an official quote on that!"',messages:[...cMsgs.filter(m=>m.role!=='ai').map(m=>({role:'user',content:m.text})),{role:'user',content:msg}]})});
      const data=await res.json();
      setCMsgs(m=>[...m,{role:'ai',text:data.content?.[0]?.text||"Let me connect you with your rep for that."}]);
    } catch { setCMsgs(m=>[...m,{role:'ai',text:"I'm having trouble connecting. Your rep can help!"}]); }
    finally { setCThink(false); }
  };

  const cats=['all','apparel','bags','writing','tech','drinkware','awards'];
  const filtered=CUST_PRODS.filter(p=>cat==='all'||p.cat===cat);
  const CSTATUS={Processing:{bg:'#EEF2FF',c:'#4F46E5'},Shipped:{bg:'#FFF7ED',c:'#EA580C'},Delivered:{bg:'#F0FDF4',c:'#16A34A'}};

  return <div style={{minHeight:'100%',background:'#F5F4F0',fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",color:'#1A1A1A',position:'relative'}}>
    {/* Portal header */}
    <div style={{background:'#fff',borderBottom:'1px solid #EBEBEB',position:'sticky',top:0,zIndex:30}}>
      <div style={{maxWidth:1100,margin:'0 auto',padding:'0 20px',height:60,display:'flex',alignItems:'center',gap:14}}>
        <div style={{display:'flex',alignItems:'center',gap:9,marginRight:6}}>
          <div style={{width:36,height:36,background:PER,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,fontSize:16,color:'#fff'}}>A</div>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:'#111'}}>Acme Corporation</div>
            <div style={{fontSize:8,color:'#BBB',letterSpacing:'0.06em',textTransform:'uppercase'}}>Powered by Peregrine</div>
          </div>
        </div>
        <nav style={{flex:1,display:'flex',gap:2}}>
          {[['home','Home'],['catalog','Products'],['orders','My Orders'],['cart','Cart']].map(([id,label])=>(
            <button key={id} onClick={()=>setCpView(id)} style={{padding:'6px 13px',borderRadius:7,fontSize:12,fontWeight:cpView===id?600:400,cursor:'pointer',border:'none',background:cpView===id?`${PER}15`:'transparent',color:cpView===id?PER:'#555',transition:'all .12s'}}>{label}{id==='cart'&&cartQty>0?` (${cartQty})`:''}</button>
          ))}
        </nav>
        <button onClick={()=>setChatOpen(v=>!v)} style={{display:'flex',alignItems:'center',gap:6,padding:'6px 14px',borderRadius:20,border:`1.5px solid ${PER}`,background:'transparent',cursor:'pointer',fontSize:12,fontWeight:600,color:PER}}>✦ Ask AI</button>
        <div style={{width:32,height:32,borderRadius:'50%',background:PER,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,color:'#fff'}}>JD</div>
      </div>
    </div>

    <div style={{maxWidth:1100,margin:'0 auto',padding:'22px 20px 80px'}}>
      {cpView==='home'&&<>
        <div style={{borderRadius:14,padding:'26px 30px',marginBottom:20,color:'#fff',background:`linear-gradient(135deg, ${PER} 0%, #B8421E 100%)`,position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',right:-20,top:-20,width:180,height:180,borderRadius:'50%',background:'rgba(255,255,255,0.07)'}}/>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:'0.14em',textTransform:'uppercase',opacity:0.7,marginBottom:4}}>Welcome back</div>
          <div style={{fontSize:24,fontWeight:700,letterSpacing:'-0.025em',marginBottom:2}}>Jane Doe</div>
          <div style={{fontSize:12,opacity:0.7,marginBottom:20}}>Acme Corporation · Account #AC-1042</div>
          <div style={{display:'flex',gap:24}}>
            {[['2','Active Orders'],['$487','Pending'],['14','Orders YTD']].map(([v,l])=>(
              <div key={l}><div style={{fontSize:22,fontWeight:700,letterSpacing:'-0.03em'}}>{v}</div><div style={{fontSize:10,opacity:0.65,marginTop:1}}>{l}</div></div>
            ))}
          </div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:22}}>
          {[{l:'Browse Products',s:'Full catalog',icon:'📦',fn:()=>setCpView('catalog')},{l:'Track Orders',s:'2 active',icon:'🚚',fn:()=>setCpView('orders')},{l:'Request Quote',s:'Custom orders',icon:'💬',fn:()=>setChatOpen(true)},{l:'Pay Invoice',s:'1 due',icon:'💳',fn:()=>{}}].map(q=>(
            <button key={q.l} onClick={q.fn} style={{background:'#fff',border:'1px solid #EBEBEB',borderRadius:12,padding:'14px 12px',textAlign:'left',cursor:'pointer',display:'flex',flexDirection:'column',gap:6}}>
              <span style={{fontSize:20}}>{q.icon}</span>
              <div style={{fontSize:12,fontWeight:600,color:'#111'}}>{q.l}</div>
              <div style={{fontSize:11,color:'#AAA'}}>{q.s}</div>
            </button>
          ))}
        </div>
        <div style={{fontSize:11,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:'#AAA',marginBottom:10}}>Recent Orders</div>
        <div style={{background:'#fff',border:'1px solid #EBEBEB',borderRadius:12,overflow:'hidden'}}>
          {CUST_ORDERS.map((o,i)=>{const st=CSTATUS[o.status]||{};return (
            <div key={o.id} onClick={()=>{setCpView('orders');setExpOrder(o.id);}} style={{display:'flex',alignItems:'center',padding:'13px 18px',borderBottom:i<CUST_ORDERS.length-1?'1px solid #F5F5F2':'none',cursor:'pointer',gap:12}}>
              <div style={{flex:1}}><div style={{fontSize:12,fontWeight:600,fontFamily:'monospace',color:PER,marginBottom:2}}>{o.id}</div><div style={{fontSize:11,color:'#AAA'}}>{o.date} · {o.items} items</div></div>
              <div style={{fontSize:13,fontWeight:700}}>${o.total.toLocaleString()}</div>
              <span style={{background:st.bg,color:st.c,borderRadius:5,fontSize:11,fontWeight:600,padding:'2px 8px'}}>{o.status}</span>
            </div>
          );})}
        </div>
      </>}

      {cpView==='catalog'&&<>
        <div style={{display:'flex',gap:7,marginBottom:16,flexWrap:'wrap'}}>
          {cats.map(c=><button key={c} onClick={()=>setCat(c)} style={{padding:'6px 14px',borderRadius:20,fontSize:12,fontWeight:500,cursor:'pointer',border:`1.5px solid ${cat===c?PER:'#E0E0DC'}`,background:cat===c?PER:'#fff',color:cat===c?'#fff':'#555',transition:'all .12s',textTransform:'capitalize'}}>{c}</button>)}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14}}>
          {filtered.map(p=><div key={p.id} style={{background:'#fff',border:'1px solid #EBEBEB',borderRadius:12,overflow:'hidden',display:'flex',flexDirection:'column'}}>
            <div style={{height:110,background:`${p.color}15`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:38}}>{p.icon}</div>
            <div style={{padding:12,flex:1,display:'flex',flexDirection:'column'}}>
              <div style={{fontSize:10,color:'#BBB',fontWeight:600,marginBottom:2}}>SKU: {p.id.toString().padStart(4,'0')}</div>
              <div style={{fontSize:12,fontWeight:600,color:'#111',marginBottom:8,lineHeight:1.3}}>{p.name}</div>
              {p.esp
                ?<div style={{background:`${PER}10`,border:`1px solid ${PER}25`,borderRadius:7,padding:'8px 10px',marginBottom:8}}>
                  <div style={{fontSize:11,fontWeight:700,color:PER}}>Price on Request</div>
                  <div style={{fontSize:10,color:'#AAA',marginTop:1}}>Contact rep for quote</div>
                </div>
                :<div style={{marginBottom:8}}><span style={{fontSize:18,fontWeight:700,color:PER}}>${p.price.toFixed(2)}</span><span style={{fontSize:11,color:'#BBB',marginLeft:4}}>ea · min {p.min}</span></div>
              }
              {!p.esp
                ?<div style={{display:'flex',gap:7,marginTop:'auto'}}>
                  <input type="number" min={p.min} value={qtys[p.id]||p.min} onChange={e=>setQtys(q=>({...q,[p.id]:e.target.value}))} style={{width:52,background:'#F7F7F4',border:'1px solid #E8E8E0',borderRadius:6,padding:'6px 5px',fontSize:11,outline:'none',textAlign:'center',color:'#111'}}/>
                  <button onClick={()=>addToCart(p)} style={{flex:1,background:PER,border:'none',borderRadius:6,color:'#fff',fontSize:11,fontWeight:600,cursor:'pointer',padding:'7px 0'}}>Add to Cart</button>
                </div>
                :<button onClick={()=>setChatOpen(true)} style={{background:'transparent',border:`1.5px solid ${PER}`,borderRadius:6,color:PER,fontSize:11,fontWeight:600,cursor:'pointer',padding:'7px 0',marginTop:'auto'}}>Request Quote ✦</button>
              }
            </div>
          </div>)}
        </div>
      </>}

      {cpView==='orders'&&<>
        <div style={{background:'#fff',border:'1px solid #EBEBEB',borderRadius:12,overflow:'hidden'}}>
          {CUST_ORDERS.map((o,i)=>{
            const st=CSTATUS[o.status]||{};
            const exp=expOrder===o.id;
            const steps=['Ordered','Processing','Shipped','Delivered'];
            const stepIdx={Processing:1,Shipped:2,Delivered:3}[o.status]||0;
            return <div key={o.id} style={{borderBottom:i<CUST_ORDERS.length-1?'1px solid #F5F5F2':'none'}}>
              <div onClick={()=>setExpOrder(exp?null:o.id)} style={{display:'flex',alignItems:'center',padding:'14px 18px',cursor:'pointer',gap:12}}>
                <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,fontFamily:'monospace',color:PER,marginBottom:2}}>{o.id}</div><div style={{fontSize:11,color:'#AAA'}}>{o.date} · {o.items} items</div></div>
                <div style={{fontSize:14,fontWeight:700}}>${o.total.toLocaleString()}</div>
                <span style={{background:st.bg,color:st.c,borderRadius:5,fontSize:11,fontWeight:600,padding:'2px 8px'}}>{o.status}</span>
                <span style={{color:'#CCC',transform:exp?'rotate(90deg)':'none',display:'inline-block',transition:'transform .15s'}}>›</span>
              </div>
              {exp&&<div style={{padding:'0 18px 16px',borderTop:'1px solid #F8F8F5'}}>
                {o.tracking
                  ?<div style={{background:'#FAFAF7',borderRadius:10,padding:14}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:14}}>
                      <div><div style={{fontSize:11,color:'#AAA',marginBottom:3}}>Carrier: <strong>{o.carrier}</strong></div><div style={{fontSize:11,fontFamily:'monospace',color:'#444'}}>{o.tracking}</div></div>
                      <div style={{textAlign:'right'}}><div style={{fontSize:11,color:'#AAA'}}>ETA</div><div style={{fontSize:12,fontWeight:700,color:o.status==='Delivered'?'#16A34A':PER}}>{o.eta}</div></div>
                    </div>
                    <div style={{display:'flex',alignItems:'flex-start'}}>
                      {steps.map((s,idx)=>{
                        const done=idx<=stepIdx,last=idx===3;
                        return <div key={s} style={{display:'flex',alignItems:'flex-start',flex:last?'none':1}}>
                          <div style={{display:'flex',flexDirection:'column',alignItems:'center',minWidth:60}}>
                            <div style={{width:22,height:22,borderRadius:'50%',background:done?PER:'#E0E0DC',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:700,color:done?'#fff':'#AAA',marginBottom:4}}>{done?'✓':idx+1}</div>
                            <div style={{fontSize:8,color:done?PER:'#BBB',textAlign:'center',fontWeight:done?600:400}}>{s}</div>
                          </div>
                          {!last&&<div style={{flex:1,height:2,background:idx<stepIdx?PER:'#E0E0DC',margin:'10px 2px 0',borderRadius:2}}/>}
                        </div>;
                      })}
                    </div>
                  </div>
                  :<div style={{background:`${PER}10`,borderRadius:9,padding:'11px 14px',fontSize:12,color:PER,border:`1px solid ${PER}20`}}>Your order is confirmed — tracking will be added once it ships.</div>
                }
              </div>}
            </div>;
          })}
        </div>
      </>}

      {cpView==='cart'&&<div style={{display:'grid',gridTemplateColumns:'1fr 320px',gap:14,alignItems:'start'}}>
        <div style={{background:'#fff',border:'1px solid #EBEBEB',borderRadius:12,padding:20}}>
          <div style={{fontSize:15,fontWeight:700,marginBottom:16}}>Your Cart</div>
          {cart.length===0
            ?<div style={{textAlign:'center',padding:'36px 0',color:'#BBB'}}><div style={{fontSize:32,marginBottom:10}}>🛒</div><div style={{fontSize:13}}>Your cart is empty</div><button onClick={()=>setCpView('catalog')} style={{color:PER,border:'none',background:'none',cursor:'pointer',fontWeight:600,fontSize:13,marginTop:8}}>Browse products →</button></div>
            :cart.map(item=><div key={item.id} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 0',borderBottom:'1px solid #F5F5F2'}}>
              <div style={{width:46,height:46,background:`${item.color}15`,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>{item.icon}</div>
              <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,marginBottom:2}}>{item.name}</div><div style={{fontSize:11,color:'#BBB'}}>Qty: {item.qty}</div></div>
              <div style={{textAlign:'right'}}><div style={{fontSize:13,fontWeight:700}}>${(item.price*item.qty).toFixed(2)}</div><div style={{fontSize:11,color:'#BBB'}}>${item.price.toFixed(2)} ea</div></div>
              <button onClick={()=>setCart(c=>c.filter(i=>i.id!==item.id))} style={{background:'none',border:'none',color:'#CCC',cursor:'pointer',fontSize:18}}>×</button>
            </div>)
          }
        </div>
        {cart.length>0&&<div style={{background:'#fff',border:'1px solid #EBEBEB',borderRadius:12,padding:20,position:'sticky',top:80}}>
          <div style={{fontSize:14,fontWeight:700,marginBottom:14}}>Order Summary</div>
          {[['Subtotal',`$${cartTotal.toFixed(2)}`],['Shipping','TBD'],['Setup/Design','TBD']].map(([l,v])=>(
            <div key={l} style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'#666',marginBottom:7}}><span>{l}</span><span>{v}</span></div>
          ))}
          <div style={{height:1,background:'#F0F0EC',margin:'12px 0'}}/>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:15,fontWeight:700,marginBottom:16}}><span>Total</span><span>${cartTotal.toFixed(2)}</span></div>
          <div style={{background:`${PER}10`,borderRadius:7,padding:'9px 12px',fontSize:11,color:PER,marginBottom:12}}>💳 Card will not be charged until your order is delivered.</div>
          <button style={{width:'100%',background:PER,border:'none',borderRadius:9,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',padding:'12px 0',marginBottom:8}}>Place Order</button>
          <button style={{width:'100%',background:'transparent',border:'1px solid #E0E0DC',borderRadius:9,color:'#666',fontSize:12,cursor:'pointer',padding:'10px 0'}}>Request Invoice Instead</button>
        </div>}
      </div>}
    </div>

    {/* AI Chat */}
    {chatOpen&&<div style={{position:'fixed',bottom:22,right:22,width:320,background:'#fff',border:'1px solid #E0E0DC',borderRadius:16,boxShadow:'0 20px 60px rgba(0,0,0,0.13)',display:'flex',flexDirection:'column',zIndex:100,overflow:'hidden',maxHeight:'70vh'}}>
      <div style={{background:PER,padding:'12px 15px',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <div style={{width:26,height:26,background:'rgba(255,255,255,0.2)',borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12}}>✦</div>
          <div><div style={{fontSize:12,fontWeight:700,color:'#fff'}}>Peregrine AI</div><div style={{fontSize:8,color:'rgba(255,255,255,0.6)',letterSpacing:'0.04em',textTransform:'uppercase'}}>Powered by Claude</div></div>
        </div>
        <button onClick={()=>setChatOpen(false)} style={{background:'none',border:'none',color:'rgba(255,255,255,0.6)',cursor:'pointer',fontSize:18,lineHeight:1}}>×</button>
      </div>
      <div style={{flex:1,padding:12,display:'flex',flexDirection:'column',gap:8,overflowY:'auto',minHeight:0}}>
        {cMsgs.map((m,i)=><div key={i} style={{display:'flex',justifyContent:m.role==='user'?'flex-end':'flex-start'}}>
          <div style={{maxWidth:'85%',background:m.role==='user'?PER:'#F5F5F2',color:m.role==='user'?'#fff':'#1A1A1A',borderRadius:m.role==='user'?'12px 12px 3px 12px':'12px 12px 12px 3px',padding:'8px 11px',fontSize:12,lineHeight:1.5}}>{m.text}</div>
        </div>)}
        {cThink&&<div style={{display:'flex'}}><div style={{background:'#F5F5F2',borderRadius:'12px 12px 12px 3px',padding:'8px 12px',display:'flex',gap:4}}>{[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:'50%',background:'#CCC',animation:`pulse ${0.6+i*0.15}s ease-in-out infinite alternate`}}/>)}</div></div>}
        <div ref={chatRef}/>
      </div>
      <div style={{padding:'8px 11px',borderTop:'1px solid #F0F0EC',display:'flex',gap:7,flexShrink:0}}>
        <input value={cInput} onChange={e=>setCInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&custSend()} placeholder="Ask about products, orders…" style={{flex:1,background:'#F7F7F4',border:'1px solid #E8E8E0',borderRadius:7,padding:'8px 10px',fontSize:12,outline:'none',color:'#111'}}/>
        <button onClick={custSend} style={{background:PER,border:'none',borderRadius:7,color:'#fff',fontSize:13,cursor:'pointer',padding:'7px 12px',fontWeight:700}}>→</button>
      </div>
    </div>}
    {!chatOpen&&<button onClick={()=>setChatOpen(true)} style={{position:'fixed',bottom:22,right:22,background:PER,border:'none',borderRadius:50,color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer',padding:'11px 20px',boxShadow:`0 8px 28px ${PER}55`,zIndex:100}}>✦ Ask AI</button>}
    <style>{`@keyframes pulse{from{opacity:.2}to{opacity:1}}`}</style>
  </div>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VENDOR SYNC
// ═══════════════════════════════════════════════════════════════════════════════
const VENDOR_TYPES_V=[
  {id:'asi_api',label:'ASI ESP+ API',icon:'📦',method:'api',color:'#E37400',desc:'Official ASI distributor API — pulls product data, pricing, images on schedule'},
  {id:'sanmar',label:'SanMar',icon:'👕',method:'api',color:'#1E40AF',desc:'SanMar PromoStandards API for apparel & accessories'},
  {id:'alphabroder',label:'alphabroder',icon:'🧢',method:'api',color:'#7C3AED',desc:'alphabroder / Prime Line product feed'},
  {id:'sns',label:'S&S Activewear',icon:'⚡',method:'api',color:'#059669',desc:'S&S Activewear product & inventory API'},
  {id:'custom_api',label:'Custom API Vendor',icon:'⚙️',method:'api',color:T.pur,desc:'Any vendor with a REST or XML product data API'},
  {id:'custom_web',label:'Custom Web Vendor',icon:'🔐',method:'web',color:T.sec,desc:'Any vendor with a web login portal — headless browser scrape'},
];

const INIT_VENDORS=[
  {id:1,type:'asi_api',name:'ASI ESP+',active:true,connected:true,method:'api',color:'#E37400',icon:'📦',
   creds:{api_key:'••••••••••••••••',member_id:'475835',base_url:'https://api.asicentral.com/v1/'},
   schedule:{enabled:true,time:'00:00',days:['mon','tue','wed','thu','fri','sat','sun']},
   lastSync:{date:'Today 12:00 AM',status:'success',added:43,updated:187,removed:5,errors:0,duration:'4m 12s'},
   totalProducts:12400,syncCount:847,
   dataFields:['name','sku','categories','price_tiers','colors','sizes','imprint_methods','images','production_time']},
  {id:2,type:'sanmar',name:'SanMar',active:true,connected:true,method:'api',color:'#1E40AF',icon:'👕',
   creds:{api_key:'••••••••••••••••',account_id:'SAN-48291',endpoint:'https://api.sanmar.com/promostandards/'},
   schedule:{enabled:true,time:'00:30',days:['mon','wed','fri']},
   lastSync:{date:'Today 12:30 AM',status:'success',added:12,updated:94,removed:2,errors:0,duration:'2m 38s'},
   totalProducts:8200,syncCount:312,
   dataFields:['name','sku','style','color','size','warehouse_qty','price','weight']},
  {id:3,type:'custom_web',name:'Hanes Wholesale',active:false,connected:true,method:'web',color:'#DC2626',icon:'🎽',
   creds:{login_url:'https://www.haneswholesale.com/login',username:'peregrine@peregrinesolutions.com',password:'••••••••',selector_username:'#email',selector_password:'#password',selector_submit:'button[type=submit]'},
   schedule:{enabled:false,time:'01:30',days:['mon']},
   lastSync:{date:'May 1, 2026',status:'warning',added:0,updated:31,removed:0,errors:4,duration:'8m 55s'},
   totalProducts:340,syncCount:28,
   dataFields:['name','sku','price','colors','sizes']},
  {id:4,type:'sns',name:'S&S Activewear',active:false,connected:false,method:'api',color:'#059669',icon:'⚡',
   creds:{api_key:'',account_id:'',endpoint:'https://api.ssactivewear.com/v2/'},
   schedule:{enabled:false,time:'01:00',days:['mon','thu']},
   lastSync:null,totalProducts:0,syncCount:0,
   dataFields:['name','sku','color','size','qty_available','price']},
];

const DAYS_V=['sun','mon','tue','wed','thu','fri','sat'];
const DAY_LBL={sun:'Su',mon:'Mo',tue:'Tu',wed:'We',thu:'Th',fri:'Fr',sat:'Sa'};

const SYNC_LOGS=[
  {vendor:'ASI ESP+',date:'Today 12:00 AM',status:'success',added:43,updated:187,removed:5,errors:0,duration:'4m 12s'},
  {vendor:'SanMar',date:'Today 12:30 AM',status:'success',added:12,updated:94,removed:2,errors:0,duration:'2m 38s'},
  {vendor:'ASI ESP+',date:'Yesterday 12:00 AM',status:'success',added:8,updated:201,removed:1,errors:0,duration:'3m 58s'},
  {vendor:'Hanes',date:'May 1, 2026',status:'warning',added:0,updated:31,removed:0,errors:4,duration:'8m 55s'},
  {vendor:'SanMar',date:'Apr 30, 2026',status:'success',added:5,updated:88,removed:0,errors:0,duration:'2m 14s'},
];

function VendorSync() {
  const [vendors,  setVendors]  = useState(INIT_VENDORS);
  const [selV,     setSelV]     = useState(1);
  const [vtab,     setVtab]     = useState('connections');
  const [syncing,  setSyncing]  = useState({});
  const [pct,      setPct]      = useState({});
  const [testR,    setTestR]    = useState({});
  const [addStep,  setAddStep]  = useState(1);
  const [addType,  setAddType]  = useState(null);
  const [addForm,  setAddForm]  = useState({name:'',time:'00:00',days:['mon','tue','wed','thu','fri','sat','sun']});
  const [addDone,  setAddDone]  = useState(false);
  const [saved,    setSaved]    = useState({});

  const v = vendors.find(x=>x.id===selV);

  const vtabBtn = t => ({padding:'8px 16px',borderRadius:7,fontSize:12,fontWeight:vtab===t?600:400,cursor:'pointer',border:'none',whiteSpace:'nowrap',background:vtab===t?'#1E1E2C':'transparent',color:vtab===t?T.acc:T.sec,transition:'all .12s'});

  const runSync = id => {
    setSyncing(s=>({...s,[id]:true})); setPct(p=>({...p,[id]:0}));
    const iv=setInterval(()=>{
      setPct(p=>{
        const cur=p[id]||0;
        if(cur>=100){
          clearInterval(iv); setSyncing(s=>({...s,[id]:false}));
          setVendors(vs=>vs.map(x=>x.id===id?{...x,lastSync:{date:'Just now',status:'success',added:Math.floor(Math.random()*50),updated:Math.floor(Math.random()*200)+50,removed:Math.floor(Math.random()*8),errors:0,duration:'3m 42s'}}:x));
          return {...p,[id]:100};
        }
        return {...p,[id]:Math.min(100,cur+Math.random()*9)};
      });
    },180);
  };

  const testConn = id => {
    setTestR(r=>({...r,[id]:'testing'}));
    setTimeout(()=>setTestR(r=>({...r,[id]:'ok'})),1800);
    setTimeout(()=>setTestR(r=>({...r,[id]:null})),5000);
  };

  const saveV    = id => { setSaved(s=>({...s,[id]:true})); setTimeout(()=>setSaved(s=>({...s,[id]:false})),2000); };
  const toggleV  = id => setVendors(vs=>vs.map(x=>x.id===id?{...x,active:!x.active}:x));
  const toggleDay= (id,d) => setVendors(vs=>vs.map(x=>x.id===id?{...x,schedule:{...x.schedule,days:x.schedule.days.includes(d)?x.schedule.days.filter(y=>y!==d):[...x.schedule.days,d]}}:x));
  const addDay   = d => setAddForm(f=>({...f,days:f.days.includes(d)?f.days.filter(x=>x!==d):[...f.days,d]}));

  const completeAdd = () => {
    const type=VENDOR_TYPES_V.find(t=>t.id===addType);
    setVendors(vs=>[...vs,{id:Math.max(...vs.map(x=>x.id))+1,type:addType,name:addForm.name||type?.label,active:true,connected:false,method:type?.method||'api',color:type?.color||T.sec,icon:type?.icon||'📦',creds:{},schedule:{enabled:true,time:addForm.time,days:addForm.days},lastSync:null,totalProducts:0,syncCount:0,dataFields:['name','sku','price']}]);
    setAddDone(true);
  };

  const SC={success:T.ok,warning:T.acc,error:T.bad};

  return <div style={{display:'flex',height:'100%',flexDirection:'column'}}>
    {/* Sub-header */}
    <div style={{background:'#0E0E17',borderBottom:`1px solid ${T.border}`,padding:'0 22px',height:46,display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
      <div style={{display:'flex',gap:6}}>
        <span style={{fontSize:11,background:T.oD,color:T.ok,borderRadius:5,padding:'2px 8px',fontWeight:700,border:`1px solid ${T.ok}25`}}>{vendors.filter(v=>v.active&&v.connected).length} connected</span>
        <span style={{fontSize:11,background:T.iD,color:T.inf,borderRadius:5,padding:'2px 8px',fontWeight:700,border:`1px solid ${T.inf}25`}}>{vendors.reduce((s,x)=>s+x.totalProducts,0).toLocaleString()} products tracked</span>
      </div>
      <div style={{display:'flex',gap:2}}>
        {[['connections','Vendors'],['scheduler','Scheduler'],['logs','Sync Logs'],['add','+ Add Vendor'],['mapping','Field Mapping']].map(([k,l])=>(
          <button key={k} style={vtabBtn(k)} onClick={()=>{setVtab(k);if(k==='add'){setAddStep(1);setAddType(null);setAddDone(false);}}}>{l}</button>
        ))}
      </div>
    </div>

    <div style={{flex:1,overflow:'auto'}}>

      {/* ── VENDOR CONNECTIONS ── */}
      {vtab==='connections'&&<div style={{display:'flex',height:'100%'}}>
        {/* Sidebar list */}
        <div style={{width:250,borderRight:`1px solid ${T.border}`,padding:'12px 10px',display:'flex',flexDirection:'column',gap:6,overflow:'auto',flexShrink:0}}>
          {vendors.map(x=>(
            <div key={x.id} onClick={()=>setSelV(x.id)} style={{padding:'11px 12px',borderRadius:10,cursor:'pointer',border:`1px solid ${selV===x.id?`${PER}50`:T.border}`,background:selV===x.id?'#131110':'transparent',transition:'all .12s',opacity:x.active?1:0.5}}>
              <div style={{display:'flex',alignItems:'center',gap:9,marginBottom:4}}>
                <div style={{width:32,height:32,borderRadius:8,background:`${x.color}20`,border:`1px solid ${x.color}30`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>{x.icon}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:600,color:T.txt,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{x.name}</div>
                  <div style={{display:'flex',gap:6,marginTop:2}}>
                    <span style={{fontSize:10,color:x.method==='api'?T.ok:T.pur,fontWeight:600}}>{x.method==='api'?'API':'Web'}</span>
                    <span style={{fontSize:10,color:x.connected?T.ok:T.dim}}>{x.connected?'● Connected':'○ Not set up'}</span>
                  </div>
                </div>
              </div>
              {syncing[x.id]?(
                <div style={{marginTop:4}}>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:T.sec,marginBottom:2}}><span>Syncing…</span><span>{Math.round(pct[x.id]||0)}%</span></div>
                  <div style={{height:3,background:T.b2,borderRadius:2}}><div style={{height:3,background:PER,borderRadius:2,width:`${Math.min(100,pct[x.id]||0)}%`,transition:'width .2s'}}/></div>
                </div>
              ):x.lastSync?(
                <div style={{display:'flex',justifyContent:'space-between',marginTop:3}}>
                  <span style={{fontSize:10,color:T.dim}}>{x.lastSync.date}</span>
                  <span style={{fontSize:10,fontWeight:600,color:SC[x.lastSync.status]||T.sec}}>{x.lastSync.status}</span>
                </div>
              ):<div style={{fontSize:10,color:T.dim,marginTop:3}}>Never synced</div>}
            </div>
          ))}
          <button onClick={()=>{setVtab('add');setAddStep(1);setAddType(null);setAddDone(false);}} style={{marginTop:4,padding:'9px 0',background:PER,border:'none',borderRadius:9,color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer'}}>+ Add Vendor</button>
        </div>

        {/* Vendor detail */}
        {v&&<div style={{flex:1,overflow:'auto',padding:22}}>
          {/* Header */}
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:18}}>
            <div style={{display:'flex',gap:12,alignItems:'center'}}>
              <div style={{width:46,height:46,borderRadius:12,background:`${v.color}20`,border:`1px solid ${v.color}30`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>{v.icon}</div>
              <div>
                <div style={{fontSize:17,fontWeight:700,marginBottom:4}}>{v.name}</div>
                <div style={{display:'flex',gap:8}}>
                  <span style={{fontSize:11,fontWeight:600,background:v.method==='api'?T.oD:T.pD,color:v.method==='api'?T.ok:T.pur,borderRadius:5,padding:'2px 8px'}}>{v.method==='api'?'API Integration':'Web Login / Headless Browser'}</span>
                  <span style={{fontSize:11,fontWeight:600,color:v.connected?T.ok:T.dim}}>{v.connected?'✓ Credentials saved':'⚠ Credentials needed'}</span>
                </div>
              </div>
            </div>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              {saved[v.id]&&<span style={{fontSize:12,color:T.ok,fontWeight:600}}>✓ Saved</span>}
              <div onClick={()=>toggleV(v.id)} style={{width:40,height:22,borderRadius:11,background:v.active?`${T.ok}33`:'#1C1C28',border:`1px solid ${v.active?T.ok:T.b2}`,cursor:'pointer',position:'relative'}}>
                <div style={{position:'absolute',top:3,left:v.active?19:3,width:14,height:14,borderRadius:'50%',background:v.active?T.ok:T.dim,transition:'left .2s'}}/>
              </div>
              <button onClick={()=>testConn(v.id)} style={{padding:'7px 14px',background:T.iD,border:`1px solid ${T.inf}30`,borderRadius:7,color:T.inf,fontSize:12,fontWeight:600,cursor:'pointer'}}>
                {testR[v.id]==='testing'?'Testing…':testR[v.id]==='ok'?'✓ Connected':'Test Connection'}
              </button>
              <button onClick={()=>runSync(v.id)} disabled={!!syncing[v.id]} style={{padding:'7px 18px',background:PER,border:'none',borderRadius:7,color:'#fff',fontSize:12,fontWeight:700,cursor:syncing[v.id]?'default':'pointer',opacity:syncing[v.id]?0.65:1}}>
                {syncing[v.id]?`Syncing ${Math.round(pct[v.id]||0)}%`:'Sync Now'}
              </button>
            </div>
          </div>

          {syncing[v.id]&&<div style={{...card({background:T.iD,border:`1px solid ${T.inf}30`,marginBottom:14})}}>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:T.inf,marginBottom:6}}><span>Fetching from {v.name}…</span><span style={{fontWeight:700}}>{Math.round(pct[v.id]||0)}%</span></div>
            <div style={{height:5,background:T.b2,borderRadius:3}}><div style={{height:5,background:T.inf,borderRadius:3,width:`${Math.min(100,pct[v.id]||0)}%`,transition:'width .2s'}}/></div>
            <div style={{fontSize:11,color:T.sec,marginTop:6}}>Pulling names, SKUs, pricing tiers, colors, sizes, images…</div>
          </div>}

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
            {/* Stats */}
            <div style={card()}>
              <div style={{fontSize:11,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:T.dim,marginBottom:12}}>Sync Stats</div>
              {[['Products Tracked',v.totalProducts.toLocaleString()],['Sync Runs',v.syncCount.toString()],['Last Run',v.lastSync?.date||'Never'],['Last Status',v.lastSync?.status||'—']].map(([l,val])=>(
                <div key={l} style={{display:'flex',justifyContent:'space-between',fontSize:12,padding:'7px 0',borderBottom:`1px solid ${T.border}`}}>
                  <span style={{color:T.sec}}>{l}</span><span style={{color:T.txt,fontWeight:500}}>{val}</span>
                </div>
              ))}
              {v.lastSync&&<div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6,marginTop:10}}>
                {[['Added',v.lastSync.added,T.ok],['Updated',v.lastSync.updated,T.inf],['Removed',v.lastSync.removed,T.acc],['Errors',v.lastSync.errors,v.lastSync.errors>0?T.bad:T.dim]].map(([l,val,c])=>(
                  <div key={l} style={{background:T.bg,borderRadius:7,padding:'7px 0',textAlign:'center',border:`1px solid ${T.b2}`}}>
                    <div style={{fontSize:15,fontWeight:700,color:c}}>{val}</div>
                    <div style={{fontSize:10,color:T.dim,marginTop:1}}>{l}</div>
                  </div>
                ))}
              </div>}
            </div>
            {/* Data fields */}
            <div style={card()}>
              <div style={{fontSize:11,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:T.dim,marginBottom:12}}>Fields Being Synced</div>
              <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                {v.dataFields.map(f=><span key={f} style={{fontSize:11,background:T.bg,border:`1px solid ${T.b2}`,borderRadius:5,padding:'3px 8px',color:T.sec,fontFamily:'monospace'}}>{f}</span>)}
              </div>
            </div>
          </div>

          {/* Credentials */}
          <div style={card()}>
            <div style={{fontSize:13,fontWeight:600,marginBottom:14}}>
              {v.method==='api'?'🔑 API Credentials':'🔐 Web Login Credentials'}
            </div>

            {v.method==='web'&&<div style={{...card({background:T.pD,border:`1px solid ${T.pur}30`,marginBottom:14})}}>
              <div style={{fontSize:12,fontWeight:600,color:T.pur,marginBottom:4}}>How web login works</div>
              <div style={{fontSize:11,color:T.sec,lineHeight:1.7}}>A headless Playwright browser session logs in to the vendor site at the scheduled time, navigates the product catalog, and extracts data. Credentials are AES-256 encrypted at rest. Right-click the login form on the vendor site → Inspect to find CSS selectors.</div>
            </div>}

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              {Object.entries(v.creds).map(([key,val])=>(
                <div key={key}>
                  <label style={T.lbl||lbl}>{key.replace(/_/g,' ')}</label>
                  <input style={inp()} type={key.includes('key')||key.includes('password')||key.includes('secret')?'password':'text'} defaultValue={val} placeholder={key==='login_url'?'https://vendor.com/login':key.includes('selector')?'e.g. #username':key}/>
                </div>
              ))}
            </div>
            <div style={{display:'flex',gap:8,marginTop:14}}>
              <button onClick={()=>saveV(v.id)} style={{background:T.acc,border:'none',borderRadius:7,color:'#0B0B12',fontSize:13,fontWeight:700,cursor:'pointer',padding:'9px 20px'}}>Save Credentials</button>
              <button onClick={()=>testConn(v.id)} style={{padding:'9px 16px',background:T.iD,border:`1px solid ${T.inf}30`,borderRadius:7,color:T.inf,fontSize:12,fontWeight:600,cursor:'pointer'}}>Test Connection</button>
            </div>
          </div>

          {/* Schedule for this vendor */}
          <div style={{...card({marginTop:14})}}>
            <div style={{fontSize:13,fontWeight:600,marginBottom:14}}>Sync Schedule</div>
            <div style={{display:'grid',gridTemplateColumns:'140px 1fr',gap:12}}>
              <div>
                <label style={lbl}>Run Time</label>
                <input style={inp()} type="time" value={v.schedule.time} onChange={e=>setVendors(vs=>vs.map(x=>x.id===v.id?{...x,schedule:{...x.schedule,time:e.target.value}}:x))}/>
              </div>
              <div>
                <label style={lbl}>Days</label>
                <div style={{display:'flex',gap:5}}>
                  {DAYS_V.map(d=>(
                    <div key={d} onClick={()=>toggleDay(v.id,d)} style={{width:32,height:32,borderRadius:7,background:v.schedule.days.includes(d)?v.color:'#1C1C28',color:v.schedule.days.includes(d)?'#fff':T.dim,border:`1px solid ${v.schedule.days.includes(d)?v.color:T.b2}`,fontSize:10,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',transition:'all .12s'}}>
                      {DAY_LBL[d]}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>}
      </div>}

      {/* ── SCHEDULER OVERVIEW ── */}
      {vtab==='scheduler'&&<div style={{padding:22}}>
        <div style={{...card({background:T.iD,border:`1px solid ${T.inf}30`,marginBottom:18})}}>
          <div style={{fontSize:13,fontWeight:600,color:T.inf,marginBottom:4}}>Midnight Sync Window</div>
          <div style={{fontSize:12,color:T.sec,lineHeight:1.7}}>All vendor syncs run in the midnight window, staggered by 30 minutes so they don't overlap. ESP+ runs first at 12:00 AM because it's the largest catalog. Stagger others after. The server cron job triggers each sync automatically — no manual action needed once credentials are saved.</div>
        </div>
        <div style={{...card({marginBottom:18})}}>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:T.dim,marginBottom:14}}>Tonight's Schedule</div>
          {vendors.filter(x=>x.schedule.enabled).map(x=>{
            const [h,m]=x.schedule.time.split(':').map(Number);
            const leftPct=((h*60+m)/(3*60))*100;
            return <div key={x.id} style={{display:'flex',alignItems:'center',gap:12,marginBottom:10}}>
              <div style={{width:110,fontSize:11,color:T.sec,textAlign:'right',flexShrink:0}}>{x.name}</div>
              <div style={{flex:1,position:'relative',height:26}}>
                <div style={{position:'absolute',left:`${Math.min(leftPct,90)}%`,top:0,background:`${x.color}25`,border:`1.5px solid ${x.color}`,borderRadius:7,padding:'3px 10px',whiteSpace:'nowrap',fontSize:11,fontWeight:600,color:x.color}}>{x.schedule.time}</div>
              </div>
            </div>;
          })}
          <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:T.dim,marginTop:10,borderTop:`1px solid ${T.border}`,paddingTop:8}}>
            {['12:00 AM','12:30','1:00','1:30','2:00','2:30','3:00 AM'].map(t=><span key={t}>{t}</span>)}
          </div>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {vendors.map(x=>(
            <div key={x.id} style={{...card(),border:`1px solid ${x.schedule.enabled?`${x.color}30`:T.border}`,opacity:x.active?1:0.5}}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:x.schedule.enabled?14:0}}>
                <div style={{width:34,height:34,borderRadius:8,background:`${x.color}20`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>{x.icon}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600}}>{x.name}</div>
                  <div style={{fontSize:11,color:T.dim}}>{x.schedule.enabled?`${x.schedule.time} · ${x.schedule.days.map(d=>DAY_LBL[d]).join(' ')}·`:'Disabled'}</div>
                </div>
                <div onClick={()=>setVendors(vs=>vs.map(y=>y.id===x.id?{...y,schedule:{...y.schedule,enabled:!y.schedule.enabled}}:y))}
                  style={{width:40,height:22,borderRadius:11,background:x.schedule.enabled?`${T.ok}33`:'#1C1C28',border:`1px solid ${x.schedule.enabled?T.ok:T.b2}`,cursor:'pointer',position:'relative',flexShrink:0}}>
                  <div style={{position:'absolute',top:3,left:x.schedule.enabled?19:3,width:14,height:14,borderRadius:'50%',background:x.schedule.enabled?T.ok:T.dim,transition:'left .2s'}}/>
                </div>
              </div>
              {x.schedule.enabled&&<div style={{display:'grid',gridTemplateColumns:'140px 1fr',gap:10}}>
                <div><label style={lbl}>Time</label><input style={inp()} type="time" value={x.schedule.time} onChange={e=>setVendors(vs=>vs.map(y=>y.id===x.id?{...y,schedule:{...y.schedule,time:e.target.value}}:y))}/></div>
                <div><label style={lbl}>Days</label><div style={{display:'flex',gap:5}}>{DAYS_V.map(d=><div key={d} onClick={()=>toggleDay(x.id,d)} style={{width:30,height:30,borderRadius:7,background:x.schedule.days.includes(d)?x.color:'#1C1C28',color:x.schedule.days.includes(d)?'#fff':T.dim,border:`1px solid ${x.schedule.days.includes(d)?x.color:T.b2}`,fontSize:10,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>{DAY_LBL[d]}</div>)}</div></div>
              </div>}
            </div>
          ))}
        </div>
      </div>}

      {/* ── LOGS ── */}
      {vtab==='logs'&&<div style={{padding:22}}>
        <div style={{...card({overflow:'hidden',padding:0})}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr>{['Vendor','Date','Status','Added','Updated','Removed','Errors','Duration'].map(h=>(
              <th key={h} style={{textAlign:'left',fontSize:10,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:T.dim,padding:'11px 14px',borderBottom:`1px solid ${T.border}`}}>{h}</th>
            ))}</tr></thead>
            <tbody>
              {SYNC_LOGS.map((log,i)=>{
                const sc=SC[log.status]||T.sec;
                return <tr key={i} style={{borderBottom:i<SYNC_LOGS.length-1?`1px solid ${T.border}`:'none'}}>
                  <td style={{padding:'11px 14px',fontSize:13,fontWeight:500}}>{log.vendor}</td>
                  <td style={{padding:'11px 14px',fontSize:11,color:T.sec}}>{log.date}</td>
                  <td style={{padding:'11px 14px'}}><span style={{fontSize:11,fontWeight:600,background:`${sc}15`,color:sc,borderRadius:5,padding:'2px 8px'}}>{log.status}</span></td>
                  <td style={{padding:'11px 14px',fontSize:12,color:T.ok}}>+{log.added}</td>
                  <td style={{padding:'11px 14px',fontSize:12,color:T.inf}}>{log.updated}</td>
                  <td style={{padding:'11px 14px',fontSize:12,color:T.acc}}>{log.removed}</td>
                  <td style={{padding:'11px 14px',fontSize:12,color:log.errors>0?T.bad:T.dim}}>{log.errors}</td>
                  <td style={{padding:'11px 14px',fontSize:12,color:T.sec}}>{log.duration}</td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      </div>}

      {/* ── ADD VENDOR ── */}
      {vtab==='add'&&<div style={{padding:22,maxWidth:860,margin:'0 auto'}}>
        {addDone?(
          <div style={{...card({textAlign:'center',padding:48})}}>
            <div style={{fontSize:38,marginBottom:12}}>✅</div>
            <div style={{fontSize:18,fontWeight:700,color:T.ok,marginBottom:6}}>Vendor Added!</div>
            <div style={{fontSize:13,color:T.sec,marginBottom:20}}>Go to Vendor Connections to enter credentials, test the connection, and run your first sync.</div>
            <div style={{display:'flex',gap:10,justifyContent:'center'}}>
              <button onClick={()=>{setVtab('connections');setSelV(vendors[vendors.length-1]?.id||1);}} style={{background:PER,border:'none',borderRadius:8,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',padding:'10px 24px'}}>Enter Credentials →</button>
              <button onClick={()=>{setAddDone(false);setAddStep(1);setAddType(null);}} style={{background:'#1C1C28',border:'none',borderRadius:8,color:T.sec,cursor:'pointer',padding:'10px 20px',fontSize:13}}>Add Another</button>
            </div>
          </div>
        ):(
          <>
            <div style={{display:'flex',alignItems:'center',marginBottom:22,maxWidth:500}}>
              {['Choose Type','Credentials','Schedule'].map((s,i)=>{
                const done=addStep>i+1,cur=addStep===i+1,last=i===2;
                return <div key={s} style={{display:'flex',alignItems:'center',flex:last?'none':1}}>
                  <div style={{display:'flex',flexDirection:'column',alignItems:'center',minWidth:76}}>
                    <div style={{width:26,height:26,borderRadius:'50%',background:done?T.ok:cur?PER:T.b2,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:done||cur?'#fff':T.dim,marginBottom:4}}>{done?'✓':i+1}</div>
                    <div style={{fontSize:9,fontWeight:600,color:done?T.ok:cur?PER:T.dim}}>{s}</div>
                  </div>
                  {!last&&<div style={{flex:1,height:2,background:done?T.ok:T.b2,margin:'0 6px 18px',borderRadius:2}}/>}
                </div>;
              })}
            </div>

            {addStep===1&&<>
              <div style={{fontSize:13,fontWeight:600,marginBottom:14}}>What kind of vendor are you adding?</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:18}}>
                {VENDOR_TYPES_V.map(type=>(
                  <div key={type.id} onClick={()=>setAddType(type.id)} style={{...card(),cursor:'pointer',border:`2px solid ${addType===type.id?type.color:T.border}`,background:addType===type.id?`${type.color}08`:'transparent',transition:'all .12s'}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                      <span style={{fontSize:20}}>{type.icon}</span>
                      <div>
                        <div style={{fontSize:12,fontWeight:600,color:addType===type.id?type.color:T.txt}}>{type.label}</div>
                        <span style={{fontSize:10,fontWeight:600,color:type.method==='api'?T.ok:T.pur,background:type.method==='api'?T.oD:T.pD,borderRadius:4,padding:'1px 6px'}}>{type.method==='api'?'API':'Web Login'}</span>
                      </div>
                    </div>
                    <div style={{fontSize:11,color:T.dim,lineHeight:1.5}}>{type.desc}</div>
                  </div>
                ))}
              </div>
              {addType==='custom_web'&&<div style={{...card({background:T.pD,border:`1px solid ${T.pur}30`,marginBottom:14})}}>
                <div style={{fontSize:12,fontWeight:600,color:T.pur,marginBottom:4}}>Web Scraping — How it works</div>
                <div style={{fontSize:11,color:T.sec,lineHeight:1.7}}>Playwright (headless Chromium) logs in to the vendor site using your credentials, navigates to the product catalog pages, and extracts product data. You need to provide the login URL, username, password, and the CSS selectors for the form fields. Your developer can right-click the form fields on the vendor site → Inspect Element to find the selectors. This works on any vendor site regardless of whether they have an API.</div>
              </div>}
            </>}

            {addStep===2&&<div style={card()}>
              <div style={{fontSize:13,fontWeight:600,marginBottom:14}}>Vendor Details</div>
              <div style={{marginBottom:12}}><label style={lbl}>Display Name</label><input style={inp()} placeholder={VENDOR_TYPES_V.find(t=>t.id===addType)?.label||'Vendor name'} value={addForm.name} onChange={e=>setAddForm(f=>({...f,name:e.target.value}))}/></div>
              {VENDOR_TYPES_V.find(t=>t.id===addType)?.method==='api'?(
                <>
                  <div style={{marginBottom:12}}><label style={lbl}>API Endpoint</label><input style={inp()} placeholder="https://api.vendor.com/v1/" value={addForm.endpoint||''} onChange={e=>setAddForm(f=>({...f,endpoint:e.target.value}))}/></div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                    <div><label style={lbl}>Account ID</label><input style={inp()} placeholder="Your account number" value={addForm.account||''} onChange={e=>setAddForm(f=>({...f,account:e.target.value}))}/></div>
                    <div><label style={lbl}>API Key</label><input style={inp()} type="password" placeholder="Your API key" value={addForm.apiKey||''} onChange={e=>setAddForm(f=>({...f,apiKey:e.target.value}))}/></div>
                  </div>
                </>
              ):(
                <>
                  <div style={{marginBottom:12}}><label style={lbl}>Login Page URL</label><input style={inp()} placeholder="https://vendor.com/login" value={addForm.loginUrl||''} onChange={e=>setAddForm(f=>({...f,loginUrl:e.target.value}))}/></div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                    <div><label style={lbl}>Username / Email</label><input style={inp()} placeholder="your@email.com" value={addForm.username||''} onChange={e=>setAddForm(f=>({...f,username:e.target.value}))}/></div>
                    <div><label style={lbl}>Password</label><input style={inp()} type="password" placeholder="••••••••" value={addForm.password||''} onChange={e=>setAddForm(f=>({...f,password:e.target.value}))}/></div>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                    <div><label style={lbl}>Username Field Selector</label><input style={inp()} placeholder="#email or input[name=username]" value={addForm.selUser||''} onChange={e=>setAddForm(f=>({...f,selUser:e.target.value}))}/></div>
                    <div><label style={lbl}>Password Field Selector</label><input style={inp()} placeholder="#password or input[type=password]" value={addForm.selPass||''} onChange={e=>setAddForm(f=>({...f,selPass:e.target.value}))}/></div>
                  </div>
                </>
              )}
            </div>}

            {addStep===3&&<div style={card()}>
              <div style={{fontSize:13,fontWeight:600,marginBottom:14}}>Sync Schedule</div>
              <div style={{display:'grid',gridTemplateColumns:'140px 1fr',gap:12,marginBottom:14}}>
                <div><label style={lbl}>Run Time</label><input style={inp()} type="time" value={addForm.time} onChange={e=>setAddForm(f=>({...f,time:e.target.value}))}/><div style={{fontSize:10,color:T.dim,marginTop:4}}>Stagger 30min from others</div></div>
                <div><label style={lbl}>Days of Week</label><div style={{display:'flex',gap:6}}>{DAYS_V.map(d=><div key={d} onClick={()=>addDay(d)} style={{width:32,height:32,borderRadius:7,background:addForm.days.includes(d)?PER:'#1C1C28',color:addForm.days.includes(d)?'#fff':T.dim,border:`1px solid ${addForm.days.includes(d)?PER:T.b2}`,fontSize:10,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>{DAY_LBL[d]}</div>)}</div></div>
              </div>
              <div style={{...card({background:T.oD,border:`1px solid ${T.ok}30`})}}>
                <div style={{fontSize:11,fontWeight:600,color:T.ok,marginBottom:4}}>💡 Recommended staggering</div>
                <div style={{fontSize:11,color:T.sec,lineHeight:1.65}}>ESP+ → 12:00 AM · SanMar → 12:30 AM · Other vendors → 1:00 AM, 1:30 AM, etc. All syncs complete before your team arrives in the morning.</div>
              </div>
            </div>}

            <div style={{display:'flex',justifyContent:'space-between',marginTop:16}}>
              <button onClick={()=>setAddStep(s=>Math.max(1,s-1))} disabled={addStep===1} style={{padding:'9px 22px',background:'#1C1C28',border:'none',borderRadius:8,color:T.sec,fontSize:13,cursor:addStep===1?'default':'pointer',opacity:addStep===1?0.4:1}}>← Back</button>
              {addStep<3
                ?<button onClick={()=>addType&&setAddStep(s=>s+1)} style={{padding:'9px 24px',background:addType?PER:'#1C1C28',border:'none',borderRadius:8,color:addType?'#fff':T.dim,fontSize:13,fontWeight:700,cursor:addType?'pointer':'default'}}>Next →</button>
                :<button onClick={completeAdd} style={{padding:'9px 24px',background:T.ok,border:'none',borderRadius:8,color:'#0B0B12',fontSize:13,fontWeight:700,cursor:'pointer'}}>Add Vendor ✓</button>
              }
            </div>
          </>
        )}
      </div>}

      {/* ── FIELD MAPPING ── */}
      {vtab==='mapping'&&<div style={{padding:22}}>
        <div style={{...card({background:T.iD,border:`1px solid ${T.inf}30`,marginBottom:16})}}>
          <div style={{fontSize:13,fontWeight:600,color:T.inf,marginBottom:4}}>Universal Product Schema</div>
          <div style={{fontSize:12,color:T.sec,lineHeight:1.7}}>Every vendor returns slightly different field names. The mapping layer normalizes all incoming data into your standard schema before writing to the database. Your catalog, pricing engine, and customer portals always see consistent data regardless of vendor source.</div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14}}>
          {[
            {title:'Your DB Column',color:T.acc,items:['name','sku','description','category','price_tiers','colors','sizes','images','min_qty','production_days','active']},
            {title:'ASI ESP+ Field',color:'#E37400',items:['ProductName','ItemNumber','Description','Category.Primary','Prices[]','Colors[]','Sizes[]','ProductImages[]','MinQty','ProductionTime','IsConfirmed']},
            {title:'SanMar Field',color:'#1E40AF',items:['productName','sku','description','categoryName','wholeSalePrice','colorName','sizeName','productImage','minimumQty','shipFromDate','status']},
          ].map(col=>(
            <div key={col.title} style={card()}>
              <div style={{fontSize:11,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:col.color,marginBottom:12}}>{col.title}</div>
              {col.items.map(f=><div key={f} style={{padding:'7px 9px',background:T.bg,borderRadius:6,marginBottom:5,border:`1px solid ${T.b2}`}}><code style={{fontSize:11,color:col.color}}>{f}</code></div>)}
            </div>
          ))}
        </div>
        <div style={{...card({marginTop:14,background:T.aD,border:`1px solid ${T.acc}30`})}}>
          <div style={{fontSize:12,fontWeight:600,color:T.acc,marginBottom:4}}>Price Tiers — stored as JSON array</div>
          <div style={{fontSize:12,color:T.sec,lineHeight:1.7}}>All vendor price breaks normalize to: <code style={{color:T.acc,background:T.bg,borderRadius:4,padding:'1px 6px',fontSize:11}}>[{"{"}qty:144,price:0.55{"}"},{"{"}qty:288,price:0.49{"}"},{"{"}qty:500,price:0.43{"}"}]</code> — the portal reads this array and shows the correct per-unit price automatically based on quantity entered. Your markup applies on top.</div>
        </div>
      </div>}

    </div>
  </div>;
}
