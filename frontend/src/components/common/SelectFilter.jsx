import React from 'react';
import { ICONS } from '../../constants/icons';
import * as LucideIcons from 'lucide-react';

const Icon = ({ name, ...props }) => {
  const LucideIcon = LucideIcons[ICONS[name]] || LucideIcons['HelpCircle'];
  return <LucideIcon {...props} />;
};

const SelectFilter = ({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  icon = 'FILTER',
  className = '',
}) => {
  return (
    <div className={`relative ${className}`}>
      {icon && (
        <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
          <Icon
            name={icon}
            className='h-4 w-4 text-muted-foreground dark:text-gray-400'
          />
        </div>
      )}
      <select
        className={`
          appearance-none bg-background dark:bg-gray-800
          border border-input dark:border-gray-700 rounded-md py-2
          ${icon ? 'pl-9' : 'pl-3'} pr-8 text-sm text-foreground
          dark:text-white focus:outline-none focus:ring-2 
          focus:ring-ring focus:ring-offset-2 w-full transition-colors
          bg-[url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLWNoZXZyb24tZG93biI+PHBhdGggZD0ibTYgOSA2IDYgNi02Ii8+PC9zdmc+")]
          bg-no-repeat bg-[position:right_0.5rem_center] bg-[length:1rem_1rem]
        `}
        value={value}
        onChange={(e) => onChange(e.target.value)}>
        <option value='' className='text-muted-foreground dark:text-gray-400'>
          {placeholder}
        </option>
        {Array.isArray(options)
          ? options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                className='text-foreground dark:text-white dark:bg-gray-800'>
                {option.label}
              </option>
            ))
          : Object.entries(options).map(([optionValue, label]) => (
              <option
                key={optionValue}
                value={optionValue}
                className='text-foreground dark:text-white dark:bg-gray-800'>
                {label}
              </option>
            ))}
      </select>
    </div>
  );
};

export default SelectFilter;
