import { Lock, LockOpen } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/api';
import { Button } from '@/components/api';
import { Badge } from '@/components/api';
import { AccessLevel } from '@/karabo/data/api';
import { getAccessLevelDisplay } from '@/components/api';
import type { AccessLevelSelectorProps } from '../types/user.types';

export default function AccessLevelSelector({
  accessLevel,
  canChangeLevel,
  canChangeTo,
  onChange,
  compact = true,
  badgeClassName,
}: AccessLevelSelectorProps) {
  const currentLevelInfo = getAccessLevelDisplay(accessLevel);

  // Observer: Show locked padlock, no dropdown
  if (!canChangeLevel) {
    return (
      <Button
        variant="ghost"
        size={compact ? 'icon' : 'sm'}
        disabled
        data-testid="access-level-locked"
        aria-label="Access level locked (Observer)"
        className="cursor-not-allowed opacity-60"
      >
        <Lock className="h-4 w-4" />
        {!compact && currentLevelInfo && (
          <Badge
            variant="secondary"
            className={`ml-2 ${currentLevelInfo.className} font-medium px-2 py-0.5 text-xs ${badgeClassName ?? ''}`}
          >
            {currentLevelInfo.label}
          </Badge>
        )}
      </Button>
    );
  }

  // Operator/Expert: Show unlocked padlock with dropdown
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={compact ? 'icon' : 'sm'}
          data-testid="access-level-trigger"
          aria-label="Change access level"
          className="hover:bg-accent"
        >
          <LockOpen className="h-4 w-4" />
          {!compact && currentLevelInfo && (
            <Badge
              variant="secondary"
              className={`ml-2 ${currentLevelInfo.className} font-medium px-2 py-0.5 text-xs ${badgeClassName ?? ''}`}
            >
              {currentLevelInfo.label}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-xs font-semibold uppercase text-muted-foreground">
          Access Level
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {[AccessLevel.OBSERVER, AccessLevel.OPERATOR, AccessLevel.EXPERT].map(
          (level) => {
            const levelInfo = getAccessLevelDisplay(level);
            const isCurrentLevel = level === accessLevel;
            const isDisabled = !canChangeTo(level);

            return (
              <DropdownMenuItem
                key={level}
                data-testid={`access-level-option-${AccessLevel[level].toLowerCase()}`}
                onClick={() => onChange(level)}
                disabled={isDisabled}
                className={`cursor-pointer ${
                  isCurrentLevel ? 'bg-accent' : ''
                } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center gap-2 w-full">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      isCurrentLevel ? levelInfo?.className : 'bg-gray-300'
                    }`}
                  />
                  <span className="flex-1">{levelInfo?.label}</span>
                  {isCurrentLevel && (
                    <span className="text-xs text-muted-foreground">
                      Current
                    </span>
                  )}
                </div>
              </DropdownMenuItem>
            );
          }
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
