import './DarfLogo.css';

export default function DarfLogo({ size = 48, className = '' }) {
  return (
    <div className={`darf-logo-wrapper ${className}`} style={{ width: size, height: size }}>
      <svg
        viewBox="0 0 100 100"
        className="darf-logo-svg"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Unified Feline Silhouette (Head + Ears in a single path) */}
        <path
          d="M 36,28 C 34,20 30,10 26,10 C 16,10 12,24 20,34 C 15,42 15,52 15,52 C 15,74 30,86 50,86 C 70,86 85,74 85,52 C 85,52 85,42 80,34 C 88,24 84,10 74,10 C 70,10 66,20 64,28 Q 50,23 36,28 Z"
          fill="var(--cat-fur)"
          stroke="var(--border)"
          strokeWidth="3"
          strokeLinejoin="round"
          className="cat-head"
        />

        {/* Left Inner Ear (pointing inwards, no outline separating white and pink) */}
        <path
          d="M 23,31 C 18,23 21,17 26,17 C 29,17 31,22 33,27 Z"
          fill="var(--pink)"
        />

        {/* Right Inner Ear (pointing inwards, no outline separating white and pink) */}
        <path
          d="M 77,31 C 82,23 79,17 74,17 C 71,17 69,22 67,27 Z"
          fill="var(--pink)"
        />

        {/* Forehead Tabby Stripes (from Reference Image) */}
        <polygon points="48,27 52,27 50,38" fill="#000000" opacity="0.15" />
        <polygon points="41,28 45,27 44,36" fill="#000000" opacity="0.15" />
        <polygon points="59,28 55,27 56,36" fill="#000000" opacity="0.15" />

        {/* Cheek Tabby Stripes (from Reference Image) */}
        <polygon points="15,48 24,50 16,52" fill="#000000" opacity="0.15" />
        <polygon points="14,54 22,55 15,58" fill="#000000" opacity="0.15" />
        <polygon points="16,60 21,60 17,63" fill="#000000" opacity="0.15" />

        <polygon points="85,48 76,50 84,52" fill="#000000" opacity="0.15" />
        <polygon points="86,54 78,55 85,58" fill="#000000" opacity="0.15" />
        <polygon points="84,60 79,60 83,63" fill="#000000" opacity="0.15" />



        {/* Left Eye */}
        <g className="cat-eye-left">
          <circle cx="36" cy="55" r="7" fill="#000000" />
          {/* Sparkles */}
          <circle cx="34" cy="52" r="2.5" fill="#ffffff" />
          <circle cx="38" cy="58" r="1" fill="#ffffff" />
        </g>

        {/* Right Eye */}
        <g className="cat-eye-right">
          <circle cx="64" cy="55" r="7" fill="#000000" />
          {/* Sparkles */}
          <circle cx="62" cy="52" r="2.5" fill="#ffffff" />
          <circle cx="66" cy="58" r="1" fill="#ffffff" />
        </g>

        {/* Blush Cheeks */}
        <ellipse cx="28" cy="66" rx="5" ry="3" fill="var(--pink)" opacity="0.65" />
        <ellipse cx="72" cy="66" rx="5" ry="3" fill="var(--pink)" opacity="0.65" />

        {/* Cute Whisker Lines */}
        <line x1="20" y1="62" x2="8" y2="60" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="20" y1="68" x2="6" y2="69" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="80" y1="62" x2="92" y2="60" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="80" y1="68" x2="94" y2="69" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" />

        {/* Cute Nose */}
        <polygon points="50,68 46,64 54,64" fill="#000000" />

        {/* Smiling Cat Mouth */}
        <path
          d="M45,71 Q50,75 50,71 Q50,75 55,71"
          fill="none"
          stroke="#000000"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
