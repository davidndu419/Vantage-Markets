import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  isLoading?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  isLoading = false,
  className = '',
  id,
  ...props
}) => {
  const reactId = React.useId();
  const inputId = id || reactId;

  return (
    <div className="flex flex-col w-full gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-semibold text-textSecondary uppercase tracking-wider select-none"
        >
          {label}
        </label>
      )}
      <div className="relative flex items-center w-full">
        <input
          id={inputId}
          className={`w-full min-h-[48px] px-4 rounded-[8px] bg-bgMain border text-textPrimary text-sm font-medium tracking-wide transition-all duration-300 placeholder-textSecondary/40 focus:outline-none focus:border-goldAccent focus:shadow-[0_0_10px_rgba(201,168,76,0.1)] disabled:opacity-50 disabled:cursor-not-allowed ${
            error
              ? 'border-danger/80 focus:border-danger focus:shadow-[0_0_10px_rgba(239,68,68,0.1)]'
              : 'border-borderCustom hover:border-gray-700'
          } ${className}`}
          {...props}
        />
        {isLoading && (
          <div className="absolute right-4 flex items-center justify-center">
            <svg
              className="animate-spin h-5 w-5 text-goldAccent"
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
          </div>
        )}
      </div>
      {error && (
        <span className="text-xs font-medium text-danger tracking-wide mt-0.5 animate-fadeIn">
          {error}
        </span>
      )}
    </div>
  );
};
