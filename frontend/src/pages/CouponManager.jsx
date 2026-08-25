import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

export default function CouponManager() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [msg, setMsg] = useState({ text: '', ok: false });
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({
    code: '',
    discountType: 'percentage',
    discountValue: '',
    minOrderAmount: '',
    maxDiscount: '',
    expiresAt: '',
    usageLimit: 100,
  });

  const loadCoupons = async () => {
    try {
      const { data } = await api.get('/coupons');
      setCoupons(data.coupons || []);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const handleCreate = async e => {
    e.preventDefault();
    setBusy(true);
    setMsg({ text: '', ok: false });
    try {
      const { data } = await api.post('/coupons', form);
      setMsg({ text: data.message || 'Coupon created!', ok: true });
      setShowModal(false);
      setForm({
        code: '',
        discountType: 'percentage',
        discountValue: '',
        minOrderAmount: '',
        maxDiscount: '',
        expiresAt: '',
        usageLimit: 100,
      });
      loadCoupons();
    } catch (e) {
      setMsg({ text: e.response?.data?.message || 'Failed to create coupon.', ok: false });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id, code) => {
    if (!window.confirm(`Delete coupon code '${code}'?`)) return;
    try {
      await api.delete(`/coupons/${id}`);
      setCoupons(c => c.filter(item => item._id !== id));
    } catch {
      alert('Could not delete coupon.');
    }
  };

  return (
    <main className="section" style={{ maxWidth: 1100 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Link to="/admin" style={{ fontSize: 13, textDecoration: 'underline', color: 'var(--muted)' }}>← Admin Dashboard</Link>
          <h1 style={{ margin: '8px 0 0', fontFamily: 'Playfair Display, serif' }}>Discount & Promo Codes</h1>
        </div>
        <button className="button" onClick={() => setShowModal(true)}>+ Create Coupon Code</button>
      </div>

      {msg.text && (
        <p style={{ padding: 12, background: msg.ok ? '#e8f5e9' : '#ffebee', color: msg.ok ? '#2e7d32' : '#c0392b', fontSize: 13, marginBottom: 20 }}>
          {msg.text}
        </p>
      )}

      {loading ? (
        <p style={{ color: 'var(--muted)' }}>Loading coupons…</p>
      ) : !coupons.length ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#f7f5f1', border: '1px solid var(--line)' }}>
          <p style={{ margin: 0, fontWeight: 500 }}>No promo codes created yet.</p>
          <small style={{ color: 'var(--muted)' }}>Create discount codes like OXWELCOME10 or FLAT500 for your customers.</small>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          {coupons.map(c => (
            <div key={c._id} style={{ border: '1px solid var(--line)', padding: 18, background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <span style={{ fontFamily: 'DM Mono, monospace', fontWeight: 700, fontSize: 16, background: '#171513', color: '#fff', padding: '3px 10px', borderRadius: 2 }}>
                    {c.code}
                  </span>
                  <span style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', background: c.isActive ? '#e8f5e9' : '#ffebee', color: c.isActive ? '#2e7d32' : '#c0392b', padding: '2px 8px' }}>
                    {c.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>
                <p style={{ margin: '4px 0', fontSize: 14, fontWeight: 500 }}>
                  Discount: {c.discountType === 'percentage' ? `${c.discountValue}% OFF` : `₹${c.discountValue} OFF`}
                  {c.maxDiscount ? ` (Cap: ₹${c.maxDiscount})` : ''}
                </p>
                <small style={{ color: 'var(--muted)', display: 'block' }}>
                  Min order: ₹{c.minOrderAmount || 0} · Used: {c.usedCount} / {c.usageLimit}
                  {c.expiresAt ? ` · Expires: ${new Date(c.expiresAt).toLocaleDateString()}` : ' · No expiration'}
                </small>
              </div>

              <button className="link" style={{ color: '#c0392b', fontSize: 13, fontWeight: 500 }} onClick={() => handleDelete(c._id, c.code)}>
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Create Coupon Modal ── */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 16 }}>
          <div style={{ background: '#fff', width: '100%', maxWidth: 520, padding: 28, borderRadius: 8, boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
            <h2 style={{ fontFamily: 'Playfair Display, serif', margin: '0 0 20px' }}>Create New Promo Code</h2>
            <form onSubmit={handleCreate} style={{ display: 'grid', gap: 16 }}>
              <div>
                <label className="eyebrow" style={{ display: 'block', marginBottom: 6 }}>Coupon Code</label>
                <input
                  required
                  placeholder="e.g. WELCOME10"
                  value={form.code}
                  onChange={e => setForm({ ...form, code: e.target.value })}
                  style={{ width: '100%', padding: '10px 0', border: 0, borderBottom: '1px solid var(--line)', outline: 'none', textTransform: 'uppercase', fontFamily: 'DM Mono, monospace', fontSize: 15 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label className="eyebrow" style={{ display: 'block', marginBottom: 6 }}>Discount Type</label>
                  <select
                    value={form.discountType}
                    onChange={e => setForm({ ...form, discountType: e.target.value })}
                    style={{ width: '100%', padding: '10px 0', border: 0, borderBottom: '1px solid var(--line)', background: 'transparent' }}>
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="eyebrow" style={{ display: 'block', marginBottom: 6 }}>
                    {form.discountType === 'percentage' ? 'Percentage (e.g. 15)' : 'Amount in ₹ (e.g. 500)'}
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder={form.discountType === 'percentage' ? '15' : '500'}
                    value={form.discountValue}
                    onChange={e => setForm({ ...form, discountValue: e.target.value })}
                    style={{ width: '100%', padding: '10px 0', border: 0, borderBottom: '1px solid var(--line)', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label className="eyebrow" style={{ display: 'block', marginBottom: 6 }}>Min Order Amount (₹)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={form.minOrderAmount}
                    onChange={e => setForm({ ...form, minOrderAmount: e.target.value })}
                    style={{ width: '100%', padding: '10px 0', border: 0, borderBottom: '1px solid var(--line)', outline: 'none' }}
                  />
                </div>
                <div>
                  <label className="eyebrow" style={{ display: 'block', marginBottom: 6 }}>Usage Limit</label>
                  <input
                    type="number"
                    placeholder="100"
                    value={form.usageLimit}
                    onChange={e => setForm({ ...form, usageLimit: e.target.value })}
                    style={{ width: '100%', padding: '10px 0', border: 0, borderBottom: '1px solid var(--line)', outline: 'none' }}
                  />
                </div>
              </div>

              <div>
                <label className="eyebrow" style={{ display: 'block', marginBottom: 6 }}>Expiration Date (Optional)</label>
                <input
                  type="date"
                  value={form.expiresAt}
                  onChange={e => setForm({ ...form, expiresAt: e.target.value })}
                  style={{ width: '100%', padding: '10px 0', border: 0, borderBottom: '1px solid var(--line)', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                <button type="submit" className="button" disabled={busy} style={{ flex: 1 }}>
                  {busy ? 'Creating…' : 'Save Coupon'}
                </button>
                <button type="button" className="button light" onClick={() => setShowModal(false)} style={{ flex: 1 }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
