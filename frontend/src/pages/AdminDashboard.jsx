import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { inr } from '../fmt';

export default function AdminDashboard(){
  const [stats, setStats] = useState();
  const [orders, setOrders] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [bannerMsg, setBannerMsg] = useState({ text: '', ok: false });
  const [savingBanner, setSavingBanner] = useState(false);

  const load = () => {
    api.get('/admin/stats').then(r => setStats(r.data));
    api.get('/admin/orders').then(r => setOrders(r.data.orders));
    api.get('/settings/announcements').then(r => setAnnouncements(r.data.announcements || []));
  };
  useEffect(load, []);

  const status = async (id, s) => {
    await api.patch(`/admin/orders/${id}/status`, { status: s, note: 'Updated by OxStore studio' });
    load();
  };

  const handleAnnouncementChange = (index, val) => {
    const copy = [...announcements];
    copy[index] = val;
    setAnnouncements(copy);
  };

  const addAnnouncementField = () => {
    setAnnouncements([...announcements, '']);
  };

  const removeAnnouncementField = (index) => {
    setAnnouncements(announcements.filter((_, i) => i !== index));
  };

  const saveAnnouncements = async (e) => {
    e.preventDefault();
    setSavingBanner(true);
    setBannerMsg({ text: '', ok: false });
    try {
      const { data } = await api.put('/settings/announcements', { announcements });
      setAnnouncements(data.announcements);
      setBannerMsg({ text: 'Live Announcement Ticker updated!', ok: true });
    } catch (err) {
      setBannerMsg({ text: err.response?.data?.message || 'Could not save banner.', ok: false });
    } finally {
      setSavingBanner(false);
    }
  };

  return (
    <main className="section">
      <div className="section-title" style={{ flexWrap: 'wrap', gap: 12 }}>
        <h1>Studio dashboard</h1>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link className="button light" to="/admin/coupons">Manage Coupons</Link>
          <Link className="button" to="/admin/products">Manage Products</Link>
        </div>
      </div>

      {stats && (
        <div className="stats">
          {[['Revenue', inr(stats.revenue)], ['Paid orders', stats.orders], ['Clients', stats.users], ['Products', stats.products]].map(([a, b]) => (
            <div key={a}><small>{a}</small><b>{b}</b></div>
          ))}
        </div>
      )}

      {/* ── Live Announcement Ticker Editor ── */}
      <div style={{ border: '1px solid var(--line)', padding: 24, marginBottom: 40, background: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h3 style={{ margin: 0, fontFamily: 'Playfair Display, serif', fontSize: 20 }}>Live Announcement Banner Ticker</h3>
            <small style={{ color: 'var(--muted)' }}>Messages display dynamically in the top cycling banner across the storefront.</small>
          </div>
          <button type="button" className="button light" style={{ padding: '6px 14px', fontSize: 12 }} onClick={addAnnouncementField}>+ Add Message</button>
        </div>

        <form onSubmit={saveAnnouncements}>
          {announcements.map((msg, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'center' }}>
              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: 'var(--muted)' }}>#{idx + 1}</span>
              <input
                type="text"
                required
                value={msg}
                onChange={e => handleAnnouncementChange(idx, e.target.value)}
                placeholder="e.g. COMPLIMENTARY SHIPPING ON ORDERS OVER ₹2,500"
                style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--line)', background: 'var(--paper)', fontSize: 13, outline: 'none' }}
              />
              {announcements.length > 1 && (
                <button type="button" className="link" style={{ color: '#c0392b', fontSize: 12 }} onClick={() => removeAnnouncementField(idx)}>Remove</button>
              )}
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
            <button className="button" disabled={savingBanner} style={{ padding: '10px 20px', fontSize: 13 }}>{savingBanner ? 'Saving…' : 'Save Live Banner'}</button>
            {bannerMsg.text && <span style={{ fontSize: 13, color: bannerMsg.ok ? '#2e7d32' : '#c0392b' }}>{bannerMsg.text}</span>}
          </div>
        </form>
      </div>

      <h2>Recent orders</h2>
      <div className="admin-orders">
        {orders.map(o => (
          <div key={o._id}>
            <span><b>{o.user?.name}</b><small>#{o._id.slice(-7)} · {inr(o.amount)}</small></span>
            <select value={o.status} onChange={e => status(o._id, e.target.value)}>
              {['processing', 'confirmed', 'shipped', 'delivered', 'cancelled'].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        ))}
      </div>
    </main>
  );
}
