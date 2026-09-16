import { useState } from 'react';
import { KaraboEvent, useKaraboEvent } from '@/lib/events';
import { getProjectModel } from '@/lib/singletons/api';
import {
  createProjectBrowser,
  type ProjectBrowserModel,
} from '../utils/createProjectBrowser';
import { filterByQuery } from '../utils/filterByQuery';
import { findSceneModelInCurrentProject } from '../utils/openSceneLinkInWorkspace';
import { openSceneInWorkspace } from '../utils/openSceneInWorkspace';

type Selection = {
  rootUuid: string;
  projectUuid: string;
};

// The announcement carries an empty Hash. The root is a live object graph that
// a Hash cannot transport, so it is always read back from the singleton.
function buildFromActiveRoot(): ProjectBrowserModel | undefined {
  const root = getProjectModel().root;
  return root ? createProjectBrowser(root) : undefined;
}

/**
 * Project navigation, selection, and filtering for the active root, rebuilt on
 * every root announcement.
 *
 * Rebuilt rather than cached because the project tree is filled in place while
 * loading: an unchanged root identity does not mean unchanged content, so the
 * announcement is the only reliable signal.
 */
export function useRootProject() {
  // Seeded during the first render rather than from a mount effect, so a
  // project activated before this mounted renders immediately instead of after
  // a frame of empty navigation.
  const [browser, setBrowser] = useState(buildFromActiveRoot);
  const [selection, setSelection] = useState<Selection>();
  const [query, setQuery] = useState('');
  const [sceneQuery, setSceneQuery] = useState('');

  useKaraboEvent(KaraboEvent.RootProjectChanged, () => {
    setBrowser(buildFromActiveRoot());
  });

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
