import { useState, useEffect } from 'react';

const PER  = '#DA532C';
const DARK = '#B8421E';

// ─── API CLIENT ───────────────────────────────────────────────────────────────
export const api = {
  token: ()  => localStorage.getItem('pg_tok'),
  set:   (t) => localStorage.setItem('pg_tok', t),
  clear: ()  => localStorage.removeItem('pg_tok'),
  async req(method, url, body, raw=false) {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${this.token()||''}` },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (raw) return res;
    const data = await res.json().catch(()=>({}));
    if (!res.ok) throw new Error(data.error || `${res.status} ${res.statusText}`);
    return data;
  },
  get:    (u)    => api.req('GET',    u),
  post:   (u, b) => api.req('POST',   u, b),
  put:    (u, b) => api.req('PUT',    u, b),
  delete: (u)    => api.req('DELETE', u),
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const s = (styles) => styles;
const inp = (extra={}) => ({
  width:'100%', boxSizing:'border-box', padding:'11px 14px',
  borderRadius:9, border:'1px solid #E0E0DC', fontSize:14,
  outline:'none', fontFamily:'inherit', ...extra,
});

// ─── LOADING SCREEN ───────────────────────────────────────────────────────────
function Loading({ message = 'Loading…' }) {
  return (
    <div style={{ minHeight:'100vh', background:'#0B0B12', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16, fontFamily:"'Helvetica Neue',Arial,sans-serif" }}>
      <div style={{ width:52, height:52, background:PER, borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, fontWeight:900, color:'#fff' }}>P</div>
      <div style={{ fontSize:14, color:'#666680' }}>{message}</div>
    </div>
  );
}

// ─── LOGIN SCREEN ─────────────────────────────────────────────────────────────
function Login({ isPortal, subdomain, branding, onLogin }) {
  const [email, setEmail]   = useState('');
  const [pass,  setPass]    = useState('');
  const [error, setError]   = useState('');
  const [busy,  setBusy]    = useState(false);

  const primary = branding?.primary_color || PER;

  const submit = async (e) => {
    e.preventDefault(); setError(''); setBusy(true);
    try {
      const ep = isPortal ? '/api/auth/customer/login' : '/api/auth/staff/login';
      const body = isPortal ? { email, password:pass, subdomain } : { email, password:pass };
      const { token, user } = await api.post(ep, body);
      api.set(token);
      onLogin({ ...user, userType: isPortal ? 'customer' : 'staff' });
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const bg     = isPortal ? '#F5F4F0' : '#0B0B12';
  const cardBg = isPortal ? '#fff' : '#111119';
  const border = isPortal ? '1px solid #EBEBEB' : '1px solid #1C1C28';
  const lc     = isPortal ? '#888' : '#666680';
  const tc     = isPortal ? '#111' : '#E4E4EF';

  return (
    <div style={{ minHeight:'100vh', background:bg, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Helvetica Neue',Arial,sans-serif" }}>
      <div style={{ width:400, background:cardBg, borderRadius:18, padding:44, boxShadow:'0 24px 80px rgba(0,0,0,0.18)', border }}>
        <div style={{ textAlign:'center', marginBottom:36 }}>
          {branding?.logo_url
            ? <img src={branding.logo_url} alt="logo" style={{ height:52, marginBottom:14, objectFit:'contain' }} />
            : <div style={{ width:56, height:56, background:primary, borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, fontWeight:900, color:'#fff', margin:'0 auto 14px' }}>{branding?.logo_text || 'P'}</div>
          }
          <div style={{ fontSize:22, fontWeight:700, color:tc }}>
            {isPortal ? (branding?.company_name || 'Customer Portal') : 'Peregrine Solutions'}
          </div>
          <div style={{ fontSize:13, color:lc, marginTop:5 }}>
            {isPortal ? 'Sign in to your account' : 'Admin Dashboard'}
          </div>
        </div>

        <form onSubmit={submit}>
          {error && (
            <div style={{ background:'#FEE2E2', border:'1px solid #FECACA', borderRadius:9, padding:'11px 14px', fontSize:13, color:'#B91C1C', marginBottom:18 }}>
              {error}
            </div>
          )}
          <div style={{ marginBottom:18 }}>
            <label style={{ display:'block', fontSize:11, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:lc, marginBottom:7 }}>Email Address</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoFocus
              style={{ ...inp(), background: isPortal?'#fff':'#0B0B12', color:tc, border: isPortal?'1px solid #E0E0DC':'1px solid #252535' }}
              placeholder="your@email.com" />
          </div>
          <div style={{ marginBottom:28 }}>
            <label style={{ display:'block', fontSize:11, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:lc, marginBottom:7 }}>Password</label>
            <input type="password" value={pass} onChange={e=>setPass(e.target.value)} required
              style={{ ...inp(), background: isPortal?'#fff':'#0B0B12', color:tc, border: isPortal?'1px solid #E0E0DC':'1px solid #252535' }}
              placeholder="••••••••" />
          </div>
          <button type="submit" disabled={busy} style={{ width:'100%', background:primary, border:'none', borderRadius:11, color:'#fff', fontSize:15, fontWeight:700, cursor:busy?'default':'pointer', padding:'14px 0', opacity:busy?0.7:1, transition:'opacity .15s' }}>
            {busy ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div style={{ textAlign:'center', marginTop:18, fontSize:12, color:lc }}>
          Forgot password? Contact your Peregrine rep.
        </div>
      </div>
    </div>
  );
}

// ─── FIRST-RUN SETUP WIZARD ───────────────────────────────────────────────────
function SetupWizard({ user, onComplete }) {
  const [step,    setStep]    = useState(0);
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);
  const [form,    setForm]    = useState({ vendor_name:'ASI ESP+', login_url:'', username:'', password:'', selector_username:'', selector_password:'', selector_submit:'', catalog_url:'' });
  const [error,   setError]   = useState('');

  const steps = [
    { title:"Welcome to Peregrine Portal 👋", subtitle:"Let's get you set up in 2 minutes." },
    { title:"Connect Your First Vendor",      subtitle:"Enter your ASI ESP+ or other vendor login." },
  ];

  const saveVendor = async () => {
    setLoading(true); setError('');
    try {
      // Update ASI vendor with credentials
      const vendors = await api.get('/api/vendors');
      const asi = vendors.find(v=>v.name==='ASI ESP+')||vendors[0];
      await api.put(`/api/vendors/${asi.id}`, {
        name: form.vendor_name,
        active: true,
        credentials: { login_url:form.login_url, username:form.username, password:form.password,
          selector_username:form.selector_username||'#username', selector_password:form.selector_password||'#password',
          selector_submit:form.selector_submit||'button[type="submit"]', catalog_url:form.catalog_url },
      });
      setDone(true);
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  };

  if (done) return (
    <div style={{ minHeight:'100vh', background:'#0B0B12', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Helvetica Neue',Arial,sans-serif" }}>
      <div style={{ width:500, background:'#111119', borderRadius:18, padding:48, textAlign:'center', border:'1px solid #1C1C28' }}>
        <div style={{ fontSize:52, marginBottom:16 }}>🎉</div>
        <div style={{ fontSize:22, fontWeight:700, color:'#E4E4EF', marginBottom:8 }}>You're all set!</div>
        <div style={{ fontSize:14, color:'#8888A0', lineHeight:1.7, marginBottom:28 }}>
          Your vendor credentials are saved. Click "Sync Now" in the Vendor Sync screen to pull all your products. After that, products sync automatically every night at midnight.
        </div>
        <button onClick={onComplete} style={{ background:PER, border:'none', borderRadius:10, color:'#fff', fontSize:15, fontWeight:700, cursor:'pointer', padding:'14px 36px' }}>
          Go to Dashboard →
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', background:'#0B0B12', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Helvetica Neue',Arial,sans-serif" }}>
      <div style={{ width:520, background:'#111119', borderRadius:18, padding:48, border:'1px solid #1C1C28' }}>
        {/* Progress */}
        <div style={{ display:'flex', gap:8, marginBottom:36 }}>
          {steps.map((_,i) => (
            <div key={i} style={{ flex:1, height:4, borderRadius:2, background: i<=step ? PER : '#1C1C28', transition:'background .3s' }} />
          ))}
        </div>

        <div style={{ marginBottom:28 }}>
          <div style={{ fontSize:22, fontWeight:700, color:'#E4E4EF', marginBottom:6 }}>{steps[step].title}</div>
          <div style={{ fontSize:14, color:'#8888A0' }}>{steps[step].subtitle}</div>
        </div>

        {step === 0 && (
          <div>
            <div style={{ background:'#1C1600', border:'1px solid #F5A62340', borderRadius:12, padding:18, marginBottom:20 }}>
              <div style={{ fontSize:13, fontWeight:600, color:'#F5A623', marginBottom:8 }}>What happens next:</div>
              {['Connect your vendor logins (ASI ESP+, SanMar, etc.)', 'Products sync automatically every night at midnight', 'Create customer portals — each gets their own branded URL', 'Customers log in and place orders, you manage everything here'].map((t,i) => (
                <div key={i} style={{ display:'flex', gap:10, fontSize:13, color:'#8888A0', marginBottom:6 }}>
                  <span style={{ color:'#34D399' }}>✓</span>{t}
                </div>
              ))}
            </div>
            <button onClick={()=>setStep(1)} style={{ width:'100%', background:PER, border:'none', borderRadius:10, color:'#fff', fontSize:15, fontWeight:700, cursor:'pointer', padding:'14px 0' }}>
              Get Started →
            </button>
          </div>
        )}

        {step === 1 && (
          <div>
            {error && <div style={{ background:'#1A0A0A', border:'1px solid #F8717140', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#F87171', marginBottom:16 }}>{error}</div>}

            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block', fontSize:11, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#8888A0', marginBottom:6 }}>Vendor Name</label>
              <input style={{ ...inp(), background:'#0B0B12', color:'#E4E4EF', border:'1px solid #252535' }} value={form.vendor_name} onChange={e=>setForm(f=>({...f,vendor_name:e.target.value}))} placeholder="ASI ESP+" />
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block', fontSize:11, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#8888A0', marginBottom:6 }}>Vendor Login Page URL</label>
              <input style={{ ...inp(), background:'#0B0B12', color:'#E4E4EF', border:'1px solid #252535' }} value={form.login_url} onChange={e=>setForm(f=>({...f,login_url:e.target.value}))} placeholder="https://www.asicentral.com/login" />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
              <div>
                <label style={{ display:'block', fontSize:11, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#8888A0', marginBottom:6 }}>Your Username / Email</label>
                <input style={{ ...inp(), background:'#0B0B12', color:'#E4E4EF', border:'1px solid #252535' }} value={form.username} onChange={e=>setForm(f=>({...f,username:e.target.value}))} placeholder="you@company.com" />
              </div>
              <div>
                <label style={{ display:'block', fontSize:11, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#8888A0', marginBottom:6 }}>Your Password</label>
                <input type="password" style={{ ...inp(), background:'#0B0B12', color:'#E4E4EF', border:'1px solid #252535' }} value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} placeholder="••••••••" />
              </div>
            </div>
            <div style={{ marginBottom:20 }}>
              <label style={{ display:'block', fontSize:11, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#8888A0', marginBottom:6 }}>Product Catalog URL (after login)</label>
              <input style={{ ...inp(), background:'#0B0B12', color:'#E4E4EF', border:'1px solid #252535' }} value={form.catalog_url} onChange={e=>setForm(f=>({...f,catalog_url:e.target.value}))} placeholder="https://www.asicentral.com/search/products" />
              <div style={{ fontSize:11, color:'#44445A', marginTop:5 }}>The page your products are listed on after you log in</div>
            </div>

            <div style={{ background:'#0A1428', border:'1px solid #60A5FA30', borderRadius:10, padding:14, marginBottom:20 }}>
              <div style={{ fontSize:12, fontWeight:600, color:'#60A5FA', marginBottom:4 }}>CSS Selectors (optional — defaults work for most sites)</div>
              <div style={{ fontSize:11, color:'#8888A0', lineHeight:1.6 }}>Leave these blank and the system will try common defaults. If login fails, your sysadmin can right-click the login fields on the vendor site → Inspect → find the id or name attribute.</div>
            </div>

            <div style={{ display:'flex', gap:10 }}>
              <button onClick={()=>setStep(0)} style={{ padding:'13px 20px', background:'#1C1C28', border:'none', borderRadius:10, color:'#8888A0', fontSize:14, cursor:'pointer' }}>← Back</button>
              <button onClick={saveVendor} disabled={loading||!form.login_url||!form.username} style={{ flex:1, background:form.login_url&&form.username?PER:'#1C1C28', border:'none', borderRadius:10, color:form.login_url&&form.username?'#fff':'#44445A', fontSize:15, fontWeight:700, cursor:form.login_url&&form.username&&!loading?'pointer':'default', padding:'13px 0' }}>
                {loading ? 'Saving…' : 'Save & Continue →'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [state,   setState]   = useState('loading'); // loading | login | setup | app
  const [user,    setUser]    = useState(null);
  const [portal,  setPortal]  = useState(null);
  const [setup,   setSetup]   = useState(null);

  useEffect(() => {
    // Step 1: get portal config (are we on admin or a customer subdomain?)
    fetch('/api/portal/config')
      .then(r=>r.json())
      .then(cfg => {
        setPortal(cfg);
        // Step 2: if we have a saved token, validate it
        const token = api.token();
        if (token) {
          // Check token by hitting a real endpoint
          fetch('/api/analytics/kpis', { headers:{ Authorization:`Bearer ${token}` } })
            .then(r => r.ok ? r.json() : null)
            .then(data => {
              if (data) {
                // Token valid — decode user from it
                try {
                  const payload = JSON.parse(atob(token.split('.')[1]));
                  setUser({ userId:payload.userId, userType:payload.userType, role:payload.role, locationId:payload.locationId });
                  checkSetup(payload);
                } catch { api.clear(); setState('login'); }
              } else { api.clear(); setState('login'); }
            })
            .catch(() => { api.clear(); setState('login'); });
        } else {
          setState('login');
        }
      })
      .catch(() => { setPortal({ isPortal:false }); setState('login'); });
  }, []);

  const checkSetup = async (usr) => {
    if (usr?.userType !== 'staff') { setState('app'); return; }
    try {
      const s = await api.get('/api/setup/status');
      setSetup(s);
      if (!s.hasVendor) setState('setup');
      else setState('app');
    } catch { setState('app'); }
  };

  const handleLogin = async (u) => {
    setUser(u);
    await checkSetup(u);
  };

  const handleLogout = () => {
    api.clear();
    setUser(null);
    setState('login');
  };

  if (state === 'loading') return <Loading message="Starting Peregrine Portal…" />;

  if (state === 'login') return (
    <Login
      isPortal={portal?.isPortal}
      subdomain={portal?.customer?.subdomain}
      branding={portal?.customer}
      onLogin={handleLogin}
    />
  );

  if (state === 'setup') return (
    <SetupWizard user={user} onComplete={() => setState('app')} />
  );

  if (state === 'app') {
    const PeregrinePortal = require('./PeregrineUnified').default;
    return <PeregrinePortal user={user} portal={portal} api={api} onLogout={handleLogout} />;
  }

  return <Loading />;
}
