import { Alert, AlertDescription, AlertTitle } from '@/components/api';
import { Button } from '@/components/api';
import { Spinner } from '@/components/api';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ScenePending
// ---

export function ScenePending() {
  return (
    <div
      role="status"
      data-testid="scene-pending"
      className="flex h-full w-full flex-col items-center justify-center gap-6 bg-muted/20 px-6 sm:gap-8"
    >
      <div
        aria-hidden="true"
        className="relative size-28 sm:size-40 lg:size-32"
      >
        {/* The halo helps on small screens; on a large canvas it reads as a
            blob, so desktop keeps just the ring */}
        <div className="absolute inset-0 rounded-full bg-primary/10 motion-safe:animate-pulse lg:hidden" />
        <div className="absolute inset-3 sm:inset-4 lg:inset-0">
          {/* Track: same radius as the LoaderCircle arc drawn over it */}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.75}
            className="absolute inset-0 size-full text-primary/15 lg:stroke-1"
          >
            <circle cx="12" cy="12" r="9" />
          </svg>
          <Spinner
            variant="circle"
            strokeWidth={1.75}
            className="absolute inset-0 size-full text-primary lg:stroke-1"
          />
        </div>
      </div>
      <div className="flex flex-col items-center gap-1 text-center">
        <span className="text-lg font-semibold text-foreground sm:text-xl">
          Opening scene
        </span>
        <span className="text-sm text-muted-foreground sm:text-base">
          This may take a moment.
        </span>
      </div>
    </div>
  );
}

// SceneOpenError
// ---
// Shown when the DB connector fails to deliver the scene.
// Offers a way back since the scene URL may be stale or the DB unavailable.

export function SceneOpenError({ message }: { message: string }) {
  const navigate = useNavigate();
  return (
    <div className="flex h-full w-full items-center justify-center bg-muted/20 p-4">
      <div className="flex w-full max-w-2xl flex-col gap-3">
        <Alert
          data-testid="scene-open-error"
          variant="destructive"
          className="border-destructive/50"
        >
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Couldn't open scene</AlertTitle>
          <AlertDescription className="whitespace-pre-line">
            {message}
          </AlertDescription>
        </Alert>
        <Button
          className="self-start"
          variant="outline"
          data-testid="scene-error-back"
          onClick={() => navigate('/home')}
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Back to Start
        </Button>
      </div>
    </div>
  );
}

// SceneSystemError
// ---
// Shown when a global system error makes the session unrecoverable.
// No back action — the error is at the application level, not the scene level.

export function SceneSystemError({ message }: { message: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-muted/20 p-4">
      <div className="w-full max-w-2xl">
        <Alert
          data-testid="scene-system-error"
          variant="destructive"
          className="border-destructive/50"
        >
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Unrecoverable Error</AlertTitle>
          <AlertDescription className="whitespace-pre-line">
            {message}
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
