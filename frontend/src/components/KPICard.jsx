import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

const colorMap = {
  blue:    { bg: 'rgba(59,130,246,0.1)',   text: '#60a5fa', border: 'rgba(59,130,246,0.25)' },
  amber:   { bg: 'rgba(245,158,11,0.1)',  text: '#fbbf24', border: 'rgba(245,158,11,0.25)' },
  emerald: { bg: 'rgba(16,185,129,0.1)',  text: '#34d399', border: 'rgba(16,185,129,0.25)' },
  red:     { bg: 'rgba(239,68,68,0.1)',   text: '#f87171', border: 'rgba(239,68,68,0.25)'  },
  purple:  { bg: 'rgba(139,92,246,0.1)',  text: '#a78bfa', border: 'rgba(139,92,246,0.25)' },
};

const KPICard = ({ title, value, subtitle, icon: Icon, color = 'blue', trend, trendValue }) => {
  const c = colorMap[color] || colorMap.blue;

  return (
    <div style={{
      background: 'var(--bg-card)',
      backdropFilter: 'blur(12px)',
      border: '1px solid var(--border)',
      borderRadius: '16px',
      padding: '1.5rem',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      cursor: 'default',
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    }}
    onMouseEnter={e => {
      e.currentTarget.style.transform = 'translateY(-4px)';
      e.currentTarget.style.boxShadow = `0 12px 32px ${c.bg}`;
    }}
    onMouseLeave={e => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = 'none';
    }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div style={{
          padding: '0.65rem',
          borderRadius: '12px',
          background: c.bg,
          border: `1px solid ${c.border}`,
          color: c.text,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={22} />
        </div>
        {trend && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '3px',
            fontSize: '0.78rem', fontWeight: 700,
            color: trend === 'up' ? '#34d399' : trend === 'down' ? '#f87171' : '#94a3b8',
          }}>
            {trend === 'up' ? <ArrowUpRight size={15} /> : trend === 'down' ? <ArrowDownRight size={15} /> : <Minus size={15} />}
            {trendValue}
          </div>
        )}
      </div>
      <div>
        <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{title}</p>
        <h3 style={{ fontSize: '2.25rem', fontWeight: 900, color: 'var(--text-main)', marginTop: '0.15rem', letterSpacing: '-0.04em', lineHeight: 1 }}>{value}</h3>
        {subtitle && <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.4rem', fontWeight: 500 }}>{subtitle}</p>}
      </div>
    </div>
  );
};

export default KPICard;
