import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/api';
import { useActiveSceneStore } from '@/features/scene-view/api';

/** Fit mode dropdown — only renders when a scene is loaded. */
export default function FitModeSelect() {
  const loadedSceneRef = useActiveSceneStore((state) => state.loadedSceneRef);
  const fitMode = useActiveSceneStore((state) => state.fitMode);
  const setFitMode = useActiveSceneStore((state) => state.setFitMode);

  if (!loadedSceneRef) return null;

  return (
    <Select
      value={fitMode}
      onValueChange={(value) => setFitMode(value as typeof fitMode)}
    >
      <SelectTrigger
        size="sm"
        className="h-7 w-[130px] rounded-[2px] border border-[#8f8f8f] bg-[#eeeeee] px-2 text-xs text-[#111111] shadow-none focus-visible:border-[#777777] focus-visible:ring-1 focus-visible:ring-[#777777]"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="rounded-[2px] border border-[#8f8f8f] bg-[#eeeeee] text-xs text-[#111111] shadow-none">
        <SelectItem
          value="fit-page"
          className="rounded-[2px] text-xs focus:bg-[#dcdcdc] focus:text-[#111111]"
        >
          Fit to Page
        </SelectItem>
        <SelectItem
          value="fit-screen"
          className="rounded-[2px] text-xs focus:bg-[#dcdcdc] focus:text-[#111111]"
        >
          Fit to Screen
        </SelectItem>
        <SelectItem
          value="fit-width"
          className="rounded-[2px] text-xs focus:bg-[#dcdcdc] focus:text-[#111111]"
        >
          Fit to Width
        </SelectItem>
        <SelectItem
          value="fit-height"
          className="rounded-[2px] text-xs focus:bg-[#dcdcdc] focus:text-[#111111]"
        >
          Fit to Height
        </SelectItem>
        <SelectItem
          value="actual"
          className="rounded-[2px] text-xs focus:bg-[#dcdcdc] focus:text-[#111111]"
        >
          Actual Size
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
