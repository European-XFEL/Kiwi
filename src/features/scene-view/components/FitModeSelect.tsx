import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/api';
import { useLoadedSceneStore } from '@/store/api';

/** Fit mode dropdown — only renders when a scene is loaded. */
export default function FitModeSelect() {
  const { loadedSceneRef, fitMode, setFitMode } = useLoadedSceneStore();

  if (!loadedSceneRef) return null;

  return (
    <Select
      value={fitMode}
      onValueChange={(v) => setFitMode(v as typeof fitMode)}
    >
      <SelectTrigger size="sm" className="w-36">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="fit-page">Fit to Page</SelectItem>
        <SelectItem value="fit-screen">Fit to Screen</SelectItem>
        <SelectItem value="fit-width">Fit to Width</SelectItem>
        <SelectItem value="fit-height">Fit to Height</SelectItem>
        <SelectItem value="actual">Actual Size</SelectItem>
      </SelectContent>
    </Select>
  );
}
