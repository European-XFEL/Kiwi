import type { ReactElement } from 'react';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
} from '@/components/api';
import { addProjectFavorite } from '@/features/project/api';
import type { ProjectModel } from '@/karabo/common/project/api';
import { getProjectModel } from '@/lib/singletons/api';
import { useGlobalStore } from '@/store/api';

export default function ProjectContextMenu({
  project,
  children,
}: {
  project: ProjectModel;
  children: ReactElement;
}) {
  const topic = useGlobalStore((state) => state.sessionInfo?.guiServerTopic);
  const domain = getProjectModel().domain;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent onKeyDown={(event) => event.stopPropagation()}>
        <ContextMenuItem
          disabled={!topic || !domain}
          onSelect={() => {
            if (topic && domain) {
              addProjectFavorite(topic, {
                domain,
                projectUuid: project.uuid,
                projectName: project.simple_name,
              });
            }
          }}
        >
          Add to Favorites
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
