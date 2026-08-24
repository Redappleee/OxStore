import { useEffect, useState } from 'react';
import api from '../api';

/* ── helpers ── */
const STARS = [1, 2, 3, 4, 5];

function StarRow({ value, interactive, onPick, size = 18 }) {
  const [hover, setHover] = useState(0);
  const active = interactive ? (hover || value) : value;
  return (
    <span style={{ display: 'inline-flex', gap: 2 }}>
      {STARS.map(n => (
        <span
          key={n}
          onClick={() => interactive && onPick(n)}
          onMouseEnter={() => interactive && setHover(n)}
          onMouseLeave={() => interactive && setHover(0)}
          style={{
            fontSize: size,
            cursor: interactive ? 'pointer' : 'default',
            color: n <= active ? '#c8952a' : '#dedad3',
            transition: 'color 0.15s',
            userSelect: 'none',
          }}>★</span>
      ))}
    </span>
  );
}

function Avatar({ name }) {
  const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  // deterministic hue from name
  const hue = [...(name || '')].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <div style={{
      width: 38, height: 38, borderRadius: '50%',
      background: `hsl(${hue},38%,58%)`,
      color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 600, fontSize: 13, flexShrink: 0, letterSpacing: '0.5px',
    }}>{initials}</div>
  );
}

