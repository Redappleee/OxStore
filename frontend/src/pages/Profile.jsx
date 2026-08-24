import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { inr } from '../fmt';
import { useWishlist } from '../context/WishlistContext';
import OrderTimeline from '../components/OrderTimeline';
import ProductCard from '../components/ProductCard';

/* ─── Avatar ─────────────────────────────────────────────── */
function Avatar({ name, src, size = 72, onUpload }) {
  const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const hue = [...(name || '')].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  const [uploading, setUploading] = useState(false);
  const [imgError, setImgError] = useState(false);

  const handleFile = async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('avatar', file);
    try {
      const { data } = await api.patch('/auth/me/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setImgError(false);
      onUpload?.(data.user.avatar);
    } catch {} finally { setUploading(false); }
  };

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      {src && !imgError
        ? <img src={src} alt={name} referrerPolicy="no-referrer" onError={() => setImgError(true)} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }} />
        : <div style={{
            width: size, height: size, borderRadius: '50%',
            background: `hsl(${hue},38%,52%)`, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: size * 0.33,
            letterSpacing: '1px', userSelect: 'none',
          }}>{initials}</div>
      }
      {onUpload !== undefined && (
        <label style={{
          position: 'absolute', bottom: 0, right: 0,
          width: 24, height: 24, borderRadius: '50%',
          background: 'var(--ink)', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', fontSize: 12, border: '2px solid var(--paper)',
        }} title="Change photo">
          {uploading ? '⏳' : '📷'}
          <input type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
        </label>
      )}
    </div>
  );
}


/* ─── Section message helper ─────────────────────────────── */
function Msg({ text, ok }) {
  if (!text) return null;
  return (
    <p style={{ fontSize: 13, margin: '14px 0 0', color: ok ? '#2e7d32' : '#c0392b' }}>
      {ok ? '✓ ' : ''}{text}
    </p>
  );
}

/* ─── Input field ────────────────────────────────────────── */
function Field({ label, ...props }) {
  return (
    <div>
      <label style={S.label}>{label}</label>
      {props.as === 'textarea'
        ? <textarea style={{ ...S.input, border: '1px solid var(--line)', padding: 10, resize: 'vertical', height: 80 }} {...props} />
        : <input style={S.input} {...props} />}
    </div>
  );
}

/* ─── TAB: Account ───────────────────────────────────────── */
function TabAccount({ user, setUser }) {
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [msg, setMsg] = useState({ text: '', ok: false });
  const [busy, setBusy] = useState(false);

  const save = async e => {
    e.preventDefault(); setBusy(true); setMsg({ text: '', ok: false });
    try {
      const { data } = await api.patch('/auth/me', { name, phone });
      setUser(u => ({ ...u, ...data.user }));
      setMsg({ text: 'Profile updated.', ok: true });
    } catch (e) {
      setMsg({ text: e.response?.data?.message || 'Could not save.', ok: false });
    } finally { setBusy(false); }
  };

  return (
    <div>
      <h2 style={S.tabTitle}>Account details</h2>
      <form onSubmit={save} className="profile-grid2">
        <Field label="Full name" value={name} onChange={e => setName(e.target.value)} required />
        <Field label="Email address" value={user?.email || ''} disabled />
        <Field label="Phone number" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 00000 00000" style={{ gridColumn: '1/-1', ...S.input }} />
        <div style={{ gridColumn: '1/-1' }}>
          <button className="button" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
          <Msg {...msg} />
        </div>
      </form>

      <div style={S.divider} />
      <ChangePassword setUser={setUser} />
    </div>
  );
}

