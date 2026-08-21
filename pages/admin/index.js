import { useState, useEffect } from 'react';

export default function AdminPage() {
  const [loggedIn, setLoggedIn]   = useState(false);
  const [loginData, setLoginData] = useState({ user: '', pass: '' });
  const [loginErr, setLoginErr]   = useState('');
  const [panel, setPanel]         = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cfg, setCfg]             = useState({});
  const [donations, setDonations] = useState([]);
  const [enquiries, setEnquiries] = useState([]);
  const [toast, setToast]         = useState(null);
  const [secret, setSecret]       = useState('');

  // On mount — check session
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sec = sessionStorage.getItem('adminSecret');
    if (sec) { setSecret(sec); setLoggedIn(true); }
  }, []);

  useEffect(() => {
    if (loggedIn && secret) { loadConfig(); loadDonations(); loadEnquiries(); }
  }, [loggedIn, secret]);

  useEffect(() => {
    if (toast) { const t = setTimeout(() => setToast(null), 3500); return () => clearTimeout(t); }
  }, [toast]);

  const showToast = (msg, type = 'ok') => setToast({ msg, type });

  // Login: call backend with password, get token (= ADMIN_SECRET)
  async function doLogin() {
    const creds = JSON.parse(localStorage.getItem('adminCreds') || 'null') || { user: 'admin', pass: 'temple@123' };
    if (loginData.user !== creds.user) return setLoginErr('Invalid credentials.');

    try {
      const res  = await fetch('/api/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: loginData.pass }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Fallback: check local password
        if (loginData.pass === creds.pass) {
          // local login ok but secret wrong — let user set it
          setLoginErr('Local login ok but ADMIN_SECRET mismatch. Check Vercel env vars.');
          return;
        }
        return setLoginErr('Invalid credentials. Try again.');
      }
      // Store token in sessionStorage (cleared on tab close)
      sessionStorage.setItem('adminSecret', data.token);
      setSecret(data.token);
      setLoggedIn(true);
      setLoginErr('');
    } catch {
      // Offline fallback
      if (loginData.pass === creds.pass) {
        const fallback = 'temple@123';
        sessionStorage.setItem('adminSecret', fallback);
        setSecret(fallback);
        setLoggedIn(true);
        setLoginErr('');
      } else {
        setLoginErr('Cannot connect to server.');
      }
    }
  }

  function doLogout() {
    sessionStorage.removeItem('adminSecret');
    setLoggedIn(false); setSecret('');
  }

  const hdrs = () => ({ 'Content-Type': 'application/json', 'x-admin-secret': secret });

  async function uploadToCloudinary(file) {
    const signatureRes = await fetch('/api/cloudinary-signature', { headers: { 'x-admin-secret': secret } });
    const signature = await readApiResponse(signatureRes);
    const body = new FormData();
    body.append('file', file);
    body.append('api_key', signature.apiKey);
    body.append('timestamp', signature.timestamp);
    body.append('signature', signature.signature);
    const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`, { method:'POST', body });
    const upload = await readApiResponse(uploadRes);
    if (!upload.secure_url) throw new Error('Cloudinary did not return an image URL.');
    return upload.secure_url;
  }

  async function readApiResponse(res) {
    const text = await res.text();
    let data;
    try { data = text ? JSON.parse(text) : {}; }
    catch { data = { error: `Server returned an invalid response (${res.status}). Check the API and database configuration.` }; }
    if (!res.ok) throw new Error(data.error || `API request failed (${res.status})`);
    return data;
  }

  async function apiFetch(path, opts = {}) {
    const res  = await fetch(path, { headers: hdrs(), ...opts });
    if (res.status === 401) {
      sessionStorage.removeItem('adminSecret');
      setSecret('');
      setLoggedIn(false);
      throw new Error('Admin session expired. Please sign in again.');
    }
    return readApiResponse(res);
  }

  async function loadConfig() {
    try { setCfg(await apiFetch('/api/config')); } catch(e) { showToast('❌ Config load failed','err'); }
  }
  async function saveConfig(updates) {
    try {
      const merged = { ...cfg, ...updates };
      await apiFetch('/api/config', { method: 'PUT', body: JSON.stringify(merged) });
      setCfg(merged); showToast('✅ Saved!', 'ok');
    } catch(e) { showToast('❌ ' + e.message, 'err'); }
  }
  async function loadDonations() {
    try { const d = await apiFetch('/api/donations?limit=500'); setDonations(d.data || []); } catch {}
  }
  async function loadEnquiries() {
    try { const d = await apiFetch('/api/enquiries?limit=500'); setEnquiries(d.data || []); } catch {}
  }

  if (!loggedIn) {
    return (
      <div style={styles.loginWrap}>
        <div style={styles.loginBox}>
          <div style={styles.loginIcon}>🛕</div>
          <h2 style={styles.loginTitle}>Temple Admin Panel</h2>
          <p style={styles.loginSub}>Sign in to manage your temple website</p>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Username</label>
            <input style={styles.input} value={loginData.user} onChange={e=>setLoginData(d=>({...d,user:e.target.value}))} placeholder="admin" />
          </div>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Password</label>
            <input style={styles.input} type="password" value={loginData.pass} onChange={e=>setLoginData(d=>({...d,pass:e.target.value}))} placeholder="••••••••" onKeyDown={e=>e.key==='Enter'&&doLogin()} />
          </div>
          <button style={styles.btnPrimary} onClick={doLogin}>🔐 Sign In</button>
          {loginErr && <div style={{color:'#DC2626',fontSize:'0.82rem',marginTop:'10px'}}>{loginErr}</div>}
        </div>
      </div>
    );
  }

  const navItems = [
    {id:'dashboard',icon:'📊',label:'Dashboard',group:'Overview'},
    {id:'settings',icon:'⚙️',label:'Temple Info',group:'Content'},
    {id:'timings',icon:'⏰',label:'Timings',group:'Content'},
    {id:'events',icon:'📅',label:'Events',group:'Content'},
    {id:'gallery',icon:'🖼️',label:'Gallery',group:'Content'},
    {id:'donations',icon:'💰',label:'Donations',group:'Community'},
    {id:'enquiries',icon:'📨',label:'Enquiries',group:'Community'},
    {id:'cloudinary',icon:'☁️',label:'Cloudinary',group:'System'},
    {id:'password',icon:'🔑',label:'Password',group:'System'},
  ];

  const PANEL_LABELS = {dashboard:'Dashboard',settings:'Temple Info',timings:'Timings',events:'Events',gallery:'Gallery',donations:'Donations',enquiries:'Enquiries',cloudinary:'Cloudinary',password:'Change Password'};

  return (
    <div className="admin-shell" style={{display:'flex',minHeight:'100vh',width:'100%',fontFamily:'Inter,system-ui,sans-serif',background:'#F4F6FA'}}>
      {/* Overlay for mobile */}
      {sidebarOpen && <div onClick={()=>setSidebarOpen(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:99,display:'none'}} className="mob-overlay" />}

      {/* SIDEBAR */}
      <aside className="admin-sidebar" style={{...styles.sidebar, ...(sidebarOpen?{transform:'translateX(0)'}:{})}}>
        <div className="admin-sidebar-brand" style={styles.sidebarBrand}>
          <div className="admin-brand-title" style={{fontSize:'1.1rem',fontWeight:700,color:'#fff'}}>🛕 Temple Admin</div>
          <div className="admin-brand-subtitle" style={{fontSize:'0.65rem',color:'#D4A017',letterSpacing:'1px',marginTop:'2px'}}>CONTENT MANAGEMENT</div>
        </div>
        <nav className="admin-nav" style={{flex:1,overflowY:'auto',padding:'8px 0'}}>
          {navItems.map((item, idx) => {
            const showGroup = idx === 0 || item.group !== navItems[idx-1].group;
            return (
              <div key={item.id}>
                {showGroup && <div style={styles.navGroupLabel}>{item.group}</div>}
                <div
                  className={`admin-nav-item${panel===item.id?' is-active':''}`}
                  onClick={()=>{setPanel(item.id);setSidebarOpen(false);}}
                  style={{...styles.navItem,...(panel===item.id?styles.navItemActive:{})}}
                >
                  <span style={{marginRight:'10px'}}>{item.icon}</span>{item.label}
                </div>
              </div>
            );
          })}
          <div style={styles.navGroupLabel}>Auth</div>
          <div className="admin-nav-item" onClick={doLogout} style={styles.navItem}>
            <span style={{marginRight:'10px'}}>🚪</span>Logout
          </div>
        </nav>
        <div className="admin-sidebar-footer" style={{padding:'12px 20px',borderTop:'1px solid rgba(255,255,255,0.08)',fontSize:'0.75rem'}}>
          <a href="/" target="_blank" style={{color:'#E8751A',textDecoration:'none'}}>← View Website</a>
        </div>
      </aside>

      {/* MAIN */}
      <div className="admin-main" style={{flex:1,display:'flex',flexDirection:'column',marginLeft:'240px',minWidth:0}}>
        {/* Topbar */}
        <div className="admin-topbar" style={styles.topbar}>
          <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
            <button className="admin-hamburger" onClick={()=>setSidebarOpen(!sidebarOpen)} style={styles.hamburger} aria-label="Toggle navigation">☰</button>
            <span style={{fontWeight:600,fontSize:'1rem'}}>{PANEL_LABELS[panel]}</span>
          </div>
          <div style={{display:'flex',gap:'10px',alignItems:'center'}}>
            <a href="/" target="_blank" style={styles.btnSm}>🌐 View Site</a>
            <span style={styles.adminBadge}>Admin</span>
          </div>
        </div>

        {/* Content */}
        <div style={styles.content}>
          {panel==='dashboard'  && <Dashboard cfg={cfg} donations={donations} enquiries={enquiries} />}
          {panel==='settings'   && <SettingsPanel cfg={cfg} saveConfig={saveConfig} uploadToCloudinary={uploadToCloudinary} />}
          {panel==='timings'    && <TimingsPanel cfg={cfg} saveConfig={saveConfig} />}
          {panel==='events'     && <EventsPanel cfg={cfg} saveConfig={saveConfig} />}
          {panel==='gallery'    && <GalleryPanel cfg={cfg} saveConfig={saveConfig} showToast={showToast} uploadToCloudinary={uploadToCloudinary} />}
          {panel==='donations'  && <DonationsPanel donations={donations} apiFetch={apiFetch} reload={loadDonations} showToast={showToast} />}
          {panel==='enquiries'  && <EnquiriesPanel enquiries={enquiries} apiFetch={apiFetch} reload={loadEnquiries} showToast={showToast} />}
          {panel==='cloudinary' && <CloudinaryPanel cfg={cfg} saveConfig={saveConfig} />}
          {panel==='password'   && <PasswordPanel showToast={showToast} />}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{...styles.toast,...(toast.type==='ok'?{borderLeft:'4px solid #16A34A'}:{borderLeft:'4px solid #DC2626'})}}>
          {toast.msg}
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Inter, system-ui, sans-serif; }
        table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
        th { text-align: left; padding: 10px 14px; font-size: 0.72rem; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; color: #64748B; border-bottom: 1px solid #E2E8F0; background: #F8FAFC; }
        td { padding: 11px 14px; border-bottom: 1px solid #E2E8F0; vertical-align: middle; font-size: 0.85rem; }
        tr:last-child td { border-bottom: none; }
        tr:hover td { background: #FAFAFA; }
        input, select, textarea { width: 100%; padding: 9px 12px; border: 1.5px solid #E2E8F0; border-radius: 8px; font-family: Inter, system-ui, sans-serif; font-size: 0.875rem; color: #1E293B; outline: none; transition: border-color 0.2s; background: #fff; }
        input:focus, select:focus, textarea:focus { border-color: #E8751A; }
        textarea { resize: vertical; min-height: 90px; }
        @media (max-width: 768px) {
          aside { transform: translateX(-100%) !important; position: fixed !important; z-index: 100; }
          .mob-overlay { display: block !important; }
          div[style*="marginLeft:240px"], div[style*="margin-left: 240px"] { margin-left: 0 !important; }
        }
      `}</style>
    </div>
  );
}

