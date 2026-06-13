import * as React from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, id, checked, onChange, ...props }, ref) => {
    const checkboxId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <label htmlFor={checkboxId} className="flex items-center gap-2 cursor-pointer">
        <div className="relative">
          <input
            type="checkbox"
            id={checkboxId}
            ref={ref}
            checked={checked}
            onChange={onChange}
            className="peer sr-only"
            {...props}
          />
          <div
            className={cn(
              'h-4 w-4 rounded border border-slate-300 bg-white transition-colors',
              'peer-checked:bg-mine-blue-800 peer-checked:border-mine-blue-800',
              'peer-focus-visible:ring-2 peer-focus-visible:ring-mine-blue-500 peer-focus-visible:ring-offset-2',
              'flex items-center justify-center'
            )}
          >
            {checked && <Check className="h-3 w-3 text-white" />}
          </div>
        </div>
        {label && <span className="text-sm text-slate-700">{label}</span>}
      </label>
    );
  }
);
Checkbox.displayName = 'Checkbox';

export { Checkbox };