function ChangePassword({ setUser }) {
  const nav = useNavigate();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [msg, setMsg] = useState({ text: '', ok: false });
  const [busy, setBusy] = useState(false);

  const submit = async e => {
    e.preventDefault();
    if (form.newPassword !== form.confirm) { setMsg({ text: 'New passwords do not match.', ok: false }); return; }
    setBusy(true); setMsg({ text: '', ok: false });
    try {
      await api.patch('/auth/me/password', { currentPassword: form.currentPassword, newPassword: form.newPassword });
      setMsg({ text: 'Password changed. Please sign in again.', ok: true });
      setUser(null);
      setTimeout(() => nav('/login'), 1500);
    } catch (e) {
      setMsg({ text: e.response?.data?.message || 'Could not change password.', ok: false });
    } finally { setBusy(false); }
  };

  return (
    <>
      <h3 style={{ ...S.tabTitle, fontSize: 18, marginBottom: 20 }}>Change password</h3>
      <form onSubmit={submit} className="profile-grid2">
        <div style={{ gridColumn: '1/-1' }}>
          <Field label="Current password" type="password" value={form.currentPassword}
            onChange={e => setForm(f => ({ ...f, currentPassword: e.target.value }))} required />
        </div>
        <Field label="New password (min 8 chars)" type="password" value={form.newPassword}
          onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))} required minLength={8} />
        <Field label="Confirm new password" type="password" value={form.confirm}
          onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))} required />
        <div style={{ gridColumn: '1/-1' }}>
          <button className="button" disabled={busy}>{busy ? 'Saving…' : 'Update password'}</button>
          <Msg {...msg} />
        </div>
      </form>
    </>
  );
}

/* ─── TAB: Orders ────────────────────────────────────────── */
function TabOrders() {
  const [orders, setOrders] = useState([]);
  const [open, setOpen] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/orders').then(r => setOrders(r.data.orders)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ color: 'var(--muted)' }}>Loading orders…</p>;
  if (!orders.length) return (
    <div style={S.empty}>
      <span style={{ fontSize: 36 }}>📦</span>
      <p>No orders yet. <Link to="/shop" style={{ textDecoration: 'underline' }}>Shop the collection →</Link></p>
    </div>
  );

  return (
    <div>
      <h2 style={S.tabTitle}>Order history</h2>
      {orders.map(o => (
        <article key={o._id} style={S.orderCard}>
          <button style={S.orderHead} onClick={() => setOpen(open === o._id ? null : o._id)}>
            <div>
              <span style={{ fontWeight: 600, fontSize: 13 }}>#{o._id.slice(-7).toUpperCase()}</span>
              <small style={S.muted}> · {new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} · {o.items.length} item(s)</small>
            </div>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <span style={{ ...S.statusBadge, background: STATUS_COLOR[o.status] || '#edeae4' }}>{o.status}</span>
              <strong style={{ fontSize: 15 }}>{inr(o.amount)}</strong>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>{open === o._id ? '▲' : '▼'}</span>
            </div>
          </button>
          {open === o._id && (
            <div style={{ padding: '16px 0 8px', borderTop: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
                {o.items.map(i => (
                  <div key={i._id} style={S.orderItem}>
                    {i.image && <img src={i.image} alt={i.name} style={S.orderItemImg} />}
                    <div>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>{i.name}</p>
                      <p style={{ ...S.muted, margin: '2px 0' }}>{[i.size, i.color].filter(Boolean).join(' · ')} × {i.quantity}</p>
                      <p style={{ margin: 0, fontSize: 13 }}>{inr(i.price)}</p>
                    </div>
                  </div>
                ))}
              </div>
              <OrderTimeline timeline={o.timeline} />
              {o.shippingAddress && (
                <p style={{ ...S.muted, fontSize: 12, marginTop: 10 }}>
                  Deliver to: {[o.shippingAddress.line1, o.shippingAddress.city, o.shippingAddress.state, o.shippingAddress.postalCode].filter(Boolean).join(', ')}
                </p>
              )}
            </div>
          )}
        </article>
      ))}
    </div>
  );
}

const STATUS_COLOR = { processing: '#fff3e0', confirmed: '#e8f5e9', shipped: '#e3f2fd', delivered: '#f3e5f5', cancelled: '#fce4ec' };

/* ─── TAB: Wishlist ──────────────────────────────────────── */
function TabWishlist() {
  const { wishlist } = useWishlist();
  const items = wishlist.products || [];
  if (!items.length) return (
    <div style={S.empty}>
      <span style={{ fontSize: 36 }}>♡</span>
      <p>Nothing saved yet. <Link to="/shop" style={{ textDecoration: 'underline' }}>Explore the collection →</Link></p>
    </div>
  );
  return (
    <div>
      <h2 style={S.tabTitle}>Saved pieces ({items.length})</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 16 }}>
        {items.map(p => <ProductCard key={p._id} product={p} />)}
      </div>
    </div>
  );
}

