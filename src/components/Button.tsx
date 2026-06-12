import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyle =
    'flex items-center justify-center rounded-[8px] font-semibold tracking-wide transition-all duration-300 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed select-none';

  const variants = {
    primary:
      'bg-goldAccent hover:bg-goldHover text-bgMain border border-goldAccent hover:border-goldHover shadow-[0_0_15px_rgba(201,168,76,0.15)] hover:shadow-[0_0_20px_rgba(201,168,76,0.3)]',
    secondary:
      'bg-surface hover:bg-bgMain text-textPrimary border border-borderCustom hover:border-goldAccent',
    ghost:
      'bg-transparent hover:bg-surface text-textSecondary hover:text-textPrimary border border-transparent',
    danger:
      'bg-transparent hover:bg-danger/10 text-danger border border-danger/30 hover:border-danger hover:shadow-[0_0_15px_rgba(239,68,68,0.15)]',
  };

  const sizeStyles = {
    sm: 'min-h-[36px] h-9 px-3 text-xs',
    md: 'min-h-[40px] h-10 px-4 text-sm',
    lg: 'min-h-[44px] h-11 px-5 text-sm',
  };

  const widthStyle = fullWidth ? 'w-full' : '';

  return (
    <button
      disabled={disabled || isLoading}
      className={`${baseStyle} ${variants[variant]} ${sizeStyles[size]} ${widthStyle} ${className}`}
      {...props}
    >
      {isLoading ? (
        <svg
          className="animate-spin -ml-1 mr-3 h-5 w-5 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      ) : null}
      <span>{children}</span>
    </button>
  );
};
