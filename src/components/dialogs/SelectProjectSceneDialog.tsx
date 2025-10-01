import React, { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ProjectDBConnector } from "../../karabo_connectors/ProjectDBConnector";
import {
  ProjectItemInfo,
  ProjectSceneInfo,
} from "../../karabo_data/ProjectDbInfo";
import { useGlobalStore } from "../../store/globalAppStateStore";
import DomainSelector from "./DomainSelector";
import ProjectFilter from "./ProjectFilter";
import ProjectsTable from "./ProjectTable";
import ScenesTable from "./ScenesTable";
import LoadingStatus from "../status/LoadingStatus";

enum ActivityStatus {
  NO_ACTIVITY,
  GETTING_DOMAINS,
  GETTING_PROJECTS,
  GETTING_SCENES,
}

export interface SelectProjectSceneDialogProps {
  open: boolean;
  onSceneSelected: (scene: ProjectSceneInfo) => void;
  onCancel: () => void;
}

export default function SelectProjectSceneDialog({
  open,
  onSceneSelected,
  onCancel,
}: SelectProjectSceneDialogProps) {
  const { sessionInfo } = useGlobalStore();
  const [activityStatus, setActivityStatus] = useState(
    ActivityStatus.NO_ACTIVITY
  );
  const [errorMsg, setErrorMessage] = useState("");
  const [domains, setDomains] = useState<string[]>([]);
  const [selectedDomain, setSelectedDomain] = useState("");
  const [projects, setProjects] = useState<ProjectItemInfo[]>([]);
  const [selectedProject, setSelectedProject] = useState<
    ProjectItemInfo | undefined
  >(undefined);
  const [totalProjects, setTotalProjects] = useState<number>(0);
  const [scenes, setScenes] = useState<ProjectSceneInfo[]>([]);
  const [selectedScene, setSelectedScene] = useState<
    ProjectSceneInfo | undefined
  >(undefined);
  const executedOnceRef = useRef("");
  const projectFilterRef = useRef<HTMLInputElement>(null);

  const updateProjects = (domain: string) => {
    setActivityStatus(ActivityStatus.GETTING_PROJECTS);
    setScenes([]);
    setSelectedScene(undefined);

    ProjectDBConnector.inst.listProjects(domain, (projectsInfo) => {
      if (projectsInfo.error_msg) {
        setErrorMessage(projectsInfo.error_msg);
      } else {
        let projectsFiltered = projectsInfo.projects.filter(
          (pInf) => !pInf.isTrashed
        );
        setTotalProjects(projectsFiltered.length);

        const projectFilter =
          projectFilterRef.current?.value.toLowerCase() || "";
        if (projectFilter.length > 0) {
          projectsFiltered = projectsFiltered.filter(
            (pInf) => pInf.name.toLowerCase().indexOf(projectFilter) >= 0
          );
        }

        setProjects(projectsFiltered);
        if (projectsFiltered.length > 0) {
          const selProject = projectsFiltered[0];
          setSelectedProject(selProject);
          updateScenes(selProject.domain, selProject.name, selProject.uuid);
        }
      }
      setActivityStatus(ActivityStatus.NO_ACTIVITY);
    });
  };

  const updateScenes = (
    domain: string,
    projectName: string,
    uuidProject: string
  ) => {
    setActivityStatus(ActivityStatus.GETTING_SCENES);
    ProjectDBConnector.inst.listScenes(
      domain,
      projectName,
      uuidProject,
      (scenesInfo) => {
        if (scenesInfo.error_msg) {
          setErrorMessage(scenesInfo.error_msg);
        } else {
          setScenes(scenesInfo.scenes);
          if (scenesInfo.scenes.length > 0) {
            setSelectedScene(scenesInfo.scenes[0]);
          }
        }
        setActivityStatus(ActivityStatus.NO_ACTIVITY);
      }
    );
  };

  const handleProjectClick = (project: ProjectItemInfo) => {
    setSelectedProject(project);
    updateScenes(project.domain, project.name, project.uuid);
    setSelectedScene(undefined);
  };

  const handleSceneClick = (scene: ProjectSceneInfo) => {
    setSelectedScene(scene);
  };

  const handleSceneDoubleClick = (scene: ProjectSceneInfo) => {
    setSelectedScene(scene);
    onSceneSelected(scene);
  };

  const handleSelectScene = () => {
    if (selectedScene) {
      onSceneSelected(selectedScene);
    }
  };

  const getStatusText = () => {
    switch (activityStatus) {
      case ActivityStatus.GETTING_DOMAINS:
        return "Retrieving domains...";
      case ActivityStatus.GETTING_PROJECTS:
        return "Retrieving projects...";
      case ActivityStatus.GETTING_SCENES:
        return "Retrieving scenes...";
      default:
        return "";
    }
  };

  React.useEffect(() => {
    if (!executedOnceRef.current) {
      executedOnceRef.current = "true";
    }

    if (open) {
      setActivityStatus(ActivityStatus.GETTING_DOMAINS);
      ProjectDBConnector.inst.listDomains((domainsInfo) => {
        if (domainsInfo.error_msg) {
          setErrorMessage(
            `Error reading domains: ${domainsInfo.error_msg}. Close and reopen the dialog`
          );
        } else {
          setDomains(domainsInfo.domains);
          if (
            selectedDomain.length === 0 ||
            !domainsInfo.domains.includes(selectedDomain)
          ) {
            const currentTopic = sessionInfo?.guiServerTopic as string;
            const startupDomain = domainsInfo.domains.includes(currentTopic)
              ? currentTopic
              : domainsInfo.domains[0];
            setSelectedDomain(startupDomain);
            updateProjects(startupDomain);
          } else {
            updateProjects(selectedDomain);
          }
        }
        setActivityStatus(ActivityStatus.NO_ACTIVITY);
      });
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="w-[95vw] sm:w-[90vw] md:w-[85vw] lg:max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Load Project Scene</DialogTitle>
          <DialogDescription>
            Select a domain, project, and scene to load
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4 pr-2">
          {/* Project Filter Section */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Project Filter</h3>
            <Card>
              <CardContent className="pt-6">
                <div className="flex gap-4 items-end">
                  <DomainSelector
                    domains={domains}
                    selectedDomain={selectedDomain}
                    onDomainChange={(domain) => {
                      setSelectedDomain(domain);
                      updateProjects(domain);
                    }}
                    disabled={activityStatus !== ActivityStatus.NO_ACTIVITY}
                  />
                  <ProjectFilter
                    inputRef={projectFilterRef}
                    onFilter={() => updateProjects(selectedDomain)}
                    onClear={() => {
                      if (projectFilterRef.current) {
                        projectFilterRef.current.value = "";
                      }
                      updateProjects(selectedDomain);
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Projects Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                Projects on Domain "{selectedDomain}"
              </h3>
              <span className="text-xs text-muted-foreground">
                (
                {totalProjects === projects.length
                  ? projects.length
                  : `${projects.length} of ${totalProjects}`}
                )
              </span>
            </div>
            <ProjectsTable
              projects={projects}
              selectedProject={selectedProject}
              onProjectClick={handleProjectClick}
            />
          </div>

          {/* Scenes Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                Scenes on Project "{selectedProject?.name ?? ""}"
              </h3>
              <span className="text-xs text-muted-foreground">
                ({scenes.length})
              </span>
            </div>
            <ScenesTable
              scenes={scenes}
              selectedScene={selectedScene}
              onSceneClick={handleSceneClick}
              onSceneDoubleClick={handleSceneDoubleClick}
            />
          </div>
        </div>

        <Separator />

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <LoadingStatus
            isLoading={activityStatus !== ActivityStatus.NO_ACTIVITY}
            loadingText={getStatusText()}
            error={errorMsg}
          />
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              onClick={handleSelectScene}
              disabled={!selectedScene}
              className="min-w-[140px]"
            >
              Open Scene
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
