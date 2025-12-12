import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '../ui/dropdown-menu';
import { GuiServerConnector } from '@/karabo_connectors/GuiServerConnector';
import { useGlobalStore } from '@/store/globalAppStateStore';
import { getInitials } from '@/shared/helpers/getInitials';

export default function UserInfo() {
  const { sessionInfo, setLoggedOut } = useGlobalStore();

  if (!sessionInfo) {
    return null;
  }

  const { loggedUser, guiServerTopic } = sessionInfo;
  const displayName = loggedUser || guiServerTopic || 'Guest';
  const initials = getInitials(displayName);

  const handleLogout = () => {
    GuiServerConnector.inst.finishSession();
    setLoggedOut();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-3 h-auto px-3 py-2 hover:bg-accent cursor-pointer"
          aria-label="User menu"
        >
          {/* Avatar */}
          <div
            className="w-8 h-8 bg-linear-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center shadow-sm"
            aria-hidden="true"
          >
            <span className="text-white text-sm font-semibold">{initials}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">
              {displayName}
            </span>
          </div>
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
