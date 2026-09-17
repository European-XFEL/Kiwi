import { ChevronDown } from 'lucide-react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  KiwiSearchInput,
} from '@/components/api';
import { useProjectListKeyboard } from '../hooks/useProjectListKeyboard';
import { useMenuFocusReturn } from '../hooks/useMenuFocusReturn';
import SceneIcon from './SceneIcon';
import type { ProjectBrowserSceneEntry } from '../utils/createProjectBrowser';

type ProjectSceneListProps = {
  scenes: readonly ProjectBrowserSceneEntry[];
  sceneCount: number;
  query: string;
  onQueryChange: (query: string) => void;
  isLoaded: boolean;
  onOpenScene: (sceneUuid: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function ProjectSceneList({
  scenes,
  sceneCount,
  query,
  onQueryChange,
  isLoaded,
  onOpenScene,
  open,
  onOpenChange,
}: ProjectSceneListProps) {
  const keyboard = useProjectListKeyboard();
  const focusReturn = useMenuFocusReturn();

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) {
          onQueryChange('');
        }
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button
          data-testid="scene-selector"
          ref={focusReturn.triggerRef}
          type="button"
          variant="secondary"
          size="sm"
          disabled={!isLoaded || sceneCount === 0}
          aria-label="Open scene"
          title={isLoaded ? `${sceneCount} scenes` : 'Scenes not loaded'}
          className="h-8 gap-1.5 border-2 border-secondary/50 bg-secondary/10 text-base text-foreground hover:border-secondary/70 hover:bg-secondary/20 shrink-0 px-2.5"
        >
          <SceneIcon />
          <span className="hidden sm:inline">Scenes</span>
          <span
            aria-hidden="true"
            className="rounded bg-background/80 px-1.5 text-sm tabular-nums"
          >
            {sceneCount}
          </span>
          <ChevronDown className="size-3.5 shrink-0 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        onFocusCapture={keyboard.onContentFocusCapture}
        {...focusReturn.contentProps}
        align="start"
        sideOffset={6}
        className="w-[min(22rem,90vw)] p-1.5"
      >
        <div className="px-2 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Scenes in this project
        </div>
        <div ref={keyboard.searchRef} onKeyDown={keyboard.onSearchKeyDown}>
          <KiwiSearchInput
            value={query}
            onChange={onQueryChange}
            placeholder="Filter scenes..."
            className="mb-2.5"
          />
        </div>
        <div
          ref={keyboard.resultsRef}
          onKeyDownCapture={keyboard.onResultsKeyDownCapture}
          className="max-h-72 space-y-1 overflow-y-auto"
        >
          {scenes.length ? (
            scenes.map((scene) => (
              <DropdownMenuItem
                key={scene.sceneUuid}
                onSelect={() => onOpenScene(scene.sceneUuid)}
                title={scene.sceneName}
                className="min-h-8 cursor-pointer py-2 focus:bg-secondary/12"
              >
                <SceneIcon />
                <span className="truncate">{scene.sceneName}</span>
              </DropdownMenuItem>
            ))
          ) : (
            <div className="px-2 py-6 text-center text-sm text-muted-foreground">
              No scenes found
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
