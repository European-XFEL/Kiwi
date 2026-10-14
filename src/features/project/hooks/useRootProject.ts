import { useMemo, useState, useSyncExternalStore } from 'react';
import type { RootProjectBrowser } from '../types/project.types';
import { getProjectModel } from '@/lib/singletons/api';
import { createProjectBrowser } from '../utils/createProjectBrowser';
import { filterByQuery } from '../utils/filterByQuery';
import { findSceneModelInCurrentProject } from '../utils/openSceneLinkInWorkspace';
import { openSceneInWorkspace } from '../utils/openSceneInWorkspace';

type Selection = {
  rootUuid: string;
  projectUuid: string;
};

/** Project navigation, selection, and filtering for the active root. */
export function useRootProject(): RootProjectBrowser {
  const model = getProjectModel();
  const snapshot = useSyncExternalStore(model.subscribe, model.getSnapshot);
  const browser = useMemo(() => createProjectBrowser(snapshot), [snapshot]);
  const [selection, setSelection] = useState<Selection>();
  const [query, setQuery] = useState('');
  const [sceneQuery, setSceneQuery] = useState('');

  const rootUuid = browser?.rootProjectUuid;
  const [previousRootUuid, setPreviousRootUuid] = useState(rootUuid);

  if (previousRootUuid !== rootUuid) {
    setPreviousRootUuid(rootUuid);
    setSelection(undefined);
    setQuery('');
    setSceneQuery('');
  }

  const rootProject = rootUuid
    ? browser?.projectsByUuid.get(rootUuid)
    : undefined;
  const selectedUuid =
    selection && selection.rootUuid === rootUuid
      ? selection.projectUuid
      : rootUuid;
  const selectedProject =
    (selectedUuid ? browser?.projectsByUuid.get(selectedUuid) : undefined) ??
    rootProject;
  const projects = browser ? [...browser.projectsByUuid.values()] : [];

  return {
    rootProject,
    selectedProject,
    projects: filterByQuery(projects, query, (project) => project.projectName),
    query,
    setQuery,
    filteredScenes: filterByQuery(
      selectedProject ? [...selectedProject.scenes] : [],
      sceneQuery,
      (scene) => scene.sceneName
    ),
    sceneQuery,
    setSceneQuery,
    selectProject: (projectUuid: string) => {
      if (rootUuid) {
        setSelection({ rootUuid, projectUuid });
        setQuery('');
        setSceneQuery('');
      }
    },
    openScene: (sceneUuid: string) => {
      const model = findSceneModelInCurrentProject(sceneUuid);
      if (model) {
        openSceneInWorkspace({ model });
      }
    },
  };
}
