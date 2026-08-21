import Head from 'next/head';
import { useState, useEffect, useRef } from 'react';

export async function getServerSideProps() {
  try {
    const { connectDB } = await import('../lib/db');
    const Config = (await import('../models/Config')).default;
    await connectDB();
    let cfg = await Config.findOne({ key: 'main' }).lean();
    if (!cfg) cfg = await Config.create({ key: 'main' }).then(d => d.toObject());
    // Convert MongoDB _id etc to serializable
    cfg = JSON.parse(JSON.stringify(cfg));
    return { props: { cfg } };
  } catch (e) {
    return { props: { cfg: null, error: e.message } };
  }
}

export default function Home({ cfg }) {
  const C = cfg || {};
  const [lightbox, setLightbox]   = useState(null);
  const [donateAmt, setDonateAmt] = useState('');
  const [toast, setToast]         = useState(null);
  const [submitting, setSubmitting] = useState({});

  const donateForm  = useRef({});
  const enquiryForm = useRef({});

  useEffect(() => {
    if (toast) { const t = setTimeout(() => setToast(null), 4500); return () => clearTimeout(t); }
  }, [toast]);

  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
    }, { threshold: 0.12 });
    document.querySelectorAll('.fade-in').forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  async function submitDonation(e) {
    e.preventDefault();
    const f = donateForm.current;
    if (!f.name?.value?.trim()) return showToast('Please enter your name', 'error');
    if (!f.phone?.value?.trim() || f.phone.value.trim().length < 10) return showToast('Please enter a valid phone number', 'error');
    if (!donateAmt || isNaN(donateAmt) || Number(donateAmt) <= 0) return showToast('Please enter a valid amount', 'error');
    setSubmitting(s => ({ ...s, donate: true }));
    try {
      const res = await fetch('/api/donations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: f.name.value, phone: f.phone.value, email: f.email?.value || '', amount: Number(donateAmt), purpose: f.purpose?.value || 'General', message: f.message?.value || '' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      e.target.reset(); setDonateAmt('');
      showToast('🙏 Donation recorded! Temple office will contact you for payment.', 'success');
    } catch (err) { showToast('❌ Error: ' + err.message, 'error'); }
    finally { setSubmitting(s => ({ ...s, donate: false })); }
  }

  async function submitEnquiry(e) {
    e.preventDefault();
    const f = enquiryForm.current;
    if (!f.name?.value?.trim()) return showToast('Please enter your name', 'error');
    if (!f.phone?.value?.trim() || f.phone.value.trim().length < 10) return showToast('Please enter a valid phone number', 'error');
    if (!f.message?.value?.trim()) return showToast('Please write your message', 'error');
    setSubmitting(s => ({ ...s, enquiry: true }));
    try {
      const res = await fetch('/api/enquiries', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: f.name.value, phone: f.phone.value, email: f.email?.value || '', type: f.type?.value || 'General', message: f.message.value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      e.target.reset();
      showToast('📨 Enquiry submitted! We will contact you soon.', 'success');
    } catch (err) { showToast('❌ Error: ' + err.message, 'error'); }
    finally { setSubmitting(s => ({ ...s, enquiry: false })); }
  }

  return (
    <>
      <Head>
        <title>{C.templeName || 'Shri Temple Mandir'}</title>
        <meta name="description" content={C.templeTagline || 'Sacred temple website'} />
      </Head>

      {/* TOPBAR */}
      <div className="topbar" dangerouslySetInnerHTML={{ __html: C.topbarText || '🙏 Jay Shri Ram 🙏' }} />

      {/* NAVBAR */}
      <NavBar templeName={C.templeName} templeLocation={C.templeLocation} />

      {/* HERO */}
      <section className="hero">
        <div className="hero-badge">॥ {C.heroShloka} ॥</div>
        <h1>Welcome to <span>{C.templeName}</span></h1>
        <p className="hero-sub">{C.heroSubShloka}</p>
        <p className="hero-tagline">{C.templeTagline}</p>
        <div className="hero-actions">
          <a href="#about" className="btn btn-primary">🛕 Explore Temple</a>
          <a href="#donate" className="btn btn-outline">🙏 Donate Now</a>
        </div>
        <div className="hero-scroll"><span>SCROLL</span><span>↓</span></div>
      </section>

      {/* ABOUT */}
      <section id="about">
        <div className="about-grid">
          <div className="about-image-wrap fade-in">
            <img
              src={C.aboutImageUrl || C.galleryImages?.[0]?.url || 'https://images.unsplash.com/photo-1561361058-c24cecae35ca?w=800&q=80'}
              alt="Temple"
            />
            <div className="about-image-badge">
              <strong>{C.templeEstYear}</strong>
            </div>
          </div>
          <div className="about-content fade-in">
            <span className="section-label">About The Temple</span>
            <div className="divider"><span>🔱</span></div>
            <h2 className="section-title">A Divine Legacy of Faith &amp; Devotion</h2>
            <p>{C.aboutPara1}</p>
            <p>{C.aboutPara2}</p>
            <p>{C.aboutPara3}</p>
            <div className="about-stats">
              <div className="about-stat"><strong>{C.stat1}</strong><span>{C.stat1Label}</span></div>
              <div className="about-stat"><strong>{C.stat2}</strong><span>{C.stat2Label}</span></div>
              <div className="about-stat"><strong>{C.stat3}</strong><span>{C.stat3Label}</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* TIMINGS */}
      <section id="timing">
        <div className="section-header center">
          <span className="section-label">Darshan &amp; Puja Schedule</span>
          <div className="divider"><span>🔱</span></div>
          <h2 className="section-title" style={{ color: 'white' }}>Temple Timings</h2>
        </div>
        <div className="timing-grid">
          {(C.timings || []).map((t, i) => (
            <div className="timing-card fade-in" key={i}>
              <div className="timing-icon">{t.icon}</div>
              <h3>{t.title}</h3>
              <div className="time">{t.time}</div>
              <div className="days">{t.days}</div>
            </div>
          ))}
        </div>
      </section>

      {/* EVENTS */}
      <section id="events">
        <div className="section-header">
          <span className="section-label">Upcoming Celebrations</span>
          <div className="divider"><span>🔱</span></div>
          <h2 className="section-title">Events &amp; Festivals</h2>
        </div>
        <div className="events-grid">
          {(C.events || []).map((ev, i) => (
            <div className="event-card fade-in" key={i}>
              <div className="event-date-bar">
                <div className="event-day">{ev.day}</div>
                <div className="event-month-year">{ev.month} {ev.year}</div>
              </div>
              <div className="event-body">
                <h3>{ev.title}</h3>
                <p>{ev.desc}</p>
                <span className="event-tag">{ev.tag}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* GALLERY */}
      <section id="gallery">
        <div className="section-header center">
          <span className="section-label">Temple Photographs</span>
          <div className="divider"><span>🔱</span></div>
          <h2 className="section-title">Gallery</h2>
        </div>
        <div className="gallery-grid">
          {(C.galleryImages || []).map((img, i) => (
            <div className="gallery-item" key={i} onClick={() => setLightbox(img.url)}>
              <img src={img.url} alt={img.caption || 'Temple'} loading="lazy" />
              <div className="gallery-overlay">🔍</div>
            </div>
          ))}
        </div>
      </section>

      {/* LIGHTBOX */}
      {lightbox && (
        <div className="lightbox active" onClick={() => setLightbox(null)}>
          <button className="lightbox-close" onClick={() => setLightbox(null)}>✕</button>
          <img src={lightbox} alt="Gallery" onClick={e => e.stopPropagation()} />
        </div>
      )}

      {/* DONATE */}
      <section id="donate">
        <div className="donate-container">
          <div className="donate-info fade-in">
            <span className="section-label">Your Offerings</span>
            <div className="divider"><span>🔱</span></div>
            <h2>Your Donation Matters</h2>
            <p>Your generous contributions help us maintain the temple, conduct daily pujas, support festivals, and serve the community.</p>
            <div className="donate-amounts" id="donateAmounts">
              {[101, 251, 501, 1001, 2100].map(amt => (
                <button key={amt} className={donateAmt == amt ? 'active' : ''} onClick={() => setDonateAmt(String(amt))}>₹{amt}</button>
              ))}
              <button className={!donateAmt || ![101,251,501,1001,2100].map(String).includes(donateAmt) ? 'active' : ''} onClick={() => setDonateAmt('')}>Custom</button>
            </div>
            <div className="donate-purposes">
              {(C.donatePurposes || []).map((p, i) => <div className="purpose-item" key={i}>{p}</div>)}
            </div>
          </div>
          <form className="donate-form fade-in" onSubmit={submitDonation}>
            <h3>🙏 Make a Donation</h3>
            <div className="form-row">
              <div className="form-group"><label>Full Name *</label><input ref={el => donateForm.current.name = el} placeholder="Your name" /></div>
              <div className="form-group"><label>Phone *</label><input ref={el => donateForm.current.phone = el} placeholder="10-digit number" /></div>
            </div>
            <div className="form-group"><label>Email</label><input ref={el => donateForm.current.email = el} type="email" placeholder="email@example.com" /></div>
            <div className="form-row">
              <div className="form-group">
                <label>Amount (₹) *</label>
                <input value={donateAmt} onChange={e => setDonateAmt(e.target.value)} type="number" placeholder="Enter amount" />
              </div>
              <div className="form-group">
                <label>Purpose</label>
                <select ref={el => donateForm.current.purpose = el}>
                  <option>General</option><option>Puja</option><option>Festival</option><option>Maintenance</option><option>Charity</option>
                </select>
              </div>
            </div>
            <div className="form-group"><label>Message</label><textarea ref={el => donateForm.current.message = el} placeholder="Prayer request..."></textarea></div>
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={submitting.donate} type="submit">
              {submitting.donate ? 'Submitting...' : '🙏 Submit Donation Details'}
            </button>
          </form>
        </div>
      </section>

      {/* ENQUIRY */}
      <section id="enquiry">
        <div className="section-header center">
          <span className="section-label">Get in Touch</span>
          <div className="divider"><span>🔱</span></div>
          <h2 className="section-title">Send an Enquiry</h2>
        </div>
        <div className="enquiry-container">
          <form className="enquiry-form fade-in" onSubmit={submitEnquiry}>
            <div className="form-row">
              <div className="form-group"><label>Full Name *</label><input ref={el => enquiryForm.current.name = el} placeholder="Your name" /></div>
              <div className="form-group"><label>Phone *</label><input ref={el => enquiryForm.current.phone = el} placeholder="10-digit number" /></div>
            </div>
            <div className="form-group"><label>Email</label><input ref={el => enquiryForm.current.email = el} type="email" placeholder="email@example.com" /></div>
            <div className="form-group">
              <label>Enquiry Type</label>
              <select ref={el => enquiryForm.current.type = el}>
                <option>General Information</option><option>Puja Booking</option><option>Marriage / Ceremony</option>
                <option>Donation Query</option><option>Volunteer</option><option>Other</option>
              </select>
            </div>
            <div className="form-group"><label>Message *</label><textarea ref={el => enquiryForm.current.message = el} placeholder="Your enquiry..." style={{ minHeight: '120px' }}></textarea></div>
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={submitting.enquiry} type="submit">
              {submitting.enquiry ? 'Sending...' : '📨 Send Enquiry'}
            </button>
          </form>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact">
        <div className="section-header center">
          <span className="section-label">Find Us</span>
          <div className="divider"><span>🔱</span></div>
          <h2 className="section-title">Visit The Temple</h2>
        </div>
        <div className="contact-grid">
          <div className="contact-info">
            {[['📍','Address',C.contactAddress],['📞','Phone',C.contactPhone],['📧','Email',C.contactEmail],['⏰','Open Hours',C.contactHours],['🌐','Social',C.contactSocial]].map(([icon,label,val])=>(
              <div className="contact-item" key={label}>
                <div className="contact-icon">{icon}</div>
                <div className="contact-text"><strong>{label}</strong><span>{val}</span></div>
              </div>
            ))}
          </div>
          <div className="map-embed">
            {C.googleMapsEmbed ? <iframe src={C.googleMapsEmbed} allowFullScreen loading="lazy" /> : <><span style={{fontSize:'2rem'}}>📍</span><span>Map will be set from Admin Panel</span></>}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="footer-grid">
          <div className="footer-brand">
            <h3>{C.templeName}</h3>
            <p>A sacred place of devotion, peace and community. All are welcome to seek the blessings of {C.templeDeity}.</p>
          </div>
          <div className="footer-col">
            <h4>Quick Links</h4>
            <ul>{['about','timing','events','gallery','donate','enquiry'].map(s=><li key={s}><a href={`#${s}`}>{s.charAt(0).toUpperCase()+s.slice(1)}</a></li>)}</ul>
          </div>
          <div className="footer-col">
            <h4>Services</h4>
            <ul>{['Puja Booking','Marriage Booking','Satyanarayan Puja','Volunteer','Online Donation'].map(s=><li key={s}><a href="#enquiry">{s}</a></li>)}</ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} {C.templeName}. All rights reserved. 🙏</span>
          <a href="/admin" className="footer-admin-link">Admin</a>
        </div>
      </footer>

      {/* TOAST */}
      {toast && (
        <div className={`toast show ${toast.type}`}>
          <span>{toast.type === 'success' ? '✅' : '❌'}</span>
          <span>{toast.msg}</span>
        </div>
      )}
    </>
  );
}

function NavBar({ templeName, templeLocation }) {
  const [open, setOpen] = useState(false);
  return (
    <nav>
      <a href="#" className="nav-brand">
        <div className="logo-icon">🛕</div>
        <div className="brand-text">
          <h1>{templeName}</h1>
          <span>📍 {templeLocation}</span>
        </div>
      </a>
      <ul className={`nav-links ${open ? 'open' : ''}`}>
        {['about','timing','events','gallery','enquiry','contact'].map(s=>(
          <li key={s}><a href={`#${s}`} onClick={()=>setOpen(false)}>{s.charAt(0).toUpperCase()+s.slice(1)}</a></li>
        ))}
        <li><a href="#donate" className="btn-donate" onClick={()=>setOpen(false)}>🙏 Donate</a></li>
      </ul>
      <button className="hamburger" onClick={()=>setOpen(!open)} aria-label="Menu">
        <span/><span/><span/>
      </button>
    </nav>
  );
}