function RatingSummary({ reviews }) {
  if (!reviews.length) return null;
  const avg = (reviews.reduce((s, r) => s + Number(r.rating), 0) / reviews.length).toFixed(1);
  const counts = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => Number(r.rating) === star).length,
  }));
  return (
    <div style={S.summary}>
      <div style={S.summaryLeft}>
        <span style={S.bigRating}>{avg}</span>
        <StarRow value={Math.round(avg)} size={20} />
        <span style={S.totalCount}>{reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}</span>
      </div>
      <div style={S.bars}>
        {counts.map(({ star, count }) => (
          <div key={star} style={S.barRow}>
            <span style={S.barLabel}>{star}</span>
            <span style={S.barLabel}>★</span>
            <div style={S.barTrack}>
              <div style={{
                ...S.barFill,
                width: reviews.length ? `${(count / reviews.length) * 100}%` : '0%',
              }} />
            </div>
            <span style={S.barCount}>{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── main component ── */
export default function Reviews({ productId, user }) {
  const [reviews, setReviews] = useState([]);
  const [form, setForm] = useState({ rating: 5, comment: '' });
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = () =>
    api.get(`/reviews/product/${productId}`)
      .then(r => setReviews(r.data.reviews))
      .catch(() => {});

  useEffect(() => { load(); }, [productId]);

  const submit = async e => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post(`/reviews/product/${productId}`, form);
      setSuccess(true);
      setMessage('Thank you for your review.');
      setForm({ rating: 5, comment: '' });
      load();
    } catch (e) {
      setSuccess(false);
      setMessage(e.response?.data?.message || 'Could not submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = iso => {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <section style={S.section}>
      {/* Header */}
      <div style={S.header}>
        <h2 style={S.heading}>Client Notes</h2>
        <span style={S.mono}>Verified purchases · Honest opinions</span>
      </div>

      {/* Rating summary */}
      <RatingSummary reviews={reviews} />

      {/* Write review form */}
      {user && (
        <div style={S.formCard}>
          <p style={S.formTitle}>Share your experience</p>
          <form onSubmit={submit}>
            {/* Star picker */}
            <div style={{ marginBottom: 18 }}>
              <label style={S.fieldLabel}>Your rating</label>
              <StarRow
                value={form.rating}
                interactive
                onPick={n => setForm(f => ({ ...f, rating: n }))}
                size={28}
              />
            </div>

            {/* Comment */}
            <div style={{ marginBottom: 18 }}>
              <label style={S.fieldLabel}>Your review</label>
              <textarea
                value={form.comment}
                onChange={e => setForm(f => ({ ...f, comment: e.target.value }))}
                required
                rows={4}
                placeholder="What did you love? How does it fit? Any tips for others…"
                style={S.textarea}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <button
                className="button"
                disabled={submitting}
                style={{ minWidth: 160 }}>
                {submitting ? 'Posting…' : 'Post review'}
              </button>
              {message && (
                <span style={{ fontSize: 13, color: success ? '#2e7d32' : '#c0392b' }}>
                  {success ? '✓ ' : ''}{message}
                </span>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Review list */}
      {reviews.length === 0 ? (
        <div style={S.empty}>
          <span style={{ fontSize: 32 }}>✦</span>
          <p style={{ margin: '12px 0 0', color: 'var(--muted)', fontSize: 14 }}>
            No reviews yet. Be the first to share your thoughts.
          </p>
        </div>
      ) : (
        <div style={S.list}>
          {reviews.map(r => (
            <div key={r._id} style={S.card}>
              <div style={S.cardTop}>
                <Avatar name={r.user?.name} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={S.reviewerName}>{r.user?.name || 'Anonymous'}</span>
                    <span style={S.verifiedBadge}>✓ Verified</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 3 }}>
                    <StarRow value={Number(r.rating)} size={14} />
                    <span style={S.dateText}>{formatDate(r.createdAt)}</span>
                  </div>
                </div>
              </div>
              <p style={S.comment}>{r.comment}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ── styles ── */
const S = {
  section: {
    gridColumn: '1 / -1',
    maxWidth: 800,
    marginTop: 60,
    paddingTop: 48,
    borderTop: '1px solid var(--line)',
  },
  header: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 32,
    flexWrap: 'wrap',
    gap: 8,
  },
  heading: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 30,
    fontWeight: 500,
    margin: 0,
  },
  mono: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 10,
    letterSpacing: '1px',
    textTransform: 'uppercase',
    color: 'var(--muted)',
  },

  /* summary */
  summary: {
    display: 'flex',
    gap: 40,
    background: '#edeae4',
    padding: '24px 28px',
    marginBottom: 36,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  summaryLeft: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
  },
  bigRating: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 52,
    lineHeight: 1,
    fontWeight: 500,
  },
  totalCount: {
    fontSize: 11,
    color: 'var(--muted)',
    fontFamily: "'DM Mono', monospace",
    letterSpacing: '0.5px',
    marginTop: 4,
  },
  bars: { flex: 1, display: 'flex', flexDirection: 'column', gap: 6, minWidth: 180 },
  barRow: { display: 'flex', alignItems: 'center', gap: 6 },
  barLabel: { fontSize: 12, color: 'var(--muted)', width: 10, textAlign: 'right', flexShrink: 0 },
  barTrack: { flex: 1, height: 4, background: '#d8d4cc', borderRadius: 2, overflow: 'hidden' },
  barFill: { height: '100%', background: '#c8952a', borderRadius: 2, transition: 'width 0.6s ease' },
  barCount: { fontSize: 11, color: 'var(--muted)', width: 18, textAlign: 'right' },

  /* form */
  formCard: {
    border: '1px solid var(--line)',
    padding: '28px 28px 24px',
    marginBottom: 36,
    background: '#faf8f4',
  },
  formTitle: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 10,
    letterSpacing: '1.5px',
    textTransform: 'uppercase',
    color: 'var(--muted)',
    margin: '0 0 20px',
  },
  fieldLabel: {
    display: 'block',
    fontSize: 11,
    letterSpacing: '0.8px',
    textTransform: 'uppercase',
    color: 'var(--muted)',
    marginBottom: 8,
  },
  textarea: {
    width: '100%',
    border: '1px solid var(--line)',
    borderRadius: 0,
    background: 'transparent',
    padding: '12px',
    fontSize: 14,
    lineHeight: 1.6,
    resize: 'vertical',
    fontFamily: "'DM Sans', sans-serif",
    outline: 'none',
    boxSizing: 'border-box',
    color: 'var(--ink)',
  },

  /* list */
  list: { display: 'flex', flexDirection: 'column', gap: 1 },
  card: {
    padding: '22px 0',
    borderBottom: '1px solid var(--line)',
  },
  cardTop: { display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 12 },
  reviewerName: { fontWeight: 600, fontSize: 14 },
  verifiedBadge: {
    fontSize: 10,
    fontFamily: "'DM Mono', monospace",
    letterSpacing: '0.5px',
    color: '#2e7d32',
    background: '#e8f5e9',
    padding: '2px 7px',
  },
  dateText: { fontSize: 11, color: 'var(--muted)', fontFamily: "'DM Mono', monospace" },
  comment: { margin: '0 0 0 52px', fontSize: 14, lineHeight: 1.7, color: '#3a3630' },

  /* empty */
  empty: {
    textAlign: 'center',
    padding: '50px 0 30px',
    color: 'var(--muted)',
  },
};
