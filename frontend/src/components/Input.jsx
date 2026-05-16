import React from 'react';

const Input = React.forwardRef(({ label, error, className = '', ...props }, ref) => {
  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>}
      {props.type === 'textarea' ? (
        <textarea
          ref={ref}
          className={`block w-full rounded-md border-slate-300 shadow-sm p-3 border focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
            error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
          } ${className}`}
          {...props}
        />
      ) : (
        <input
          ref={ref}
          className={`block w-full rounded-md border-slate-300 shadow-sm p-3 border focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
            error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
          } ${className}`}
          {...props}
        />
      )}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
