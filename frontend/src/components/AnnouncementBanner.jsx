import { useState, useEffect } from 'react';

const ANNOUNCEMENTS = [
  { text: '✨ FREE EXPRESS SHIPPING ACROSS INDIA ON ORDERS OVER ₹1,999', link: '/shop' },
  { text: '🎁 USE CODE "OXFIRST" FOR 10% OFF YOUR FIRST ORDER', link: '/shop' },
  { text: '🌿 100% SUSTAINABLE & CONSIDERED LUXURY ESSENTIALS', link: '/shop' }
];

export default function AnnouncementBanner() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setAnimating(true);
      setTimeout(() => {
        setIndex(i => (i + 1) % ANNOUNCEMENTS.length);
        setAnimating(false);
      }, 300);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  if (!visible) return null;

  const current = ANNOUNCEMENTS[index];

  return (
    <div className="announcement-banner">
      <div className="banner-content">
        <span className={`banner-text ${animating ? 'fade-out' : 'fade-in'}`}>
          {current.text}
        </span>
      </div>
      <button className="banner-close" onClick={() => setVisible(false)} aria-label="Close announcement">✕</button>
    </div>
  );
}
