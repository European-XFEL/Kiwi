import type { ReactElement } from 'react';
import { toast } from 'sonner';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
} from '@/components/api';
import { buildCinemaUrl } from '@/features/cinema/api';
import { addProjectFavorite } from '@/features/project/api';
import { getProjectModel } from '@/lib/singletons/api';
import type { SceneModel } from '@/karabo/common/scenemodel/api';
import { useGlobalStore } from '@/store/api';

export default function SceneContextMenu({
  scene,
  children,
}: {
  scene: SceneModel;
  children: ReactElement;
}) {
  const host = useGlobalStore((state) => state.sessionInfo?.guiServerHost);
  const port = useGlobalStore((state) => state.sessionInfo?.guiServerPort);
  const topic = useGlobalStore((state) => state.sessionInfo?.guiServerTopic);
  const model = getProjectModel();
  const project = model.getSceneProject(scene.uuid);
  const domain = model.domain;

  const copyCinemaUrl = async () => {
    if (!host || !port) {
      return;
    }
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard access is unavailable.');
      }
      await navigator.clipboard.writeText(
        buildCinemaUrl(window.location.origin, scene.uuid, host, port)
      );
      toast.success('Cinema URL copied', { duration: 2500 });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(`Could not copy cinema URL: ${message}`);
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent onKeyDown={(event) => event.stopPropagation()}>
        <ContextMenuItem
          disabled={!topic || !domain || !project}
          onSelect={() => {
            if (topic && domain && project) {
              addProjectFavorite(topic, {
                domain,
                projectUuid: project.uuid,
                projectName: project.simple_name,
                sceneUuid: scene.uuid,
                sceneName: scene.simple_name,
              });
            }
          }}
        >
          Add to Favorites
        </ContextMenuItem>
        <ContextMenuItem
          disabled={!host || !port}
          onSelect={() => void copyCinemaUrl()}
        >
          Copy cinema URL
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
