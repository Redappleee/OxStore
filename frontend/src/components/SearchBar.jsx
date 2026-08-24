import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { inr } from '../fmt';

export default function SearchBar() {
  const [q, setQ] = useState('');
  const [items, setItems] = useState([]);
  const [active, setActive] = useState(-1);
  const [focused, setFocused] = useState(false);
  const timer = useRef();
  const nav = useNavigate();

  useEffect(() => {
    clearTimeout(timer.current);
    if (q.trim().length < 2) return setItems([]);
    timer.current = setTimeout(
      () => api.get('/products/suggest', { params: { q } }).then(r => setItems(r.data)).catch(() => {}),
      250
    );
    return () => clearTimeout(timer.current);
  }, [q]);

  const go = v => {
    const query = v || q;
    if (query) nav(`/shop?q=${encodeURIComponent(query)}`);
    setItems([]);
    setFocused(false);
  };

  return (
    <div className={`search-pill-container ${focused ? 'focused' : ''}`}>
      <span className="search-icon">🔍</span>
      <input
        className="search-input"
        value={q}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 200)}
        onChange={e => { setQ(e.target.value); setActive(-1); }}
        onKeyDown={e => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setActive(Math.min(active + 1, items.length - 1)); }
          if (e.key === 'ArrowUp') { e.preventDefault(); setActive(Math.max(active - 1, 0)); }
          if (e.key === 'Enter') go(active >= 0 ? items[active].name : q);
        }}
        placeholder="Search modern essentials..."
        aria-label="Search products"
      />
      {q && (
        <button type="button" className="search-clear-btn" onClick={() => { setQ(''); setItems([]); }}>
          ✕
        </button>
      )}

      {items.length > 0 && focused && (
        <div className="search-suggestions-dropdown">
          <div className="suggestions-header">Matching pieces ({items.length})</div>
          {items.map((p, i) => (
            <button
              className={`suggestion-row ${i === active ? 'active' : ''}`}
              onMouseDown={() => go(p.name)}
              key={p._id}
            >
              {p.images?.[0] && <img src={p.images[0].url} alt={p.name} className="suggestion-img" />}
              <div className="suggestion-info">
                <span className="suggestion-title">{p.name}</span>
                <span className="suggestion-sub">
                  <small className="suggestion-cat">{p.category || 'Collection'}</small>
                  <strong className="suggestion-price">{inr(p.price)}</strong>
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
