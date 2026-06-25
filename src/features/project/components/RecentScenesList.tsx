import { Separator } from '@/components/api';
import type { RecentScenesListProps } from '../types/project.types';
import RecentSceneItem from './RecentSceneItem';

export default function RecentScenesList({
  scenes,
  onSceneOpen,
  onSceneRemove,
  disabled = false,
}: RecentScenesListProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold mb-2">Recent Scenes</h2>
      </div>

      <Separator />

      <div className="space-y-1">
        {scenes.length === 0 ? (
          <p className="text-sm font-semibold text-muted-foreground">
            [No recent scene yet]
          </p>
        ) : (
          scenes.map((scene) => (
            <RecentSceneItem
              key={`${scene.domain}::${scene.uuid}`}
              scene={scene}
              onOpen={onSceneOpen}
              onRemove={onSceneRemove}
              disabled={disabled}
            />
          ))
        )}
      </div>
    </div>
  );
}
