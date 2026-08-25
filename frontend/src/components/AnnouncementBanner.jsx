import { useState, useEffect } from 'react';
import api from '../api';

const DEFAULT_ANNOUNCEMENTS = [
  'FREE EXPRESS SHIPPING ACROSS INDIA ON ORDERS OVER ₹1,999',
  'USE CODE OXWELCOME10 FOR 10% OFF YOUR FIRST ORDER',
  'SUSTAINABLE & CONSIDERED LUXURY ESSENTIALS'
];

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState(DEFAULT_ANNOUNCEMENTS);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    api.get('/settings/announcements')
      .then(r => {
        if (r.data.announcements && r.data.announcements.length) {
          setAnnouncements(r.data.announcements);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!announcements.length) return;
    const timer = setInterval(() => {
      setAnimating(true);
      setTimeout(() => {
        setIndex(i => (i + 1) % announcements.length);
        setAnimating(false);
      }, 300);
    }, 4500);
    return () => clearInterval(timer);
  }, [announcements]);

  if (!visible || !announcements.length) return null;

  const current = announcements[index % announcements.length];

  return (
    <div className="announcement-banner">
      <div className="banner-content">
        <span className={`banner-text ${animating ? 'fade-out' : 'fade-in'}`}>
          {current}
        </span>
      </div>
      <button className="banner-close" onClick={() => setVisible(false)} aria-label="Close announcement">✕</button>
    </div>
  );
}
