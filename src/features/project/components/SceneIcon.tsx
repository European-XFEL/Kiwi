import icons from '@/assets/icons';
import { cn } from '@/components/api';

export default function SceneIcon({ className }: { className?: string }) {
  return (
    <img
      alt=""
      src={icons.image}
      className={cn('size-4 shrink-0', className)}
    />
  );
}
