import { Separator } from '@/components/api';
import { TopicDisplay, GuiServerDisplay } from '@/features/status';
import { ConnectionTimer } from '@/features/user';
import { SceneSizeDisplay } from '@/features/scene-view/api';
import Footer from './Footer';

export default function KiwiFooter() {
  return (
    <Footer>
      {/* Mobile Layout (< md) */}
      <div className="md:hidden flex flex-col gap-2 px-4 py-2 text-xs">
        <div className="flex items-center justify-between">
          <TopicDisplay />
          <ConnectionTimer />
        </div>
        <SceneSizeDisplay />
      </div>

      {/* Tablet/Desktop Layout (>= md) */}
      <div className="hidden md:flex items-center justify-between gap-4 px-4 py-2">
        {/* Left section */}
        <div className="flex items-center gap-4">
          <TopicDisplay />
          <Separator orientation="vertical" className="h-4" />
          <GuiServerDisplay />
        </div>

        {/* Center section */}
        <div className="flex-1 flex justify-center">
          <SceneSizeDisplay />
        </div>

        {/* Right section */}
        <ConnectionTimer />
      </div>
    </Footer>
  );
}
