import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'standard' | 'elevated' | 'glass';
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'standard',
  className = '',
  ...props
}) => {
  const baseStyle = 'rounded-[12px] p-6 transition-all duration-300';

  const variants = {
    standard: 'bg-surface border border-borderCustom hover:border-gray-800',
    elevated: 'bg-surface border border-borderCustom shadow-[0_0_20px_rgba(201,168,76,0.05)] hover:shadow-[0_0_25px_rgba(201,168,76,0.12)] hover:border-goldAccent/30',
    glass: 'glassmorphic hover:border-goldAccent/20',
  };

  return (
    <div
      className={`${baseStyle} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
