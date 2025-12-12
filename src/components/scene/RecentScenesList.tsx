import { RecentSceneModel } from '@/view_models/RecentScenesModel';
import RecentSceneItem from './RecentSceneItem';
import { Separator } from '@/components/ui/separator';

export type RecentScenesListProps = {
  scenes: RecentSceneModel[];
  onSceneOpen: (scene: RecentSceneModel) => void;
  onSceneRemove: (scene: RecentSceneModel) => void;
  disabled?: boolean;
};

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
        <p className="text-sm text-muted-foreground">
          To reload a recent scene, click on the folder icon. To remove a scene
          from this list, click the delete icon.
        </p>
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
