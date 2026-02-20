import { Button } from '@/components/ui/button';
import { Folder, Trash2 } from 'lucide-react';
import type { RecentSceneItemProps } from '../types/project.types';

export default function RecentSceneItem({
  scene,
  onOpen,
  onRemove,
  disabled = false,
}: RecentSceneItemProps) {
  return (
    <div className="flex items-center gap-2 group hover:bg-accent/50 p-2 rounded-md transition-colors">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onOpen(scene)}
        disabled={disabled}
        title="Open scene"
        className="shrink-0"
      >
        <Folder className="h-5 w-5 text-primary" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => onRemove(scene)}
        title="Remove from recent scenes"
        className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{scene.name}</p>
        <p className="text-xs text-muted-foreground truncate">
          Project: {scene.domain}::{scene.projectName}
        </p>
      </div>
    </div>
  );
}
