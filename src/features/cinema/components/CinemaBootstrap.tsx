import { useEffect } from 'react';
import { useApplicationModeStore, useGlobalStore } from '@/store/api';

import { getDbConn, getPanelWrangler } from '@/lib/singletons/api';
import { waitForTopology } from '@/lib/topology/api';
import { openUnattachedSceneInWorkspace } from '@/features/project/api';
import { showMessageBox } from '@/lib/messagebox';

export default function CinemaBootstrap() {
  const launch = useApplicationModeStore((state) => state.launch);
  const sessionStart = useGlobalStore(
    (state) => state.sessionInfo?.sessionStartEpoc
  );

  useEffect(() => {
    if (!launch || sessionStart === undefined) return;
    let cancelled = false;
    const session = useGlobalStore.getState().sessionInfo!;
    const isCancelled = () => {
      const current = useGlobalStore.getState().sessionInfo;
      return (
        cancelled ||
        current?.sessionStartEpoc !== sessionStart ||
        current.guiServerHost !== session.guiServerHost ||
        current.guiServerPort !== session.guiServerPort
      );
    };
    const wrangler = getPanelWrangler();
    const errors: string[] = [];
    let firstTab: string | undefined;

    async function loadScenes() {
      if (!(await waitForTopology(isCancelled)) || isCancelled()) return;
      for (const uuid of launch!.sceneUuids) {
        if (isCancelled()) return;
        try {
          const model = await getDbConn().getDatabaseScene(uuid);
          if (isCancelled()) return;
          if (!model) throw new Error('The scene was not found.');
          // Keep the display name independent of the database tab identity.
          model.simple_name = `KaraboProjectDB|${model.simple_name || uuid}`;
          const tabId = openUnattachedSceneInWorkspace(
            model,
            `database-scene:${uuid}`
          );
          firstTab ??= tabId;
          wrangler.selectTab('center', firstTab);
        } catch (error) {
          if (isCancelled()) return;
          const message =
            error instanceof Error ? error.message : String(error);
          errors.push(`Scene ${uuid}: ${message}`);
        }
      }
      if (isCancelled() || errors.length === 0) return;
      if (firstTab === undefined) {
        useGlobalStore.getState().setCinemaError(errors.join('\n'));
      } else {
        showMessageBox({
          variant: 'error',
          title: 'Cinema scene errors',
          msg: 'Some scenes could not be opened. Successfully loaded scenes remain available.',
          details: errors.join('\n'),
        });
      }
    }
    void loadScenes();
    return () => {
      cancelled = true;
    };
  }, [launch, sessionStart]);

  return null;
}
