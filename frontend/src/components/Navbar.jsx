import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SearchBar from './SearchBar';
import AnnouncementBanner from './AnnouncementBanner';
import { useCart } from '../context/CartContext';

function ProfileIcon({ user }) {
  const initials = (user?.name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const hue = [...(user?.name || '')].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return user?.avatar ? (
    <img
      src={user.avatar}
      alt={user.name || 'Profile'}
      title={user.name || 'Profile'}
      referrerPolicy="no-referrer"
      className="nav-avatar-img"
    />
  ) : (
    <div
      title={user?.name || 'Profile'}
      style={{
        width: 32, height: 32, borderRadius: '50%',
        background: `hsl(${hue},38%,52%)`, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 600, fontSize: 11, letterSpacing: '0.5px', userSelect: 'none'
      }}
    >
      {initials}
    </div>
  );
}

const CATEGORIES = [
  { name: 'All Collection', icon: '✦', sub: 'Explore full catalog', path: '/shop' },
  { name: 'Men', icon: '👔', sub: 'Tailored essentials', path: '/shop?gender=men' },
  { name: 'Women', icon: '👗', sub: 'Modern silhouettes', path: '/shop?gender=women' },
  { name: 'Accessories', icon: '👜', sub: 'Bags, leather & more', path: '/shop?category=Accessories' },
  { name: 'Outerwear', icon: '🧥', sub: 'Coats & jackets', path: '/shop?category=Outerwear' },
];

export default function Navbar({ user }) {
  const { cart } = useCart();
  const [catOpen, setCatOpen] = useState(false);
  const catRef = useRef(null);
  const nav = useNavigate();

  useEffect(() => {
    const handler = e => {
      if (catRef.current && !catRef.current.contains(e.target)) {
        setCatOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <>
      <AnnouncementBanner />
      <header className="luxury-header">
        <Link className="brand" to="/">
          OXSTORE<span>®</span>
        </Link>

        <SearchBar />

        <nav className="luxury-nav">
          <Link to="/shop" className="nav-item-link">Shop</Link>

          {/* Mega Dropdown */}
          <div className="nav-dropdown-container" ref={catRef}>
            <button
              className={`nav-dropdown-trigger ${catOpen ? 'active' : ''}`}
              onClick={() => setCatOpen(!catOpen)}
              onMouseEnter={() => setCatOpen(true)}
            >
              Categories <span className="caret">▾</span>
            </button>

            {catOpen && (
              <div className="mega-menu-card" onMouseLeave={() => setCatOpen(false)}>
                <div className="mega-menu-cols">
                  <div className="mega-menu-col-links">
                    <span className="mega-menu-label">COLLECTIONS</span>
                    {CATEGORIES.map(c => (
                      <button
                        key={c.name}
                        onClick={() => { setCatOpen(false); nav(c.path); }}
                        className="mega-menu-item"
                      >
                        <span className="mega-item-icon">{c.icon}</span>
                        <div>
                          <span className="mega-item-title">{c.name}</span>
                          <span className="mega-item-sub">{c.sub}</span>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="mega-menu-col-featured">
                    <span className="mega-menu-label">SEASONAL SPOTLIGHT</span>
                    <div className="spotlight-card" onClick={() => { setCatOpen(false); nav('/shop'); }}>
                      <div className="spotlight-badge">NEW ARRIVALS</div>
                      <h4>Autumn / Winter Collection</h4>
                      <p>Minimalist luxury crafted with 100% sustainable materials.</p>
                      <span className="spotlight-link">Explore Now →</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bag link with luxury badge counter */}
          <Link to="/cart" className="nav-item-link bag-link">
            Bag <b className="bag-badge">{cart?.items?.length || 0}</b>
          </Link>

          {user ? (
            <>
              <Link to="/profile" aria-label="Profile" className="nav-avatar-link">
                <ProfileIcon user={user} />
              </Link>
              {user.role === 'admin' && (
                <Link to="/admin" className="nav-item-link studio-link">Studio</Link>
              )}
            </>
          ) : (
            <Link to="/login" className="nav-item-link signin-link">Sign in</Link>
          )}
        </nav>
      </header>
    </>
  );
}
