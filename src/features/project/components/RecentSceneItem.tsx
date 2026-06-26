import { Button } from '@/components/api';
import { Folder, Trash2 } from 'lucide-react';
import type { RecentSceneItemProps } from '../types/project.types';

export default function RecentSceneItem({
  scene,
  onOpen,
  onRemove,
  disabled = false,
}: RecentSceneItemProps) {
  return (
    <div className="group flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-accent/50">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onOpen(scene)}
        disabled={disabled}
        title="Open scene"
        className="shrink-0"
      >
        <Folder className="h-4 w-4 text-primary" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => onRemove(scene)}
        title="Remove from recent scenes"
        disabled={disabled}
        className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{scene.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {scene.domain}::{scene.projectName}
        </p>
      </div>
    </div>
  );
}
