import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/api';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/api';

import { getNetwork } from '@/lib/singletons/api';
import { useGlobalStore } from '@/store/api';

const getInitials = (text?: string): string => {
  if (!text) return '?';

  const trimmed = text.trim();
  const words = trimmed.split(/\s+/);

  if (words.length === 1) {
    return trimmed.charAt(0).toUpperCase();
  }

  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
};

export default function UserInfo({
  nameClassName,
}: {
  nameClassName?: string;
}) {
  const { sessionInfo, setLoggedOut } = useGlobalStore();
  const navigate = useNavigate();

  if (!sessionInfo) {
    return null;
  }

  const { loggedUser, guiServerTopic } = sessionInfo;
  const displayName = loggedUser || guiServerTopic || 'Guest';
  const initials = getInitials(displayName);

  const handleLogout = () => {
    getNetwork().finishSession();
    setLoggedOut();
    navigate('/', { replace: true });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          data-testid="user-menu-trigger"
          variant="ghost"
          className="flex items-center gap-2 h-8 px-2 hover:bg-accent cursor-pointer"
          aria-label="User menu"
        >
          {/* Avatar */}
          <div
            className="w-7 h-7 bg-linear-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center shadow-sm"
            aria-hidden="true"
          >
            <span className="text-white text-xs font-semibold">{initials}</span>
          </div>
          <span
            className={`text-base font-medium text-foreground ${nameClassName ?? ''}`}
          >
            {displayName}
          </span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{displayName}</p>
            {guiServerTopic && guiServerTopic !== displayName && (
              <p className="text-xs text-muted-foreground">
                Topic: {guiServerTopic}
              </p>
            )}
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          data-testid="logout-button"
          onClick={handleLogout}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
