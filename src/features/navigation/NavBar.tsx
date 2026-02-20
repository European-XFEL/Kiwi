import { Menu } from 'lucide-react';
import Header from '@/app/layouts/Header';
import NavigationMenu from './components/NavMenu';
import { NavItem } from './components/NavItem';
import NavToggle from './components/NavToggle';
import { LoadProjectScene, SceneBreadcrumb } from '@/features/project';
import Logo from './components/Logo';
import { SceneStatus } from '@/features/scene_view';
import { UserProfile, AccessLevelSelector } from '@/features/user';
import { Button } from '@/components/button';
import { Separator } from '@/components/separator';
import { GuiServerDisplay, ActiveIndicator } from '@/features/status';
import { useLocation } from 'react-router-dom';

import { LoadProjectSceneResult, ProjectSceneInfo } from '@/lib/ProjectDbInfo';
import { useEffect, useState } from 'react';
import { getDbConn } from '@/singletons/api';
import { sceneParamsFromURL } from './utils';

export function NavBar() {
  const location = useLocation();
  const [sceneInfo, setSceneInfo] = useState<ProjectSceneInfo | null>(null);

  useEffect(() => {
    const sceneParams = sceneParamsFromURL(location.search);
    if (sceneParams) {
      getDbConn().getScene(
        sceneParams?.domain,
        sceneParams?.projectName,
        sceneParams?.uuid,
        (result: LoadProjectSceneResult) => {
          if (result.scene) {
            setSceneInfo(result.scene);
          } else {
            console.error(
              `Error retrieving scene '${sceneParams?.uuid}' from project '${sceneParams?.domain}:${sceneParams?.projectName}': ${result.error_msg}`
            );
          }
        }
      );
    }
  }, [location.search]);

  return (
    <Header className="border-b">
      <NavigationMenu className="justify-between px-2 py-2 w-full">
        {/* Mobile/Tablet Layout */}
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
              <Separator />
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">
                  Current Scene
                </p>
                <SceneStatus variant="compact" />
              </div>
            </nav>
          </NavToggle>

          {/* Breadcrumb or Logo based on scene state */}
          <div className="flex-1 min-w-0 overflow-hidden flex justify-center items-center">
            {sceneInfo ? (
              <div className="max-w-full min-w-0 overflow-hidden">
                <SceneBreadcrumb
                  domain={sceneInfo.domain}
                  projectName={sceneInfo.projectName}
                  sceneName={sceneInfo.name}
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

        {/* Desktop Navigation */}
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
              <div className="hidden xl:flex shrink-0">
                <SceneStatus variant="compact" />
              </div>

              {sceneInfo && (
                <>
                  <Separator
                    orientation="vertical"
                    className="hidden xl:block h-6 w-px bg-border shrink-0"
                  />
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <SceneBreadcrumb
                      domain={sceneInfo.domain}
                      projectName={sceneInfo.projectName}
                      sceneName={sceneInfo.name}
                    />
                  </div>
                </>
              )}

              {!sceneInfo && (
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
    </Header>
  );
}
