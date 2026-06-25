import { Alert, AlertDescription, AlertTitle } from '@/components/api';
import { Button } from '@/components/api';
import { Spinner } from '@/components/api';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ScenePending
// ---

export function ScenePending() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-muted/20">
      <div className="flex items-center gap-3 rounded-md border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
        <Spinner className="text-primary" variant="default" size={20} />
        <span>Opening scene...</span>
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
        <Alert variant="destructive" className="border-destructive/50">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Couldn't open scene</AlertTitle>
          <AlertDescription className="whitespace-pre-line">
            {message}
          </AlertDescription>
        </Alert>
        <Button
          className="self-start"
          variant="outline"
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
        <Alert variant="destructive" className="border-destructive/50">
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
