import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/api';
import { ChevronDownIcon } from 'lucide-react';
import type { FitMode } from '../hooks/useSceneScale';

const FIT_MODE_OPTIONS = [
  { value: 'fit-page', label: 'Fit to Page' },
  { value: 'fit-screen', label: 'Fit to Screen' },
  { value: 'fit-width', label: 'Fit to Width' },
  { value: 'fit-height', label: 'Fit to Height' },
  { value: 'actual', label: 'Actual Size' },
] as const;

export interface FitModeSelectProps {
  fitMode: FitMode;
  onFitModeChange: (mode: FitMode) => void;
  isFullscreen?: boolean;
}

/**
 * Controlled fit-mode dropdown. The owning scene tab supplies the current
 * `fitMode` and receives changes via `onFitModeChange`.
 */
export default function FitModeSelect({
  fitMode,
  onFitModeChange,
  isFullscreen = false,
}: FitModeSelectProps) {
  if (isFullscreen) {
    return (
      <div className="relative inline-flex">
        <select
          aria-label="Fit mode"
          value={fitMode}
          onChange={(event) => onFitModeChange(event.target.value as FitMode)}
          className="h-7 w-[130px] cursor-pointer appearance-none rounded-[2px] border border-[#8f8f8f] bg-[#eeeeee] py-0 pr-7 pl-2 text-xs text-[#111111] shadow-none outline-none focus-visible:border-[#777777] focus-visible:ring-1 focus-visible:ring-[#777777]"
        >
          {FIT_MODE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDownIcon
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-2 size-4 -translate-y-1/2 text-[#111111] opacity-50"
        />
      </div>
    );
  }

  return (
    <Select
      value={fitMode}
      onValueChange={(value) => onFitModeChange(value as FitMode)}
    >
      <SelectTrigger
        aria-label="Fit mode"
        size="sm"
        className="h-7 w-[130px] rounded-[2px] border-[#8f8f8f] bg-[#eeeeee] px-2 py-0 text-xs text-[#111111] shadow-none focus-visible:border-[#777777] focus-visible:ring-1 focus-visible:ring-[#777777] data-[size=sm]:h-7 [&_svg]:size-4"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="min-w-[130px] rounded-[2px] text-xs">
        {FIT_MODE_OPTIONS.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            className="text-xs"
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
