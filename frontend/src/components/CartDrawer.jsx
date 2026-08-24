import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { inr } from '../fmt';

export default function CartDrawer() {
  const { cart, isOpen, closeDrawer, update, remove } = useCart();
  const items = cart?.items || [];
  const total = items.reduce((n, i) => n + (i.product?.price || 0) * i.quantity, 0);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="drawer-backdrop" onClick={closeDrawer} />

      {/* Slide-out Panel */}
      <aside className="cart-drawer">
        <div className="drawer-header">
          <h2>Your Bag ({items.length})</h2>
          <button className="drawer-close" onClick={closeDrawer} aria-label="Close cart drawer">✕</button>
        </div>

        {!items.length ? (
          <div className="drawer-empty">
            <span style={{ fontSize: 32 }}>🛍️</span>
            <p>Your bag is empty.</p>
            <Link to="/shop" onClick={closeDrawer} className="button" style={{ marginTop: 12, padding: '10px 18px', fontSize: 13 }}>
              Shop the Collection →
            </Link>
          </div>
        ) : (
          <>
            <div className="drawer-body">
              {items.map(i => (
                <div key={i._id} className="drawer-item">
                  <img src={i.product?.images?.[0]?.url || 'https://placehold.co/100x120?text=OXSTORE'} alt={i.product?.name || ''} />
                  <div className="drawer-item-details">
                    <h4>{i.product?.name}</h4>
                    <p className="drawer-item-meta">{[i.size, i.color].filter(Boolean).join(' · ')}</p>
                    <strong className="drawer-item-price">{inr(i.product?.price)}</strong>
                    <div className="drawer-item-qty">
                      <button onClick={() => update(i._id, i.quantity - 1)}>−</button>
                      <span>{i.quantity}</span>
                      <button onClick={() => update(i._id, i.quantity + 1)}>+</button>
                    </div>
                  </div>
                  <button className="drawer-item-remove" onClick={() => remove(i._id)} title="Remove item">✕</button>
                </div>
              ))}
            </div>

            <div className="drawer-footer">
              <div className="drawer-subtotal">
                <span>Subtotal</span>
                <strong>{inr(total)}</strong>
              </div>
              <small className="drawer-note">Shipping & taxes calculated at checkout.</small>
              <div className="drawer-actions">
                <Link to="/cart" onClick={closeDrawer} className="button light wide" style={{ border: '1px solid var(--ink)', padding: '12px' }}>
                  View Bag
                </Link>
                <Link to="/checkout" onClick={closeDrawer} className="button wide" style={{ padding: '12px', marginTop: 0 }}>
                  Checkout
                </Link>
              </div>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
