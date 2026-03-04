import { Lock, LockOpen } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/dropdown-menu';
import { Button } from '@/components/button';
import { Badge } from '@/components/badge';
import { useAccessLevel } from '@/features/user/hooks/useAccessLevel';
import { useGlobalStore } from '@/store/globalAppStateStore';
import { AccessLevel } from '@/karabo/data/enums';
import { getAccessLevelDisplay } from '@/components/utils/getAccessLevelDisplay';
import { getConfig } from '@/lib/singletons/api';
import type { AccessLevelSelectorProps } from '../types/user.types';

export default function AccessLevelSelector({
  compact = true,
}: AccessLevelSelectorProps) {
  const { sessionInfo, setLoggedIn } = useGlobalStore();
  const { accessLevel, canChangeLevel, canChangeTo, setLevel } =
    useAccessLevel();

  if (!sessionInfo) {
    return null;
  }

  const currentLevelInfo = getAccessLevelDisplay(accessLevel);

  const handleAccessLevelChange = async (newLevel: AccessLevel) => {
    if (!canChangeTo(newLevel)) {
      console.warn(
        `User cannot change access level from ${AccessLevel[accessLevel]} to ${AccessLevel[newLevel]}`
      );
      return;
    }

    // Update central manager + store
    setLevel(newLevel);

    // Optionally also sync sessionInfo in store (for consistency)
    setLoggedIn({
      ...sessionInfo,
      accessLevel: newLevel,
    });

    // Persist the change to encrypted localStorage for non-auth sessions only
    try {
      const storedSession = await getConfig().loadSession();

      if (storedSession && !storedSession.refreshToken) {
        await getConfig().saveNonAuthSession(
          sessionInfo.guiServerHost,
          sessionInfo.guiServerPort,
          sessionInfo.loggedUser,
          newLevel
        );
        console.log(
          `Access level changed to: ${AccessLevel[newLevel]} and persisted to session storage`
        );
      } else if (storedSession?.refreshToken) {
        console.warn(
          'Access level change not persisted: Auth sessions are controlled by backend'
        );
      }
    } catch (error) {
      console.error('Failed to persist access level change:', error);
    }
  };

  // Observer: Show locked padlock, no dropdown
  if (!canChangeLevel) {
    return (
      <Button
        variant="ghost"
        size={compact ? 'icon' : 'sm'}
        disabled
        aria-label="Access level locked (Observer)"
        className="cursor-not-allowed opacity-60"
      >
        <Lock className="h-4 w-4" />
        {!compact && currentLevelInfo && (
          <Badge
            variant="secondary"
            className={`ml-2 ${currentLevelInfo.className} font-medium px-2 py-0.5 text-xs`}
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
          aria-label="Change access level"
          className="hover:bg-accent"
        >
          <LockOpen className="h-4 w-4" />
          {!compact && currentLevelInfo && (
            <Badge
              variant="secondary"
              className={`ml-2 ${currentLevelInfo.className} font-medium px-2 py-0.5 text-xs`}
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
                onClick={() => handleAccessLevelChange(level)}
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
