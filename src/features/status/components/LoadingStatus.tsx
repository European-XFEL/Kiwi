import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/api';
import type { LoadingStatusProps } from '../types/status.types';

export default function LoadingStatus({
  isLoading,
  loadingText = 'Loading...',
  error,
}: LoadingStatusProps) {
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <div
        data-testid="loading-status"
        className="flex items-center gap-2 text-sm text-muted-foreground"
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>{loadingText}</span>
      </div>
    );
  }

  return null;
}
