import { useEffect, useState, useSyncExternalStore } from 'react';
import WorkspaceShell from './components/WorkspaceShell';
import SceneBootstrap from './components/SceneBootstrap';
import useWorkspaceRuntime from './hooks/useWorkspaceRuntime';
import { createDefaultWorkspaceModel } from './utils';
import type { WorkspaceModel } from './types';
import { getPanelWrangler } from '@/lib/singletons/api';
import { useActiveSceneStore } from '@/features/scene-view/api';

export default function WorkspacePage() {
  const [workspace] = useState<WorkspaceModel>(() =>
    createDefaultWorkspaceModel()
  );
  const [panelWrangler] = useState(() => getPanelWrangler());
  const runtime = useWorkspaceRuntime();

  const panelState = useSyncExternalStore(
    panelWrangler.subscribe,
    panelWrangler.getSnapshot,
    panelWrangler.getSnapshot
  );
  const setLoadedSceneRef = useActiveSceneStore(
    (state) => state.setLoadedSceneRef
  );

  const centerActiveTabId = panelState.center.activeTabId;
  const activeSceneRef = centerActiveTabId
    ? panelWrangler.getContent(centerActiveTabId)?.sceneRef
    : undefined;

  useEffect(() => {
    setLoadedSceneRef(activeSceneRef);
  }, [activeSceneRef, setLoadedSceneRef]);

  return (
    <>
      <SceneBootstrap />
      <WorkspaceShell workspace={workspace} runtime={runtime} />
    </>
  );
}
