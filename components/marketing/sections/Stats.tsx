'use client';

import { useEffect, useRef, useState } from 'react';

const stats = [
  { end: 15000, suffix: '+', label: 'Companies', sub: 'actively using NexaERP' },
  { end: 480000, suffix: '+', label: 'Active Users', sub: 'across all plans' },
  { end: 28, suffix: 'M+', label: 'Reports Generated', sub: 'monthly' },
  { end: 99.9, suffix: '%', label: 'Uptime SLA', sub: 'guaranteed' },
  { end: 4.9, suffix: '★', label: 'Average Rating', sub: '12K+ verified reviews' },
];

function Counter({ end, suffix, duration = 2000 }: { end: number; suffix: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const startTime = Date.now();
          const tick = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(eased * end);
            if (progress < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, duration]);

  const formatted = end >= 1000
    ? (count / 1000).toFixed(count >= 1000 ? 0 : 1) + 'K'
    : end < 100 ? count.toFixed(end % 1 !== 0 ? 1 : 0) : Math.round(count).toLocaleString();

  return <div ref={ref} className="text-5xl font-bold text-white">{formatted}{suffix}</div>;
}

export default function StatsSection() {
  return (
    <section className="bg-blue-600 py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white">Trusted at scale</h2>
          <p className="text-blue-100/70 mt-2">Numbers that prove NexaERP delivers results</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
          {stats.map(s => (
            <div key={s.label} className="text-center">
              <Counter end={s.end} suffix={s.suffix} />
              <div className="text-blue-100 font-semibold text-sm mt-2">{s.label}</div>
              <div className="text-blue-200/50 text-xs mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
