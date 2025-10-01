import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export type DomainSelectorProps = {
  domains: string[];
  selectedDomain: string;
  onDomainChange: (domain: string) => void;
  disabled?: boolean;
};

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
        <SelectTrigger id="domain-select" className="w-full min-w-[12rem]">
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
