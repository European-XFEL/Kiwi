import { useLoadedSceneStore } from '@/store/api';

export type SceneSizeDisplayProps = {
  className?: string;
};

export default function SceneSizeDisplay({ className }: SceneSizeDisplayProps) {
  const loadedSceneRef = useLoadedSceneStore((state) => state.loadedSceneRef);

  if (!loadedSceneRef || !loadedSceneRef.width || !loadedSceneRef.height) {
    return null;
  }

  const formattedWidth = loadedSceneRef.width.toLocaleString('de-DE');
  const formattedHeight = loadedSceneRef.height.toLocaleString('de-DE');

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
