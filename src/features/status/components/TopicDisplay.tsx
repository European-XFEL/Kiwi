import { useGlobalStore } from '@/store/api';
import type { TopicDisplayProps } from '../types/status.types';

export default function TopicDisplay({ className }: TopicDisplayProps) {
  const { sessionInfo } = useGlobalStore();

  if (!sessionInfo?.guiServerTopic) return null;

  return (
    <div className={className}>
      <span className="text-sm text-muted-foreground">
        Topic:{' '}
        <span className="font-semibold text-foreground">
          {sessionInfo.guiServerTopic}
        </span>
      </span>
    </div>
  );
}
