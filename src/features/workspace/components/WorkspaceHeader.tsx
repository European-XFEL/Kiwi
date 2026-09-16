import { Home, Menu } from 'lucide-react';
import { KiwiHeader } from '@/app/api';
import { Button, Separator } from '@/components/api';
import { ActiveIndicator } from '@/features/status';
import NavigationMenu from '@/features/navigation/components/NavMenu';
import { NavItem } from '@/features/navigation/components/NavItem';
import NavToggle from '@/features/navigation/components/NavToggle';
import Logo from '@/features/navigation/components/Logo';
import {
  LoadProjectScene,
  ProjectBrowser,
  useRootProject,
} from '@/features/project/api';
import { AccessLevelSelector, UserProfile } from '@/features/user';
import type { WorkspaceHeaderModel, WorkspaceRuntime } from '../types';

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
  const desktopLogoImageClass = isCompact ? 'h-8 w-auto' : 'h-14 w-auto';
  const desktopLogoTextClass = isCompact
    ? 'text-lg font-semibold'
    : 'text-2xl font-bold';

  const handleHome = () => {
    runtime.onGoHome?.();
  };

  return (
    <KiwiHeader id="workspace-header" className="shrink-0">
      <NavigationMenu className="justify-between px-2 py-2 w-full">
        <div className="flex items-center justify-between w-full gap-2 lg:hidden">
          <NavToggle
            trigger={
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            }
            title={
              <span className="text-sm text-muted-foreground">
                Workspace Menu
              </span>
            }
            side="left"
            showFooter
            footerClassName="flex-col items-stretch gap-3"
            primaryAction={
              <div className="w-full">
                <UserProfile />
              </div>
            }
          >
            <nav className="flex flex-col gap-4">
              <LoadProjectScene
                variant="outline"
                className="w-full justify-start"
              />
              {runtime.activeScene ? (
                <>
                  <Separator />
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={handleHome}
                  >
                    <Home className="h-4 w-4" />
                    Go home
                  </Button>
                </>
              ) : null}
            </nav>
          </NavToggle>

          <div className="flex-1 min-w-0 overflow-hidden flex justify-center items-center">
            {runtime.activeScene ? (
              <div className="max-w-full min-w-0 overflow-hidden">
                <ProjectBrowser browser={projectBrowser} />
              </div>
            ) : (
              <Logo
                imageUrl="logo192.png"
                logoText="KIWI"
                alt="Karabo"
                className="flex items-center gap-1.5"
                imageClassName="h-8 w-auto"
                textClassName="text-lg font-bold"
              />
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <ActiveIndicator />
            <AccessLevelSelector compact={true} />
          </div>
        </div>

        <div
          className={`hidden lg:flex lg:items-center lg:w-full ${desktopGapClass}`}
        >
          <NavItem>
            <Logo
              imageUrl="logo192.png"
              logoText="KIWI"
              alt="Karabo"
              className="flex items-center gap-2"
              imageClassName={desktopLogoImageClass}
              textClassName={desktopLogoTextClass}
            />
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
                    <Home className="h-4 w-4" />
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
