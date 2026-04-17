/* Icons — minimal 24px stroke icons. No emoji. */

const Icon = ({ name, size = 22, color = 'currentColor', strokeWidth = 1.75, style }) => {
  const s = strokeWidth;
  const common = {
    width: size, height: size, viewBox: '0 0 24 24',
    fill: 'none', stroke: color, strokeWidth: s,
    strokeLinecap: 'round', strokeLinejoin: 'round', style,
  };
  switch (name) {
    case 'scale':
      return <svg {...common}>
        <rect x="3" y="4" width="18" height="16" rx="3"/>
        <path d="M8 9h8"/><path d="M12 9v4"/>
      </svg>;
    case 'hourglass':
      return <svg {...common}>
        <path d="M6 3h12M6 21h12"/>
        <path d="M7 3c0 5 10 5 10 9s-10 4-10 9"/>
        <path d="M17 3c0 5-10 5-10 9s10 4 10 9"/>
      </svg>;
    case 'heart':
      return <svg {...common}>
        <path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>
      </svg>;
    case 'dumbbell':
      return <svg {...common}>
        <path d="M2 10v4M22 10v4"/>
        <rect x="4" y="8" width="3" height="8" rx="1"/>
        <rect x="17" y="8" width="3" height="8" rx="1"/>
        <path d="M7 12h10"/>
      </svg>;
    case 'home':
      return <svg {...common}>
        <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>
      </svg>;
    case 'plus':
      return <svg {...common}><path d="M12 5v14M5 12h14"/></svg>;
    case 'close':
      return <svg {...common}><path d="M6 6l12 12M18 6L6 18"/></svg>;
    case 'check':
      return <svg {...common}><path d="M5 12l5 5L20 7"/></svg>;
    case 'back':
      return <svg {...common}><path d="M15 6l-6 6 6 6"/></svg>;
    case 'forward':
      return <svg {...common}><path d="M9 6l6 6-6 6"/></svg>;
    case 'more':
      return <svg {...common}><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg>;
    case 'settings':
      return <svg {...common}>
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>
      </svg>;
    case 'trophy':
      return <svg {...common}>
        <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z"/>
        <path d="M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3"/>
      </svg>;
    case 'calendar':
      return <svg {...common}>
        <rect x="3" y="5" width="18" height="16" rx="2"/>
        <path d="M3 9h18M8 3v4M16 3v4"/>
      </svg>;
    case 'chart':
      return <svg {...common}>
        <path d="M3 20h18"/>
        <path d="M5 16l4-6 4 3 6-9"/>
      </svg>;
    case 'play':
      return <svg {...common} fill={color} stroke="none">
        <path d="M7 5v14l12-7z"/>
      </svg>;
    case 'stop':
      return <svg {...common} fill={color} stroke="none">
        <rect x="6" y="6" width="12" height="12" rx="2"/>
      </svg>;
    case 'edit':
      return <svg {...common}>
        <path d="M4 20h4L20 8l-4-4L4 16v4z"/>
        <path d="M14 6l4 4"/>
      </svg>;
    case 'trash':
      return <svg {...common}>
        <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>
      </svg>;
    case 'bell':
      return <svg {...common}>
        <path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8z"/>
        <path d="M10 19a2 2 0 0 0 4 0"/>
      </svg>;
    case 'user':
      return <svg {...common}>
        <circle cx="12" cy="8" r="4"/>
        <path d="M4 21c0-4 4-7 8-7s8 3 8 7"/>
      </svg>;
    case 'timeline':
      return <svg {...common}>
        <path d="M4 6h16M4 12h10M4 18h16"/>
        <circle cx="4" cy="6" r="1" fill={color}/>
        <circle cx="14" cy="12" r="1" fill={color}/>
        <circle cx="4" cy="18" r="1" fill={color}/>
      </svg>;
    case 'flame':
      return <svg {...common}>
        <path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4-1 3 1 4 2 3 0-3-1-6 1-9z"/>
      </svg>;
    case 'target':
      return <svg {...common}>
        <circle cx="12" cy="12" r="9"/>
        <circle cx="12" cy="12" r="5"/>
        <circle cx="12" cy="12" r="1" fill={color}/>
      </svg>;
    case 'tv':
      return <svg {...common}>
        <rect x="3" y="5" width="18" height="12" rx="2"/>
        <path d="M8 21h8"/>
      </svg>;
    default:
      return null;
  }
};

window.Icon = Icon;