// ── STYLES ────────────────────────────────────
const styles = {
  loginWrap:   { minHeight:'100vh', width:'100vw', display:'flex', alignItems:'center', justifyContent:'center', background:'#1A0A00', fontFamily:'Inter,system-ui,sans-serif', position:'fixed', top:0, left:0 },
  loginBox:    { background:'#fff', borderRadius:'16px', padding:'40px 36px', width:'360px', maxWidth:'90vw', boxShadow:'0 12px 48px rgba(0,0,0,0.3)', textAlign:'center' },
  loginIcon:   { fontSize:'3rem', marginBottom:'12px' },
  loginTitle:  { fontSize:'1.2rem', fontWeight:700, color:'#1E293B', marginBottom:'4px' },
  loginSub:    { fontSize:'0.83rem', color:'#64748B', marginBottom:'28px' },
  fieldGroup:  { marginBottom:'16px', textAlign:'left' },
  label:       { display:'block', fontSize:'0.78rem', fontWeight:600, color:'#1E293B', marginBottom:'6px' },
  input:       { width:'100%', padding:'9px 12px', border:'1.5px solid #E2E8F0', borderRadius:'8px', fontSize:'0.875rem', outline:'none', fontFamily:'Inter,system-ui,sans-serif' },
  btnPrimary:  { width:'100%', padding:'11px', background:'#E8751A', color:'#fff', border:'none', borderRadius:'8px', fontWeight:600, fontSize:'0.9rem', cursor:'pointer', marginTop:'4px' },
  btnSecondary:{ padding:'8px 16px', background:'#F4F6FA', color:'#1E293B', border:'1.5px solid #E2E8F0', borderRadius:'8px', fontWeight:600, fontSize:'0.83rem', cursor:'pointer' },
  btnDanger:   { padding:'6px 12px', background:'#DC2626', color:'#fff', border:'none', borderRadius:'6px', fontWeight:600, fontSize:'0.78rem', cursor:'pointer' },
  btnSm:       { padding:'7px 14px', background:'#F4F6FA', color:'#1E293B', border:'1.5px solid #E2E8F0', borderRadius:'8px', fontWeight:600, fontSize:'0.8rem', cursor:'pointer', textDecoration:'none' },
  adminBadge:  { background:'rgba(232,117,26,0.1)', color:'#E8751A', padding:'4px 12px', borderRadius:'100px', fontSize:'0.75rem', fontWeight:600 },
  sidebar:     { width:'240px', background:'#1A0A00', color:'rgba(255,255,255,0.75)', display:'flex', flexDirection:'column', position:'fixed', top:0, left:0, height:'100vh', zIndex:100, transition:'transform 0.3s' },
  sidebarBrand:{ padding:'20px', borderBottom:'1px solid rgba(255,255,255,0.08)' },
  navGroupLabel:{ fontSize:'0.65rem', fontWeight:600, letterSpacing:'2px', textTransform:'uppercase', color:'rgba(255,255,255,0.35)', padding:'14px 20px 4px' },
  navItem:     { display:'flex', alignItems:'center', padding:'10px 20px', color:'rgba(255,255,255,0.75)', fontSize:'0.875rem', fontWeight:500, cursor:'pointer', transition:'all 0.2s' },
  navItemActive:{ background:'linear-gradient(90deg, rgba(232,117,26,0.2), rgba(232,117,26,0.08))', color:'#F5B35C', borderRight:'0', boxShadow:'inset 3px 0 #E8751A' },
  topbar:      { background:'#fff', borderBottom:'1px solid #E2E8F0', padding:'0 24px', height:'60px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:90 },
  hamburger:   { background:'none', border:'none', fontSize:'1.4rem', cursor:'pointer', padding:'4px 8px', borderRadius:'6px' },
  content:     { padding:'24px', flex:1 },
  card:        { background:'#fff', borderRadius:'10px', boxShadow:'0 1px 4px rgba(0,0,0,0.08)', marginBottom:'20px', overflow:'hidden' },
  cardHeader:  { padding:'16px 20px', borderBottom:'1px solid #E2E8F0', display:'flex', alignItems:'center', justifyContent:'space-between' },
  cardTitle:   { fontWeight:600, fontSize:'0.95rem' },
  cardBody:    { padding:'20px' },
  statsGrid:   { display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:'16px', marginBottom:'20px' },
  statCard:    { background:'#fff', borderRadius:'10px', padding:'20px', boxShadow:'0 1px 4px rgba(0,0,0,0.08)', display:'flex', alignItems:'flex-start', gap:'14px' },
  settingsGrid:{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' },
  toast:       { position:'fixed', bottom:'24px', right:'24px', background:'#1E293B', color:'#fff', padding:'12px 20px', borderRadius:'8px', fontSize:'0.85rem', boxShadow:'0 4px 16px rgba(0,0,0,0.2)', zIndex:9999, maxWidth:'320px' },
  timingRow:   { display:'grid', gridTemplateColumns:'50px 1fr 1fr 1fr 40px', gap:'8px', alignItems:'center', padding:'10px', background:'#F8FAFC', borderRadius:'8px', marginBottom:'8px' },
  eventRow:    { display:'grid', gridTemplateColumns:'60px 60px 70px 1fr 100px 40px', gap:'8px', alignItems:'center', padding:'10px', background:'#F8FAFC', borderRadius:'8px', marginBottom:'6px' },
};

// ── STAT CARD ─────────────────────────────────
function StatCard({ icon, value, label, color }) {
  const colors = { orange:'rgba(232,117,26,0.12)', red:'rgba(139,26,26,0.1)', green:'rgba(22,163,74,0.1)', blue:'rgba(59,130,246,0.1)' };
  return (
    <div style={styles.statCard}>
      <div style={{width:'44px',height:'44px',borderRadius:'10px',background:colors[color],display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.3rem',flexShrink:0}}>{icon}</div>
      <div><div style={{fontSize:'1.6rem',fontWeight:700,lineHeight:1}}>{value}</div><div style={{fontSize:'0.78rem',color:'#64748B',marginTop:'2px'}}>{label}</div></div>
    </div>
  );
}

// ── DASHBOARD ─────────────────────────────────
function Dashboard({ cfg, donations, enquiries }) {
  const totalAmt = donations.reduce((s,d)=>s+(Number(d.amount)||0),0);
  return (
    <div>
      <div style={styles.statsGrid}>
        <StatCard icon="💰" value={`₹${totalAmt.toLocaleString('en-IN')}`} label="Total Donations" color="orange" />
        <StatCard icon="📨" value={enquiries.length} label="Enquiries" color="red" />
        <StatCard icon="🖼️" value={(cfg.galleryImages||[]).length} label="Gallery Images" color="green" />
        <StatCard icon="📅" value={(cfg.events||[]).length} label="Events" color="blue" />
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>
        <div style={styles.card}>
          <div style={styles.cardHeader}><span style={styles.cardTitle}>📨 Recent Enquiries</span></div>
          {enquiries.length ? (
            <div style={{overflowX:'auto'}}>
              <table><thead><tr><th>Name</th><th>Type</th><th>Status</th></tr></thead>
              <tbody>{enquiries.slice(0,5).map(e=><tr key={e._id}><td>{e.name}</td><td>{e.type}</td><td><Badge status={e.status} /></td></tr>)}</tbody></table>
            </div>
          ) : <p style={{padding:'16px',fontSize:'0.85rem',color:'#64748B'}}>No enquiries yet.</p>}
        </div>
        <div style={styles.card}>
          <div style={styles.cardHeader}><span style={styles.cardTitle}>💰 Recent Donations</span></div>
          {donations.length ? (
            <div style={{overflowX:'auto'}}>
              <table><thead><tr><th>Name</th><th>Amount</th><th>Purpose</th></tr></thead>
              <tbody>{donations.slice(0,5).map(d=><tr key={d._id}><td>{d.name}</td><td>₹{Number(d.amount).toLocaleString('en-IN')}</td><td>{d.purpose}</td></tr>)}</tbody></table>
            </div>
          ) : <p style={{padding:'16px',fontSize:'0.85rem',color:'#64748B'}}>No donations yet.</p>}
        </div>
      </div>
    </div>
  );
}

function Badge({ status }) {
  const map = { Unread:'#D97706', Read:'#3B82F6', Replied:'#16A34A', Pending:'#D97706', Received:'#3B82F6', Verified:'#16A34A' };
  return <span style={{background:`${map[status]}18`,color:map[status],padding:'3px 8px',borderRadius:'100px',fontSize:'0.72rem',fontWeight:600}}>{status}</span>;
}

// ── SETTINGS ──────────────────────────────────
function SettingsField({ label, children, full }) {
  return (
    <div style={{gridColumn:full?'1/-1':'auto',marginBottom:'14px'}}>
      <label style={{display:'block',fontSize:'0.78rem',fontWeight:600,marginBottom:'5px'}}>{label}</label>
      {children}
    </div>
  );
}

function SettingsPanel({ cfg, saveConfig, uploadToCloudinary }) {
  const [form, setForm] = useState({});
  const [uploadingAbout, setUploadingAbout] = useState(false);
  useEffect(()=>setForm({...cfg}),[cfg]);
  const f = k => ({ value: form[k]||'', onChange: e=>setForm(p=>({...p,[k]:e.target.value})) });

  async function uploadAboutImage(file) {
    if (!file) return;
    setUploadingAbout(true);
    try {
      const url = await uploadToCloudinary(file);
      setForm(previous => ({ ...previous, aboutImageUrl: url }));
    } catch (error) {
      alert(`About image upload failed: ${error.message}`);
    } finally {
      setUploadingAbout(false);
    }
  }

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}><span style={styles.cardTitle}>⚙️ Temple Information</span></div>
      <div style={styles.cardBody}>
        <div style={styles.settingsGrid}>
          <SettingsField label="Temple Name"><input {...f('templeName')} /></SettingsField>
          <SettingsField label="Deity Name"><input {...f('templeDeity')} /></SettingsField>
          <SettingsField label="Location"><input {...f('templeLocation')} /></SettingsField>
          <SettingsField label="Established Year"><input {...f('templeEstYear')} /></SettingsField>
          <div style={{gridColumn:'1/-1',marginBottom:'14px'}}><label style={{display:'block',fontSize:'0.78rem',fontWeight:600,marginBottom:'5px'}}>Tagline</label><input {...f('templeTagline')} /></div>
          <SettingsField label="Hero Shloka"><input {...f('heroShloka')} /></SettingsField>
          <SettingsField label="Hero Sub Shloka"><input {...f('heroSubShloka')} /></SettingsField>
          <div style={{gridColumn:'1/-1',marginBottom:'14px'}}><label style={{display:'block',fontSize:'0.78rem',fontWeight:600,marginBottom:'5px'}}>Topbar Text</label><input {...f('topbarText')} /></div>
          <div style={{gridColumn:'1/-1',marginBottom:'14px'}}><label style={{display:'block',fontSize:'0.78rem',fontWeight:600,marginBottom:'5px'}}>About Para 1</label><textarea {...f('aboutPara1')}></textarea></div>
          <div style={{gridColumn:'1/-1',marginBottom:'14px'}}><label style={{display:'block',fontSize:'0.78rem',fontWeight:600,marginBottom:'5px'}}>About Para 2</label><textarea {...f('aboutPara2')}></textarea></div>
          <div style={{gridColumn:'1/-1',marginBottom:'14px'}}><label style={{display:'block',fontSize:'0.78rem',fontWeight:600,marginBottom:'5px'}}>About Para 3</label><textarea {...f('aboutPara3')}></textarea></div>
          <div style={{gridColumn:'1/-1',marginBottom:'14px'}}>
            <label style={{display:'block',fontSize:'0.78rem',fontWeight:600,marginBottom:'5px'}}>About Image</label>
            <div style={{display:'flex',gap:'10px',alignItems:'center',flexWrap:'wrap'}}>
              <input {...f('aboutImageUrl')} placeholder="Paste image URL or upload below" style={{flex:'1 1 320px'}} />
              <label style={{...styles.btnSecondary,display:'inline-flex',alignItems:'center',cursor:'pointer',margin:0}}>
                {uploadingAbout ? 'Uploading...' : '⬆ Upload Image'}
                <input type="file" accept="image/*" style={{display:'none'}} disabled={uploadingAbout} onChange={e=>uploadAboutImage(e.target.files[0])} />
              </label>
            </div>
            {form.aboutImageUrl && <img src={form.aboutImageUrl} alt="About preview" style={{display:'block',width:'180px',height:'110px',objectFit:'cover',borderRadius:'8px',marginTop:'10px',border:'1px solid #E2E8F0'}} />}
          </div>
          <SettingsField label="Stat 1 Value"><input {...f('stat1')} /></SettingsField>
          <SettingsField label="Stat 1 Label"><input {...f('stat1Label')} /></SettingsField>
          <SettingsField label="Stat 2 Value"><input {...f('stat2')} /></SettingsField>
          <SettingsField label="Stat 2 Label"><input {...f('stat2Label')} /></SettingsField>
          <SettingsField label="Stat 3 Value"><input {...f('stat3')} /></SettingsField>
          <SettingsField label="Stat 3 Label"><input {...f('stat3Label')} /></SettingsField>
          <div style={{gridColumn:'1/-1',borderTop:'1px solid #E2E8F0',paddingTop:'16px',marginTop:'4px',marginBottom:'14px'}}><label style={{fontWeight:700,fontSize:'0.9rem'}}>📞 Contact</label></div>
          <div style={{gridColumn:'1/-1',marginBottom:'14px'}}><label style={{display:'block',fontSize:'0.78rem',fontWeight:600,marginBottom:'5px'}}>Address</label><input {...f('contactAddress')} /></div>
          <SettingsField label="Phone"><input {...f('contactPhone')} /></SettingsField>
          <SettingsField label="Email"><input {...f('contactEmail')} /></SettingsField>
          <SettingsField label="Opening Hours"><input {...f('contactHours')} /></SettingsField>
          <SettingsField label="Social"><input {...f('contactSocial')} /></SettingsField>
          <div style={{gridColumn:'1/-1',marginBottom:'14px'}}><label style={{display:'block',fontSize:'0.78rem',fontWeight:600,marginBottom:'5px'}}>Google Maps Embed URL</label><input {...f('googleMapsEmbed')} /></div>
          <div style={{gridColumn:'1/-1',marginBottom:'14px'}}>
            <label style={{display:'block',fontSize:'0.78rem',fontWeight:600,marginBottom:'5px'}}>Donation Purposes (one per line)</label>
            <textarea value={(form.donatePurposes||[]).join('\n')} onChange={e=>setForm(p=>({...p,donatePurposes:e.target.value.split('\n')}))} style={{minHeight:'120px'}}></textarea>
          </div>
        </div>
        <div style={{display:'flex',gap:'10px',marginTop:'8px'}}>
          <button style={styles.btnPrimary} onClick={()=>saveConfig(form)}>💾 Save Settings</button>
          <button style={styles.btnSecondary} onClick={()=>setForm({...cfg})}>↺ Reset</button>
        </div>
      </div>
    </div>
  );
}

// ── TIMINGS ───────────────────────────────────
function TimingsPanel({ cfg, saveConfig }) {
  const [timings, setTimings] = useState(cfg.timings||[]);
  useEffect(()=>setTimings(cfg.timings||[]),[cfg]);
  const upd = (i,k,v) => setTimings(t=>t.map((x,j)=>j===i?{...x,[k]:v}:x));
  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <span style={styles.cardTitle}>⏰ Temple Timings</span>
        <button style={styles.btnPrimary} onClick={()=>setTimings(t=>[...t,{icon:'🕐',title:'New Aarti',time:'00:00',days:'Every Day'}])}>+ Add Row</button>
      </div>
      <div style={styles.cardBody}>
        <div style={{fontSize:'0.78rem',color:'#64748B',marginBottom:'12px'}}>Icon | Title | Time | Days</div>
        {timings.map((t,i)=>(
          <div key={i} style={styles.timingRow}>
            <input value={t.icon}  onChange={e=>upd(i,'icon',e.target.value)}  style={{textAlign:'center',fontSize:'1.2rem'}} />
            <input value={t.title} onChange={e=>upd(i,'title',e.target.value)} placeholder="Aarti Name" />
            <input value={t.time}  onChange={e=>upd(i,'time',e.target.value)}  placeholder="5:30 AM" />
            <input value={t.days}  onChange={e=>upd(i,'days',e.target.value)}  placeholder="Every Day" />
            <button style={styles.btnDanger} onClick={()=>setTimings(t=>t.filter((_,j)=>j!==i))}>✕</button>
          </div>
        ))}
        <button style={{...styles.btnPrimary,marginTop:'12px'}} onClick={()=>saveConfig({timings})}>💾 Save Timings</button>
      </div>
    </div>
  );
}

// ── EVENTS ────────────────────────────────────
function EventsPanel({ cfg, saveConfig }) {
  const [events, setEvents] = useState(cfg.events||[]);
  useEffect(()=>setEvents(cfg.events||[]),[cfg]);
  const upd = (i,k,v) => setEvents(e=>e.map((x,j)=>j===i?{...x,[k]:v}:x));
  const now = new Date();
  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <span style={styles.cardTitle}>📅 Events & Festivals</span>
        <button style={styles.btnPrimary} onClick={()=>setEvents(e=>[...e,{day:String(now.getDate()).padStart(2,'0'),month:now.toLocaleString('en',{month:'short'}).toUpperCase(),year:String(now.getFullYear()),title:'New Event',desc:'Description',tag:'Festival'}])}>+ Add Event</button>
      </div>
      <div style={styles.cardBody}>
        {events.map((ev,i)=>(
          <div key={i}>
            <div style={styles.eventRow}>
              <input value={ev.day}   onChange={e=>upd(i,'day',e.target.value)}   placeholder="DD" />
              <input value={ev.month} onChange={e=>upd(i,'month',e.target.value)} placeholder="JAN" />
              <input value={ev.year}  onChange={e=>upd(i,'year',e.target.value)}  placeholder="2025" />
              <input value={ev.title} onChange={e=>upd(i,'title',e.target.value)} placeholder="Event Title" />
              <input value={ev.tag}   onChange={e=>upd(i,'tag',e.target.value)}   placeholder="Festival" />
              <button style={styles.btnDanger} onClick={()=>setEvents(e=>e.filter((_,j)=>j!==i))}>✕</button>
            </div>
            <div style={{paddingBottom:'8px'}}>
              <input value={ev.desc} onChange={e=>upd(i,'desc',e.target.value)} placeholder="Event description..." />
            </div>
          </div>
        ))}
        <button style={{...styles.btnPrimary,marginTop:'8px'}} onClick={()=>saveConfig({events})}>💾 Save Events</button>
      </div>
    </div>
  );
}

