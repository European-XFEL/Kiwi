import { useLoadedSceneStore } from '@/store/loadedSceneStore';

export type SceneSizeDisplayProps = {
  className?: string;
};

export default function SceneSizeDisplay({ className }: SceneSizeDisplayProps) {
  const scene = useLoadedSceneStore((state) => state.scene);

  if (!scene || !scene.width || !scene.height) return null;

  const formattedWidth = scene.width.toLocaleString('de-DE');
  const formattedHeight = scene.height.toLocaleString('de-DE');

  return (
    <div className={className}>
      <span className="text-sm text-muted-foreground">
        Scene size:{' '}
        <span className="font-semibold text-foreground">
          {formattedWidth} × {formattedHeight}
        </span>{' '}
        px
      </span>
    </div>
  );
}
