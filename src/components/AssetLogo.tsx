import React, { useState } from 'react';

interface AssetLogoProps {
  name: string;
  ticker: string;
  logoUrl?: string;
  className?: string;
}

export const AssetLogo: React.FC<AssetLogoProps> = ({
  name,
  ticker,
  logoUrl,
  className = 'h-10 w-10',
}) => {
  const [failed, setFailed] = useState(false);
  const initials = ticker.trim().slice(0, 3).toUpperCase() || name.trim().slice(0, 2).toUpperCase();

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-borderCustom bg-borderCustom/40 text-[10px] font-extrabold text-goldAccent ${className}`}
      aria-label={`${name} logo`}
    >
      {logoUrl && !failed ? (
        <img
          src={logoUrl}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <span aria-hidden="true">{initials}</span>
      )}
    </div>
  );
};