// ── GALLERY ───────────────────────────────────
function GalleryPanel({ cfg, saveConfig, showToast, uploadToCloudinary }) {
  const [images, setImages] = useState(cfg.galleryImages||[]);
  const [uploading, setUploading] = useState(false);
  useEffect(()=>setImages(cfg.galleryImages||[]),[cfg]);

  async function uploadFiles(files) {
    setUploading(true);
    const updated = [...images];
    for (const file of files) {
      try {
        const url = await uploadToCloudinary(file);
        updated.push({ url, caption: file.name.replace(/\.[^.]+$/,'') });
      } catch (error) { showToast('❌ Upload failed: '+error.message,'err'); }
    }
    setImages(updated);
    await saveConfig({ galleryImages: updated });
    setUploading(false);
    showToast(`✅ ${files.length} image(s) uploaded!`,'ok');
  }

  async function removeImage(i) {
    const updated = images.filter((_,j)=>j!==i);
    setImages(updated);
    await saveConfig({ galleryImages: updated });
    showToast('🗑️ Image removed','ok');
  }

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}><span style={styles.cardTitle}>🖼️ Gallery Management</span><span style={{fontSize:'0.8rem',color:'#64748B'}}>{images.length} images</span></div>
      <div style={styles.cardBody}>
        <label style={{display:'block',border:'2px dashed #E2E8F0',borderRadius:'10px',padding:'36px 24px',textAlign:'center',cursor:'pointer',background:'#FAFAFA'}}>
          <div style={{fontSize:'2.5rem',marginBottom:'8px'}}>☁️</div>
          <strong>{uploading ? 'Uploading...' : 'Click to upload images'}</strong>
          <p style={{fontSize:'0.83rem',color:'#64748B',marginTop:'4px'}}>Cloudinary — PNG, JPG, WEBP</p>
          <input type="file" accept="image/*" multiple style={{display:'none'}} onChange={e=>uploadFiles(e.target.files)} disabled={uploading} />
        </label>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:'12px',marginTop:'16px'}}>
          {images.map((img,i)=>(
            <div key={i} style={{position:'relative',borderRadius:'8px',overflow:'hidden',aspectRatio:'1',background:'#F4F6FA'}}>
              <img src={img.url} alt={img.caption||''} style={{width:'100%',height:'100%',objectFit:'cover'}} />
              <button onClick={()=>removeImage(i)} style={{position:'absolute',top:'6px',right:'6px',background:'rgba(220,38,38,0.9)',color:'#fff',border:'none',borderRadius:'50%',width:'26px',height:'26px',cursor:'pointer',fontSize:'0.85rem',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── DONATIONS ─────────────────────────────────
function DonationsPanel({ donations, apiFetch, reload, showToast }) {
  async function updateStatus(id, status) {
    try { await apiFetch(`/api/donations/${id}`,{method:'PATCH',body:JSON.stringify({status})}); reload(); showToast('✅ Updated','ok'); }
    catch(e) { showToast('❌ '+e.message,'err'); }
  }
  async function del(id) {
    if (!confirm('Delete?')) return;
    try { await apiFetch(`/api/donations/${id}`,{method:'DELETE'}); reload(); showToast('🗑️ Deleted','ok'); }
    catch(e) { showToast('❌ '+e.message,'err'); }
  }
  function exportCSV() {
    if (!donations.length) return showToast('No data','err');
    const keys = ['name','phone','email','amount','purpose','message','status','createdAt'];
    const csv = [keys.join(','),...donations.map(d=>keys.map(k=>`"${String(d[k]||'').replace(/"/g,'""')}"`).join(','))].join('\n');
    const a = document.createElement('a'); a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv); a.download='donations.csv'; a.click();
  }
  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <span style={styles.cardTitle}>💰 Donations ({donations.length})</span>
        <button style={styles.btnSecondary} onClick={exportCSV}>⬇ Export CSV</button>
      </div>
      <div style={{overflowX:'auto'}}>
        {!donations.length ? <p style={{padding:'20px',color:'#64748B'}}>No donations yet.</p> : (
          <table>
            <thead><tr><th>#</th><th>Name</th><th>Phone</th><th>Amount</th><th>Purpose</th><th>Date</th><th>Status</th><th></th></tr></thead>
            <tbody>{donations.map((d,i)=>(
              <tr key={d._id}>
                <td style={{color:'#94A3B8'}}>{i+1}</td>
                <td style={{fontWeight:500}}>{d.name}</td>
                <td>{d.phone}</td>
                <td><strong style={{color:'#16A34A'}}>₹{Number(d.amount).toLocaleString('en-IN')}</strong></td>
                <td>{d.purpose}</td>
                <td style={{color:'#94A3B8',fontSize:'0.78rem'}}>{new Date(d.createdAt).toLocaleDateString('en-IN')}</td>
                <td>
                  <select value={d.status} onChange={e=>updateStatus(d._id,e.target.value)} style={{padding:'4px 8px',fontSize:'0.78rem',border:'1px solid #E2E8F0',borderRadius:'6px',width:'auto'}}>
                    <option>Pending</option><option>Received</option><option>Verified</option>
                  </select>
                </td>
                <td><button style={styles.btnDanger} onClick={()=>del(d._id)}>✕</button></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── ENQUIRIES ─────────────────────────────────
function EnquiriesPanel({ enquiries, apiFetch, reload, showToast }) {
  async function updateStatus(id, status) {
    try { await apiFetch(`/api/enquiries/${id}`,{method:'PATCH',body:JSON.stringify({status})}); reload(); showToast('✅ Updated','ok'); }
    catch(e) { showToast('❌ '+e.message,'err'); }
  }
  async function del(id) {
    if (!confirm('Delete?')) return;
    try { await apiFetch(`/api/enquiries/${id}`,{method:'DELETE'}); reload(); showToast('🗑️ Deleted','ok'); }
    catch(e) { showToast('❌ '+e.message,'err'); }
  }
  function exportCSV() {
    if (!enquiries.length) return showToast('No data','err');
    const keys = ['name','phone','email','type','message','status','createdAt'];
    const csv = [keys.join(','),...enquiries.map(e=>keys.map(k=>`"${String(e[k]||'').replace(/"/g,'""')}"`).join(','))].join('\n');
    const a = document.createElement('a'); a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv); a.download='enquiries.csv'; a.click();
  }
  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <span style={styles.cardTitle}>📨 Enquiries ({enquiries.length})</span>
        <button style={styles.btnSecondary} onClick={exportCSV}>⬇ Export CSV</button>
      </div>
      <div style={{overflowX:'auto'}}>
        {!enquiries.length ? <p style={{padding:'20px',color:'#64748B'}}>No enquiries yet.</p> : (
          <table>
            <thead><tr><th>#</th><th>Name</th><th>Phone</th><th>Type</th><th>Message</th><th>Date</th><th>Status</th><th></th></tr></thead>
            <tbody>{enquiries.map((e,i)=>(
              <tr key={e._id}>
                <td style={{color:'#94A3B8'}}>{i+1}</td>
                <td style={{fontWeight:500}}>{e.name}</td>
                <td>{e.phone}</td>
                <td><Badge status={e.type} /></td>
                <td style={{maxWidth:'200px',fontSize:'0.82rem',color:'#64748B',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{e.message}</td>
                <td style={{color:'#94A3B8',fontSize:'0.78rem'}}>{new Date(e.createdAt).toLocaleDateString('en-IN')}</td>
                <td>
                  <select value={e.status} onChange={ev=>updateStatus(e._id,ev.target.value)} style={{padding:'4px 8px',fontSize:'0.78rem',border:'1px solid #E2E8F0',borderRadius:'6px',width:'auto'}}>
                    <option>Unread</option><option>Read</option><option>Replied</option>
                  </select>
                </td>
                <td><button style={styles.btnDanger} onClick={()=>del(e._id)}>✕</button></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── CLOUDINARY ────────────────────────────────
function CloudinaryPanel({ cfg, saveConfig }) {
  return (
    <div style={{...styles.card,maxWidth:'620px'}}>
      <div style={styles.cardHeader}><span style={styles.cardTitle}>☁️ Cloudinary Configuration</span></div>
      <div style={styles.cardBody}>
        <div style={{display:'flex',alignItems:'flex-start',gap:'12px',padding:'14px 16px',background:'rgba(22,163,74,0.08)',border:'1px solid rgba(22,163,74,0.2)',borderRadius:'8px',marginBottom:'18px'}}>
          <span style={{fontSize:'1.2rem'}}>✅</span>
          <div>
            <strong style={{display:'block',fontSize:'0.9rem',color:'#166534'}}>Cloudinary is configured</strong>
            <span style={{display:'block',fontSize:'0.82rem',color:'#64748B',marginTop:'3px'}}>Secure server-side credentials are active.</span>
          </div>
        </div>
        <p style={{fontSize:'0.85rem',color:'#64748B',lineHeight:'1.6',marginBottom:'8px'}}>
          Upload images from the <strong>Temple Info</strong> panel or the <strong>Gallery</strong> panel. Uploads are signed securely by the server.
        </p>
      </div>
    </div>
  );
}

// ── PASSWORD ──────────────────────────────────
function PasswordPanel({ showToast }) {
  const [pw, setPw] = useState({cur:'',nw:'',con:''});
  function change() {
    const creds = JSON.parse(localStorage.getItem('adminCreds')||'null')||{user:'admin',pass:'temple@123'};
    if (pw.cur !== creds.pass) return showToast('❌ Wrong current password','err');
    if (pw.nw.length < 6) return showToast('❌ 6+ chars required','err');
    if (pw.nw !== pw.con) return showToast('❌ Passwords do not match','err');
    localStorage.setItem('adminCreds',JSON.stringify({user:creds.user,pass:pw.nw}));
    setPw({cur:'',nw:'',con:''});
    showToast('✅ Password updated!','ok');
  }
  return (
    <div style={{...styles.card,maxWidth:'400px'}}>
      <div style={styles.cardHeader}><span style={styles.cardTitle}>🔑 Change Password</span></div>
      <div style={styles.cardBody}>
        {[['cur','Current Password'],['nw','New Password'],['con','Confirm New Password']].map(([k,label])=>(
          <div key={k} style={{marginBottom:'14px'}}>
            <label style={{display:'block',fontSize:'0.78rem',fontWeight:600,marginBottom:'5px'}}>{label}</label>
            <input type="password" value={pw[k]} onChange={e=>setPw(p=>({...p,[k]:e.target.value}))} />
          </div>
        ))}
        <button style={styles.btnPrimary} onClick={change}>🔑 Update Password</button>
      </div>
    </div>
  );
}
