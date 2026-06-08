import { Menu, Home } from 'lucide-react';
import { KiwiHeader } from '@/app/api';
import NavigationMenu from './components/NavMenu';
import { NavItem } from './components/NavItem';
import NavToggle from './components/NavToggle';
import { LoadProjectScene, SceneBreadcrumb } from '@/features/project/api';
import Logo from './components/Logo';
import { UserProfile, AccessLevelSelector } from '@/features/user';
import { Button, Separator } from '@/components/api';
import { GuiServerDisplay, ActiveIndicator } from '@/features/status';
import { useLocation, useNavigate } from 'react-router-dom';
import { useActiveSceneStore } from '@/features/scene-view/api';
import { sceneParamsFromURL } from './utils';

export function NavBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const sceneParams = sceneParamsFromURL(location.search);
  const loadedSceneRef = useActiveSceneStore((state) => state.loadedSceneRef);
  const setLoadedSceneRef = useActiveSceneStore(
    (state) => state.setLoadedSceneRef
  );
  const activeLoadedSceneRef =
    sceneParams && loadedSceneRef?.uuid === sceneParams.uuid
      ? loadedSceneRef
      : null;

  const handleHome = () => {
    setLoadedSceneRef(undefined);
    navigate('/home');
  };

  return (
    <KiwiHeader className="border-b">
      <NavigationMenu className="justify-between px-2 py-2 w-full">
        <div className="flex items-center justify-between w-full xl:hidden gap-2">
          <NavToggle
            trigger={
              <Button variant="ghost" size="icon" aria-label="Open menu">
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
              {activeLoadedSceneRef && (
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
            {activeLoadedSceneRef ? (
              <div className="max-w-full min-w-0 overflow-hidden">
                <SceneBreadcrumb
                  domain={activeLoadedSceneRef.domain}
                  projectName={activeLoadedSceneRef.projectName}
                  sceneName={activeLoadedSceneRef.name}
                />
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

        <div className="hidden xl:flex xl:items-center xl:gap-4 xl:w-full">
          <NavItem>
            <Logo
              imageUrl="logo192.png"
              logoText="KIWI"
              alt="Karabo"
              className="flex items-center gap-2"
              imageClassName="h-14 w-auto"
              textClassName="text-2xl font-bold"
            />
          </NavItem>

          <Separator orientation="vertical" className="h-8 mx-2" />

          <NavItem>
            <LoadProjectScene />
          </NavItem>

          <Separator orientation="vertical" className="h-8 mx-2" />

          <NavItem className="flex-1 min-w-0 overflow-hidden">
            <div className="flex items-center gap-2 overflow-hidden w-full">
              {activeLoadedSceneRef && (
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
                    <SceneBreadcrumb
                      domain={activeLoadedSceneRef.domain}
                      projectName={activeLoadedSceneRef.projectName}
                      sceneName={activeLoadedSceneRef.name}
                    />
                  </div>
                </>
              )}

              {!activeLoadedSceneRef && (
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
