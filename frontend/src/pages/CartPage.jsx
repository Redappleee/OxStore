import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import api from '../api';
import { inr } from '../fmt';

export default function CartPage(){
  const { cart, update, remove } = useCart();
  const items = cart?.items || [];
  const subtotal = items.reduce((n, i) => n + (i.product?.price || 0) * i.quantity, 0);

  const [couponCode, setCouponCode] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('oxstore_applied_coupon') || '{}').code || ''; } catch { return ''; }
  });
  const [appliedCoupon, setAppliedCoupon] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('oxstore_applied_coupon') || 'null'); } catch { return null; }
  });
  const [couponMsg, setCouponMsg] = useState({ text: '', ok: false });
  const [busy, setBusy] = useState(false);

  const applyCoupon = async (e) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    setBusy(true);
    setCouponMsg({ text: '', ok: false });
    try {
      const { data } = await api.post('/coupons/apply', { code: couponCode, orderAmount: subtotal });
      setAppliedCoupon(data);
      sessionStorage.setItem('oxstore_applied_coupon', JSON.stringify(data));
      setCouponMsg({ text: data.message, ok: true });
    } catch (err) {
      setAppliedCoupon(null);
      sessionStorage.removeItem('oxstore_applied_coupon');
      setCouponMsg({ text: err.response?.data?.message || 'Could not apply coupon.', ok: false });
    } finally {
      setBusy(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponMsg({ text: '', ok: false });
    sessionStorage.removeItem('oxstore_applied_coupon');
  };

  const discountAmount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const finalTotal = Math.max(0, subtotal - discountAmount);

  return (
    <main className="section bag">
      <h1>Your bag</h1>
      {items.length ? (
        <>
          <div>
            {items.map(i => (
              <article className="bag-item" key={i._id}>
                <img src={i.product?.images?.[0]?.url} alt="" />
                <div>
                  <h3>{i.product?.name}</h3>
                  <p>{[i.size, i.color].filter(Boolean).join(' · ')}</p>
                  <strong>{inr(i.product?.price)}</strong>
                </div>
                <div className="qty">
                  <button onClick={() => update(i._id, i.quantity - 1)}>−</button>
                  {i.quantity}
                  <button onClick={() => update(i._id, i.quantity + 1)}>+</button>
                </div>
                <button className="link" onClick={() => remove(i._id)}>Remove</button>
              </article>
            ))}
          </div>

          <aside className="summary">
            <p>Subtotal <b>{inr(subtotal)}</b></p>
            
            {/* ── Promo Code Box ── */}
            <div style={{ margin: '16px 0', paddingTop: 12, borderTop: '1px solid var(--line)' }}>
              <form onSubmit={applyCoupon} style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  placeholder="Promo Code (e.g. OXWELCOME10)"
                  value={couponCode}
                  onChange={e => setCouponCode(e.target.value.toUpperCase())}
                  style={{ flex: 1, padding: '8px 0', border: 0, borderBottom: '1px solid var(--line)', background: 'transparent', fontSize: 13, outline: 'none', textTransform: 'uppercase' }}
                />
                <button type="submit" className="button light" disabled={busy} style={{ padding: '8px 12px', fontSize: 12 }}>
                  {busy ? 'Applying…' : 'Apply'}
                </button>
              </form>

              {couponMsg.text && <p style={{ fontSize: 12, margin: '6px 0 0', color: couponMsg.ok ? '#2e7d32' : '#c0392b' }}>{couponMsg.text}</p>}

              {appliedCoupon && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, background: '#e8f5e9', padding: '6px 10px', borderRadius: 4 }}>
                  <span style={{ fontSize: 12, color: '#2e7d32', fontFamily: 'DM Mono, monospace' }}>✓ {appliedCoupon.code}</span>
                  <button type="button" className="link" style={{ fontSize: 11, color: '#c0392b' }} onClick={removeCoupon}>Remove</button>
                </div>
              )}
            </div>

            {discountAmount > 0 && (
              <p style={{ color: '#2e7d32' }}>Discount <b>-{inr(discountAmount)}</b></p>
            )}

            <p style={{ fontSize: 16, borderTop: '1px solid var(--line)', paddingTop: 10, marginTop: 10 }}>
              Total <b>{inr(finalTotal)}</b>
            </p>

            <small>Shipping and tax are calculated at checkout.</small>
            <Link className="button wide" to="/checkout">Secure checkout</Link>
          </aside>
        </>
      ) : (
        <div className="empty">Your bag is ready for something exceptional.<br/><Link to="/shop">Shop the collection →</Link></div>
      )}
    </main>
  );
}
