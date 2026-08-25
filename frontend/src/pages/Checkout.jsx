import { useState } from 'react';
import { CardElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { useCart } from '../context/CartContext';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import { inr } from '../fmt';

const loadRazorpay = () => new Promise((resolve, reject) => {
  if (window.Razorpay) return resolve();
  const script = document.createElement('script');
  script.src = 'https://checkout.razorpay.com/v1/checkout.js';
  script.onload = resolve;
  script.onerror = () => reject(new Error('Razorpay checkout could not be loaded'));
  document.body.appendChild(script);
});

export default function Checkout(){
  const stripe = useStripe();
  const elements = useElements();
  const { cart, load } = useCart();
  const nav = useNavigate();
  const [method, setMethod] = useState('stripe');
  const [address, setAddress] = useState({ name: '', line1: '', line2: '', city: '', state: '', postalCode: '', country: '' });
  const [message, setMessage] = useState('');
  
  const [appliedCoupon, setAppliedCoupon] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('oxstore_applied_coupon') || 'null'); } catch { return null; }
  });
  const [couponCode, setCouponCode] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('oxstore_applied_coupon') || '{}').code || ''; } catch { return ''; }
  });
  const [couponMsg, setCouponMsg] = useState({ text: '', ok: false });
  const [busyCoupon, setBusyCoupon] = useState(false);

  const items = cart?.items || [];
  const subtotal = items.reduce((n, i) => n + (i.product?.price || 0) * i.quantity, 0);
  const discountAmount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const finalTotal = Math.max(0, subtotal - discountAmount);

  const applyCoupon = async (e) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    setBusyCoupon(true);
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
      setBusyCoupon(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponMsg({ text: '', ok: false });
    sessionStorage.removeItem('oxstore_applied_coupon');
  };

  const complete = async () => {
    sessionStorage.removeItem('oxstore_applied_coupon');
    await load();
    setMessage('Payment received. Your order is confirmed.');
    setTimeout(() => nav('/orders'), 800);
  };

  const pay = async (e) => {
    e.preventDefault();
    if (!items.length || (method === 'stripe' && !stripe)) return;
    try {
      setMessage('Creating your secure payment…');
      const { data: { order } } = await api.post('/orders', { shippingAddress: address, couponCode: appliedCoupon?.code });
      
      if (method === 'stripe') {
        const { data: { clientSecret } } = await api.post('/payments/intent', { orderId: order._id });
        const result = await stripe.confirmCardPayment(clientSecret, {
          payment_method: { card: elements.getElement(CardElement), billing_details: { name: address.name } }
        });
        if (result.error) throw result.error;
        await complete();
        return;
      }
      
      await loadRazorpay();
      const { data } = await api.post('/payments/razorpay/order', { orderId: order._id });
      const checkout = new window.Razorpay({
        key: data.keyId,
        amount: data.gatewayOrder.amount,
        currency: data.gatewayOrder.currency,
        name: 'OxStore',
        description: `Order ${order._id.slice(-7).toUpperCase()}`,
        order_id: data.gatewayOrder.id,
        prefill: { name: address.name },
        config: {
          display: {
            blocks: {
              upi: {
                name: 'Pay via UPI / QR Code (GPay, PhonePe, Paytm, BHIM)',
                instruments: [
                  { method: 'upi' }
                ]
              },
              other: {
                name: 'Cards, NetBanking & Wallets',
                instruments: [
                  { method: 'card' },
                  { method: 'netbanking' },
                  { method: 'wallet' }
                ]
              }
            },
            sequence: ['block.upi', 'block.other']
          }
        },
        theme: { color: '#171513' },
        handler: async (response) => {
          try {
            await api.post('/payments/razorpay/verify', { orderId: order._id, ...response });
            await complete();
          } catch (error) {
            setMessage(error.response?.data?.message || 'Razorpay payment verification failed');
          }
        }
      });
      checkout.on('payment.failed', response => setMessage(response.error.description || 'Razorpay payment was not completed'));
      checkout.open();
    } catch (e) {
      setMessage(e.response?.data?.message || e.message || 'Payment could not be completed');
    }
  };

  return (
    <main className="section checkout">
      <h1>Secure checkout</h1>
      <form onSubmit={pay}>
        <div className="address">
          <h2>Delivery</h2>
          {[
            ['name', 'Full name'],
            ['line1', 'Address'],
            ['line2', 'Apartment, suite (optional)'],
            ['city', 'City'],
            ['state', 'State / region'],
            ['postalCode', 'Postal code'],
            ['country', 'Country']
          ].map(([k, l]) => (
            <input key={k} required={k !== 'line2'} value={address[k]} onChange={e => setAddress({ ...address, [k]: e.target.value })} placeholder={l} />
          ))}
        </div>

        <div className="payment">
          <h2>Payment</h2>
          <div className="payment-options">
            <button type="button" className={method === 'stripe' ? 'selected' : ''} onClick={() => setMethod('stripe')}>Card / Stripe</button>
            <button type="button" className={method === 'razorpay' ? 'selected' : ''} onClick={() => setMethod('razorpay')}>UPI / Razorpay</button>
          </div>

          {method === 'stripe' ? (
            <div className="card-element">
              <CardElement options={{ style: { base: { fontSize: '16px', color: '#181614', '::placeholder': { color: '#958f88' } } } }} />
            </div>
          ) : (
            <div className="gateway-note" style={{ padding: 16, background: '#f7f5f1', border: '1px solid var(--line)', margin: '14px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)' }}>UPI & QR Code Enabled</span>
                <span style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', background: '#171513', color: '#fff', padding: '2px 6px', borderRadius: 2 }}>INSTANT</span>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
                Razorpay will open a secure window. You can scan the <strong>QR Code</strong> with any UPI app (GPay, PhonePe, Paytm, BHIM) or enter your UPI ID, as well as cards & netbanking.
              </p>
            </div>
          )}

          {/* ── Promo Code Card ── */}
          <div style={{ margin: '20px 0', padding: 16, border: '1px solid var(--line)', background: '#f7f5f1' }}>
            <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 600 }}>Have a promo code?</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                placeholder="e.g. OXWELCOME10"
                value={couponCode}
                onChange={e => setCouponCode(e.target.value.toUpperCase())}
                style={{ flex: 1, padding: '8px 10px', border: '1px solid var(--line)', background: '#fff', fontSize: 13, outline: 'none', textTransform: 'uppercase' }}
              />
              <button type="button" className="button light" disabled={busyCoupon} onClick={applyCoupon} style={{ padding: '8px 14px', fontSize: 12 }}>
                {busyCoupon ? 'Checking…' : 'Apply'}
              </button>
            </div>

            {couponMsg.text && <p style={{ fontSize: 12, margin: '8px 0 0', color: couponMsg.ok ? '#2e7d32' : '#c0392b' }}>{couponMsg.text}</p>}

            {appliedCoupon && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, background: '#e8f5e9', padding: '8px 12px' }}>
                <span style={{ fontSize: 12, color: '#2e7d32', fontFamily: 'DM Mono, monospace' }}>✓ Promo Code '{appliedCoupon.code}' Applied (-{inr(discountAmount)})</span>
                <button type="button" className="link" style={{ fontSize: 11, color: '#c0392b' }} onClick={removeCoupon}>Remove</button>
              </div>
            )}
          </div>

          <div style={{ borderTop: '1px solid var(--line)', paddingTop: 12, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
              <span>Subtotal</span><span>{inr(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#2e7d32', marginBottom: 4 }}>
                <span>Discount ({appliedCoupon?.code})</span><span>-{inr(discountAmount)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 600, marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--line)' }}>
              <span>Total Payable</span><span>{inr(finalTotal)}</span>
            </div>
          </div>

          <button className="button wide" disabled={method === 'stripe' && !stripe}>
            Pay {inr(finalTotal)} with {method === 'stripe' ? 'Stripe' : 'Razorpay'}
          </button>
          <small>Payments are encrypted and processed by {method === 'stripe' ? 'Stripe' : 'Razorpay'}.</small>
          {message && <p>{message}</p>}
        </div>
      </form>
    </main>
  );
}
