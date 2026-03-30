import { Input } from '@/components/input';
import { Button } from '@/components/button';
import { Search, X } from 'lucide-react';

type KiwiSearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  isPending?: boolean;
  className?: string;
};

export default function KiwiSearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  isPending = false,
  className,
}: KiwiSearchInputProps) {
  return (
    <div className={`relative ${className ?? ''}`}>
      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`pl-8 h-8 text-sm ${value ? 'pr-8' : ''} ${isPending ? 'opacity-70' : ''}`}
      />
      {value && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onChange('')}
          className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
