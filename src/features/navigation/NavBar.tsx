import { Menu, Home } from 'lucide-react';
import { KiwiHeader } from '@/app/api';
import NavigationMenu from './components/NavMenu';
import { NavItem } from './components/NavItem';
import NavToggle from './components/NavToggle';
import {
  LoadProjectScene,
  ProjectBrowser,
  useRootProject,
} from '@/features/project/api';
import { UserProfile, AccessLevelSelector } from '@/features/user';
import { Button, Separator } from '@/components/api';
import { GuiServerDisplay, ActiveIndicator } from '@/features/status';
import { useNavigate } from 'react-router-dom';
import { useSyncExternalStore } from 'react';
import { getPanelWrangler } from '@/lib/singletons/api';
import { broadcast_event, KaraboEvent } from '@/lib/events';
import icons from '@/assets/icons';

export function NavBar() {
  const projectBrowser = useRootProject();
  const navigate = useNavigate();
  const wrangler = getPanelWrangler();
  const sceneTabOpen = useSyncExternalStore(
    wrangler.subscribe,
    wrangler.isSceneTabOpen
  );

  const handleHome = () => {
    broadcast_event(KaraboEvent.GoHome, {});
    navigate('/home');
  };

  return (
    <KiwiHeader data-testid="navigation-bar" className="border-b">
      <NavigationMenu className="justify-between px-2 py-2 w-full">
        <div className="flex items-center justify-between w-full xl:hidden gap-2">
          <NavToggle
            trigger={
              <Button
                data-testid="mobile-menu-trigger"
                variant="ghost"
                size="icon"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            }
            title={<GuiServerDisplay />}
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
              {sceneTabOpen && (
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
              )}
            </nav>
          </NavToggle>

          <div className="flex-1 min-w-0 overflow-hidden flex justify-center items-center">
            {sceneTabOpen ? (
              <div className="max-w-full min-w-0 overflow-hidden">
                <ProjectBrowser browser={projectBrowser} />
              </div>
            ) : (
              <img src={icons.logo} alt="Karabo" className="h-8 w-auto" />
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <ActiveIndicator />
            <AccessLevelSelector compact={true} />
          </div>
        </div>

        <div className="hidden xl:flex xl:items-center xl:gap-4 xl:w-full">
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
              {sceneTabOpen && (
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
              )}

              {!sceneTabOpen && (
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
