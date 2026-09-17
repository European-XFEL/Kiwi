import { KiwiHeader } from '@/app/api';
import { Button, Separator } from '@/components/api';
import { ActiveIndicator } from '@/features/status';
import NavigationMenu from '@/features/navigation/components/NavMenu';
import { NavItem } from '@/features/navigation/components/NavItem';
import {
  LoadProjectScene,
  ProjectBrowser,
  useRootProject,
} from '@/features/project/api';
import { AccessLevelSelector, UserProfile } from '@/features/user';
import type { WorkspaceHeaderModel, WorkspaceRuntime } from '../types';
import icons from '@/assets/icons';

export default function WorkspaceHeader({
  header,
  runtime,
}: {
  header: WorkspaceHeaderModel;
  runtime: WorkspaceRuntime;
}) {
  const projectBrowser = useRootProject();

  if (!header.visible || header.kind !== 'app-navbar') {
    return null;
  }

  const isCompact = header.density === 'compact';
  const desktopGapClass = isCompact ? 'lg:gap-2' : 'lg:gap-4';
  const handleHome = () => {
    runtime.onGoHome?.();
  };

  return (
    <KiwiHeader id="workspace-header" className="shrink-0">
      <NavigationMenu className="justify-between px-2 py-2 w-full">
        <div
          className={`hidden lg:flex lg:items-center lg:w-full ${desktopGapClass}`}
        >
          <NavItem>
            <img src={icons.logo} alt="Karabo" className="h-8 w-auto" />
          </NavItem>

          <Separator orientation="vertical" className="h-8 mx-2" />

          <NavItem>
            <LoadProjectScene />
          </NavItem>

          <Separator orientation="vertical" className="h-8 mx-2" />

          <NavItem className="flex-1 min-w-0 overflow-hidden">
            <div className="flex items-center gap-2 overflow-hidden w-full">
              {runtime.activeScene ? (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleHome}
                    aria-label="Go home"
                    className="shrink-0"
                  >
                    <img src={icons.homeEdit} alt="" className="h-6 w-6" />
                  </Button>
                  <Separator orientation="vertical" className="h-6 shrink-0" />
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <ProjectBrowser browser={projectBrowser} />
                  </div>
                </>
              ) : (
                <span className="text-sm text-muted-foreground italic">
                  No scene loaded
                </span>
              )}
            </div>
          </NavItem>

          <Separator orientation="vertical" className="h-8 mx-2" />

          <NavItem>
            <ActiveIndicator />
          </NavItem>

          <Separator orientation="vertical" className="h-8 mx-2" />

          <NavItem>
            <AccessLevelSelector compact={false} />
          </NavItem>

          <Separator orientation="vertical" className="h-8 mx-2" />

          <NavItem>
            <UserProfile />
          </NavItem>
        </div>
      </NavigationMenu>
    </KiwiHeader>
  );
}