/* ─── TAB: Addresses ─────────────────────────────────────── */
const ADDR_BLANK = { label: '', name: '', line1: '', line2: '', city: '', state: '', postalCode: '', country: 'India', phone: '' };

function TabAddresses() {
  const STORE_KEY = 'oxstore_addresses';
  const load = () => { try { return JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); } catch { return []; } };
  const [addresses, setAddresses] = useState(load);
  const [editing, setEditing] = useState(null); // null | 'new' | index
  const [form, setForm] = useState(ADDR_BLANK);

  const persist = list => { setAddresses(list); localStorage.setItem(STORE_KEY, JSON.stringify(list)); };
  const openNew = () => { setForm(ADDR_BLANK); setEditing('new'); };
  const openEdit = i => { setForm(addresses[i]); setEditing(i); };
  const remove = i => { if (window.confirm('Remove this address?')) persist(addresses.filter((_, n) => n !== i)); };
  const setDefault = i => persist(addresses.map((a, n) => ({ ...a, isDefault: n === i })));

  const save = e => {
    e.preventDefault();
    if (editing === 'new') persist([...addresses, { ...form, isDefault: addresses.length === 0 }]);
    else persist(addresses.map((a, n) => n === editing ? form : a));
    setEditing(null);
  };

  if (editing !== null) return (
    <div>
      <button className="link" onClick={() => setEditing(null)} style={{ fontSize: 13, marginBottom: 20 }}>← Back</button>
      <h2 style={S.tabTitle}>{editing === 'new' ? 'Add address' : 'Edit address'}</h2>
      <form onSubmit={save} className="profile-grid2">
        <div style={{ gridColumn: '1/-1' }}><Field label="Label (e.g. Home, Office)" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="Home" /></div>
        <Field label="Full name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
        <Field label="Phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
        <div style={{ gridColumn: '1/-1' }}><Field label="Address line 1" value={form.line1} onChange={e => setForm(f => ({ ...f, line1: e.target.value }))} required /></div>
        <div style={{ gridColumn: '1/-1' }}><Field label="Address line 2 (optional)" value={form.line2} onChange={e => setForm(f => ({ ...f, line2: e.target.value }))} /></div>
        <Field label="City" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} required />
        <Field label="State" value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} required />
        <Field label="Postal code" value={form.postalCode} onChange={e => setForm(f => ({ ...f, postalCode: e.target.value }))} required />
        <Field label="Country" value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} />
        <div style={{ gridColumn: '1/-1', display: 'flex', gap: 12 }}>
          <button className="button" style={{ flex: 1 }}>Save address</button>
          <button type="button" className="button" onClick={() => setEditing(null)} style={{ flex: 1, background: 'transparent', color: 'var(--ink)', border: '1px solid var(--line)' }}>Cancel</button>
        </div>
      </form>
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 24 }}>
        <h2 style={{ ...S.tabTitle, margin: 0 }}>Saved addresses</h2>
        <button className="button" onClick={openNew} style={{ padding: '10px 18px', fontSize: 13 }}>+ Add address</button>
      </div>
      {!addresses.length && <div style={S.empty}><p style={{ color: 'var(--muted)' }}>No addresses saved yet.</p></div>}
      <div style={{ display: 'grid', gap: 12 }}>
        {addresses.map((a, i) => (
          <div key={i} style={{ ...S.addrCard, outline: a.isDefault ? '2px solid var(--ink)' : 'none' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                {a.label && <span style={S.addrLabel}>{a.label}</span>}
                {a.isDefault && <span style={S.defaultBadge}>Default</span>}
              </div>
              <p style={{ margin: 0, fontWeight: 500 }}>{a.name}</p>
              <p style={{ ...S.muted, margin: '3px 0 0', fontSize: 13, lineHeight: 1.5 }}>
                {[a.line1, a.line2, a.city, a.state, a.postalCode, a.country].filter(Boolean).join(', ')}
              </p>
              {a.phone && <p style={{ ...S.muted, margin: '3px 0 0', fontSize: 12 }}>{a.phone}</p>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
              <button className="link" style={{ fontSize: 12 }} onClick={() => openEdit(i)}>Edit</button>
              {!a.isDefault && <button className="link" style={{ fontSize: 12 }} onClick={() => setDefault(i)}>Set default</button>}
              <button className="link" style={{ fontSize: 12, color: '#c0392b' }} onClick={() => remove(i)}>Remove</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── TAB: Security ──────────────────────────────────────── */
function TabSecurity({ user, setUser }) {
  const nav = useNavigate();
  const [sessions, setSessions] = useState(user?.sessionCount || 1);
  const [signOutMsg, setSignOutMsg] = useState('');
  const [delConfirm, setDelConfirm] = useState(false);
  const [delPass, setDelPass] = useState('');
  const [delMsg, setDelMsg] = useState({ text: '', ok: false });
  const [busy, setBusy] = useState(false);

  const signOutAll = async () => {
    setBusy(true);
    try {
      await api.delete('/auth/me/sessions');
      setSignOutMsg('All sessions signed out.');
      setSessions(0);
      setUser(null);
      setTimeout(() => nav('/login'), 1200);
    } catch { setSignOutMsg('Could not sign out all sessions.'); }
    finally { setBusy(false); }
  };

  const deleteAccount = async e => {
    e.preventDefault(); setBusy(true); setDelMsg({ text: '', ok: false });
    try {
      await api.delete('/auth/me', { data: { password: delPass } });
      setDelMsg({ text: 'Account deleted.', ok: true });
      setUser(null);
      setTimeout(() => nav('/'), 1200);
    } catch (e) {
      setDelMsg({ text: e.response?.data?.message || 'Could not delete account.', ok: false });
    } finally { setBusy(false); }
  };

  return (
    <div>
      <h2 style={S.tabTitle}>Security</h2>

      {/* Sessions */}
      <div className="profile-sec-card" style={S.secCard}>
        <div>
          <p style={{ margin: 0, fontWeight: 600 }}>Active sessions</p>
          <p style={{ ...S.muted, margin: '4px 0 0', fontSize: 13 }}>You are currently signed in on {sessions} device(s).</p>
        </div>
        <button className="button" onClick={signOutAll} disabled={busy} style={{ whiteSpace: 'nowrap', padding: '10px 18px', fontSize: 13 }}>Sign out all devices</button>
        {signOutMsg && <p style={{ ...S.muted, fontSize: 12, gridColumn: '1/-1', marginTop: 4 }}>{signOutMsg}</p>}
      </div>

      {/* Account verification badge */}
      <div className="profile-sec-card" style={{ ...S.secCard, marginTop: 12 }}>
        <div>
          <p style={{ margin: 0, fontWeight: 600 }}>Email verification</p>
          <p style={{ ...S.muted, margin: '4px 0 0', fontSize: 13 }}>
            {user?.isVerified ? '✓ Your email is verified.' : '⚠ Your email is not yet verified.'}
          </p>
        </div>
        <span style={{ fontSize: 20 }}>{user?.isVerified ? '🔒' : '⚠️'}</span>
      </div>

      {/* Member since */}
      <div className="profile-sec-card" style={{ ...S.secCard, marginTop: 12 }}>
        <div>
          <p style={{ margin: 0, fontWeight: 600 }}>Member since</p>
          <p style={{ ...S.muted, margin: '4px 0 0', fontSize: 13 }}>
            {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
          </p>
        </div>
      </div>

      <div style={S.divider} />

      {/* Delete account */}
      <div style={{ border: '1px solid #fca5a5', padding: 24, background: '#fff5f5' }}>
        <p style={{ margin: '0 0 6px', fontWeight: 600, color: '#b91c1c' }}>Delete account</p>
        <p style={{ ...S.muted, margin: '0 0 16px', fontSize: 13 }}>This will permanently delete your account and all data. This action cannot be undone.</p>
        {!delConfirm
          ? <button className="button" onClick={() => setDelConfirm(true)} style={{ background: '#b91c1c', borderColor: '#b91c1c' }}>Delete my account</button>
          : (
            <form onSubmit={deleteAccount} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <Field label="Confirm your password to delete" type="password" value={delPass} onChange={e => setDelPass(e.target.value)} required />
              </div>
              <button className="button" disabled={busy} style={{ background: '#b91c1c', borderColor: '#b91c1c' }}>Confirm delete</button>
              <button type="button" className="button light" onClick={() => setDelConfirm(false)}>Cancel</button>
            </form>
          )}
        <Msg {...delMsg} />
      </div>
    </div>
  );
}

/* ─── TABS CONFIG ────────────────────────────────────────── */
const TABS = [
  { id: 'account', label: 'Account', icon: '👤' },
  { id: 'orders',  label: 'Orders',  icon: '📦' },
  { id: 'wishlist',label: 'Wishlist',icon: '♡'  },
  { id: 'addresses',label:'Addresses',icon: '📍'},
  { id: 'security',label: 'Security',icon: '🔒' },
];

/* ─── MAIN PROFILE ───────────────────────────────────────── */
export default function Profile({ user, setUser }) {
  const [tab, setTab] = useState('account');
  const [fullUser, setFullUser] = useState(user);
  const nav = useNavigate();

  // Fetch extended user info (phone, createdAt, sessionCount)
  useEffect(() => {
    api.get('/auth/me').then(r => setFullUser(r.data.user)).catch(() => {});
  }, []);

  const updateUser = useCallback(updated => {
    setFullUser(u => ({ ...u, ...updated }));
    setUser(u => ({ ...u, ...updated }));
  }, [setUser]);

  const logout = async () => {
    try { await api.post('/auth/logout'); } catch {}
    const { setAccessToken } = await import('../api');
    setAccessToken(null);
    setUser(null);
    nav('/');
  };

  if (!user) return null;

  return (
    <main className="profile-page">
      {/* ── Sidebar ── */}
      <aside className="profile-sidebar">
        <div className="profile-sidebar-top" style={S.sidebarTop}>
          <Avatar name={fullUser?.name} src={fullUser?.avatar} size={72} onUpload={url => updateUser({ avatar: url })} />
          <div className="profile-sidebar-user-info" style={{ marginTop: 14 }}>
            <p style={{ margin: 0, fontWeight: 600, fontSize: 16 }}>{fullUser?.name}</p>
            <p style={{ ...S.muted, margin: '3px 0 0', fontSize: 12 }}>{fullUser?.email}</p>
            {fullUser?.isVerified && <span style={S.verifiedPill}>✓ Verified</span>}
          </div>
        </div>

        <nav className="profile-tab-nav">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`profile-tab-btn${tab === t.id ? ' active' : ''}`}>
              <span style={{ fontSize: 16 }}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </nav>

        <div className="profile-signout-container" style={{ marginTop: 'auto', paddingTop: 32, borderTop: '1px solid var(--line)' }}>
          <button
            onClick={logout}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              width: '100%', textAlign: 'left',
              background: 'transparent', border: 'none',
              padding: '10px 12px', fontSize: 14,
              cursor: 'pointer', color: '#c0392b',
            }}>
            <span style={{ fontSize: 16 }}>↪</span>
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Content ── */}
      <section className="profile-content">
        {tab === 'account'   && <TabAccount   user={fullUser} setUser={updateUser} />}
        {tab === 'orders'    && <TabOrders />}
        {tab === 'wishlist'  && <TabWishlist />}
        {tab === 'addresses' && <TabAddresses />}
        {tab === 'security'  && <TabSecurity  user={fullUser} setUser={setUser} />}
      </section>
    </main>
  );
}

/* ─── STYLES ─────────────────────────────────────────────── */
const S = {
  page: {
    display: 'grid',
    gridTemplateColumns: '260px 1fr',
    gap: 0,
    maxWidth: 1200,
    margin: '0 auto',
    minHeight: 'calc(100vh - 78px)',
    alignItems: 'start',
  },
  sidebar: {
    borderRight: '1px solid var(--line)',
    padding: '48px 28px',
    position: 'sticky',
    top: 78,
    minHeight: 'calc(100vh - 78px)',
  },
  sidebarTop: {
    borderBottom: '1px solid var(--line)',
    paddingBottom: 28,
    marginBottom: 24,
  },
  tabNav: { display: 'flex', flexDirection: 'column', gap: 2 },
  tabBtn: {
    display: 'flex', alignItems: 'center', gap: 10,
    width: '100%', textAlign: 'left',
    background: 'transparent', border: 'none',
    padding: '10px 12px', fontSize: 14,
    cursor: 'pointer', color: 'var(--muted)',
    transition: 'background 0.15s, color 0.15s',
  },
  tabBtnActive: {
    background: '#edeae4',
    color: 'var(--ink)',
    fontWeight: 600,
  },
  content: {
    padding: '48px 48px 80px',
    minHeight: 'calc(100vh - 78px)',
  },
  tabTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 28, fontWeight: 500,
    margin: '0 0 28px',
  },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px 24px' },
  label: {
    display: 'block', fontSize: 11,
    letterSpacing: '0.8px', textTransform: 'uppercase',
    color: 'var(--muted)', marginBottom: 6,
  },
  input: {
    width: '100%', border: 0,
    borderBottom: '1px solid var(--line)',
    background: 'transparent', padding: '9px 0',
    outline: 'none', fontSize: 14, fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  divider: {
    borderTop: '1px solid var(--line)',
    margin: '36px 0',
  },
  muted: { color: 'var(--muted)', margin: 0 },
  verifiedPill: {
    display: 'inline-block', marginTop: 6,
    background: '#e8f5e9', color: '#2e7d32',
    fontSize: 10, padding: '2px 8px',
    fontFamily: "'DM Mono', monospace",
    letterSpacing: '0.5px',
  },
  orderCard: {
    border: '1px solid var(--line)',
    marginBottom: 12,
  },
  orderHead: {
    width: '100%', display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 18px',
    background: 'transparent', border: 'none',
    cursor: 'pointer', textAlign: 'left', flexWrap: 'wrap', gap: 8,
  },
  statusBadge: {
    fontSize: 11, padding: '3px 9px',
    fontFamily: "'DM Mono', monospace",
    letterSpacing: '0.5px', textTransform: 'uppercase',
  },
  orderItem: {
    display: 'flex', gap: 10,
    background: '#f7f5f1',
    padding: 10, flex: '0 0 auto',
  },
  orderItemImg: {
    width: 50, height: 65,
    objectFit: 'cover', background: '#e8e5e0', flexShrink: 0,
  },
  secCard: {
    display: 'grid',
    gridTemplateColumns: '1fr auto',
    alignItems: 'center',
    gap: 16,
    background: '#f7f5f1',
    border: '1px solid var(--line)',
    padding: '18px 20px',
  },
  addrCard: {
    display: 'flex', justifyContent: 'space-between',
    gap: 16, border: '1px solid var(--line)',
    padding: '18px 20px', alignItems: 'flex-start',
  },
  addrLabel: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 10, letterSpacing: '0.5px',
    textTransform: 'uppercase',
    background: '#edeae4', padding: '2px 8px',
  },
  defaultBadge: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 10, letterSpacing: '0.5px',
    background: 'var(--ink)', color: '#fff', padding: '2px 8px',
  },
  empty: {
    textAlign: 'center',
    padding: '60px 20px',
    color: 'var(--muted)',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 12,
  },
};
