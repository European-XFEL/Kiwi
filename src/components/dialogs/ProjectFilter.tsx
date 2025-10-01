import { FilterIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type ProjectFilterProps = {
  onFilter: () => void;
  onClear: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>; // Allow null
};

export default function ProjectFilter({
  onFilter,
  onClear,
  inputRef,
}: ProjectFilterProps) {
  return (
    <div className="flex items-center gap-2 flex-1">
      <div className="relative flex-1">
        <Input
          ref={inputRef}
          placeholder="Project Name Part Filter"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.stopPropagation();
              onFilter();
            }
          }}
          className="pr-10"
        />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClear}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            >
              <X className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Clear Filter</TooltipContent>
        </Tooltip>
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="default" size="icon" onClick={onFilter}>
            <FilterIcon className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Filter Projects by Name Part</TooltipContent>
      </Tooltip>
    </div>
  );
}
