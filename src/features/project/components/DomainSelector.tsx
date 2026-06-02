import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/api';
import { Label } from '@/components/api';
import type { DomainSelectorProps } from '../types/project.types';

export default function DomainSelector({
  domains,
  selectedDomain,
  onDomainChange,
  disabled = false,
}: DomainSelectorProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="domain-select">Domain</Label>
      <Select
        value={selectedDomain}
        onValueChange={onDomainChange}
        disabled={disabled}
      >
        <SelectTrigger id="domain-select" className="w-full min-w-48">
          <SelectValue placeholder="Select domain" />
        </SelectTrigger>
        <SelectContent className="max-h-[300px]">
          {domains.map((domain) => (
            <SelectItem key={domain} value={domain}>
              {domain}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
