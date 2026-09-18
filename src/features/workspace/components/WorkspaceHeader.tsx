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
  const desktopGapClass = isCompact ? 'lg:gap-3' : 'lg:gap-5';
  const separatorClass = 'hidden lg:block h-6 mx-1';
  const handleHome = () => {
    runtime.onGoHome?.();
  };

  // The row has a fixed height so the header does not jump when the project
  // browser, which is taller than the buttons, appears with a scene.
  return (
    <KiwiHeader id="workspace-header" className="shrink-0">
      <NavigationMenu className="px-3 sm:px-4 w-full">
        <div
          className={`flex h-14 items-center w-full gap-2 sm:gap-3 ${desktopGapClass}`}
        >
          <NavItem className="hidden lg:block">
            <img src={icons.logo} alt="Karabo" className="h-8 w-auto" />
          </NavItem>

          <Separator orientation="vertical" className={separatorClass} />

          <NavItem>
            <LoadProjectScene
              variant="ghost"
              className="h-8 gap-1.5 border-2 border-secondary/50 bg-secondary/10 text-base text-foreground hover:border-secondary/70 hover:bg-secondary/20 px-2 lg:px-2.5"
              iconClassName="size-5 text-secondary lg:size-4"
              labelClassName="sr-only lg:not-sr-only"
            />
          </NavItem>

          <Separator orientation="vertical" className={separatorClass} />

          <NavItem className="flex-1 min-w-0 overflow-hidden">
            <div className="flex items-center gap-2 overflow-hidden w-full sm:gap-3">
              {runtime.activeScene ? (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleHome}
                    data-testid="workspace-home-button"
                    aria-label="Go home"
                    title="Go home"
                    className="size-8 shrink-0"
                  >
                    <img src={icons.homeEdit} alt="" className="size-5" />
                  </Button>
                  <Separator
                    orientation="vertical"
                    className="hidden h-6 shrink-0 sm:block"
                  />
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <ProjectBrowser
                      browser={projectBrowser}
                      className="w-fit"
                    />
                  </div>
                </>
              ) : (
                <span className="hidden sm:inline text-base text-muted-foreground italic truncate">
                  No scene loaded
                </span>
              )}
            </div>
          </NavItem>

          <NavItem className="px-1">
            <ActiveIndicator />
          </NavItem>

          <Separator orientation="vertical" className={separatorClass} />

          <NavItem>
            <AccessLevelSelector
              compact={false}
              badgeClassName="hidden lg:inline-flex"
            />
          </NavItem>

          <Separator orientation="vertical" className={separatorClass} />

          <NavItem>
            <UserProfile nameClassName="hidden lg:inline" />
          </NavItem>
        </div>
      </NavigationMenu>
    </KiwiHeader>
  );
}
