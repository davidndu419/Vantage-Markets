import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | number;
  showText?: boolean;
  subtext?: string;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showText = false,
  subtext,
  className = ''
}) => {
  // Map size to dimension values
  let logoSize = 40; // default 'md'
  if (size === 'sm') logoSize = 32;
  else if (size === 'md') logoSize = 40;
  else if (size === 'lg') logoSize = 56;
  else if (typeof size === 'number') logoSize = size;

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* SVG VM Shield Logo */}
      <svg
        width={logoSize}
        height={logoSize}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform duration-300 hover:scale-[1.03]"
      >
        <defs>
          <linearGradient id="gold-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#D4AF37" />
            <stop offset="30%" stopColor="#FFF3A8" />
            <stop offset="70%" stopColor="#B89020" />
            <stop offset="100%" stopColor="#917013" />
          </linearGradient>
        </defs>
        {/* Outer Shield Border */}
        <path
          d="M50,12 C68,15 82,22 85,25 C85,55 75,80 50,92 C25,80 15,55 15,25 C18,22 32,15 50,12 Z"
          fill="#050B18"
          stroke="url(#gold-grad)"
          strokeWidth="4.5"
          strokeLinejoin="round"
        />
        {/* Inner Shield Accent Line */}
        <path
          d="M50,18 C65,21 77,27 80,29 C80,53 72,75 50,86 C28,75 20,53 20,29 C23,27 35,21 50,18 Z"
          fill="none"
          stroke="url(#gold-grad)"
          strokeWidth="1.5"
          opacity="0.6"
        />
        {/* Monogram VM */}
        <g fill="url(#gold-grad)">
          {/* V Shape */}
          <path d="M 25,38 L 31,38 L 37,58 L 43,38 L 49,38 L 40,68 L 34,68 Z" />
          {/* M Shape */}
          <path d="M 51,38 L 57,38 L 63,53 L 69,38 L 75,38 L 75,68 L 69,68 L 69,49 L 63,63 L 57,49 L 57,68 L 51,68 Z" />
        </g>
      </svg>

      {showText && (
        <div className="flex flex-col text-left leading-none">
          <span className="font-extrabold tracking-wider text-textPrimary uppercase" style={{ fontSize: `${logoSize * 0.42}px` }}>
            Vantage
          </span>
          <span className="font-semibold tracking-[0.25em] text-goldAccent uppercase" style={{ fontSize: `${logoSize * 0.22}px`, marginTop: '1px' }}>
            {subtext || 'Markets'}
          </span>
        </div>
      )}
    </div>
  );
};

export default BrandLogo;
