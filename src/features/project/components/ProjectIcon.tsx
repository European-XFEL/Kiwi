import icons from '@/assets/icons';
import { cn } from '@/components/api';

type ProjectIconProps = {
  isRoot?: boolean;
  isTrashed?: boolean;
  className?: string;
};

// These are fixed-colour icons, so the root and trashed states are told apart
// by shape rather than by tint. Trashed wins over root: a discarded project is
// the state a user has to act on.
function projectIconSource(isRoot?: boolean, isTrashed?: boolean): string {
  if (isTrashed) {
    return icons.folderTrash;
  }

  return isRoot ? icons.folderDomain : icons.folder;
}

export default function ProjectIcon({
  isRoot,
  isTrashed,
  className,
}: ProjectIconProps) {
  return (
    <img
      alt=""
      src={projectIconSource(isRoot, isTrashed)}
      className={cn('size-4 shrink-0', className)}
    />
  );
}
