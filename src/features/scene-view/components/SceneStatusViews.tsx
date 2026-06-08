import { Alert, AlertDescription, AlertTitle } from '@/components/api';
import { Button } from '@/components/api';
import { Card, CardContent } from '@/components/api';
import { Spinner } from '@/components/api';
import { AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ScenePending
// ---

export function ScenePending() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <Card className="w-full max-w-md shadow-lg">
        <CardContent className="flex items-center gap-4 p-6">
          <Spinner className="text-primary" variant="default" size={32} />
          <div className="flex-1">Opening scene...</div>
        </CardContent>
      </Card>
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
    <div className="w-full h-full flex items-center justify-center p-4">
      <div className="flex flex-col gap-4 max-w-2xl">
        <Alert variant="destructive" className="border-destructive/50">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Couldn't open scene</AlertTitle>
          <AlertDescription className="whitespace-pre-line">
            {message}
          </AlertDescription>
        </Alert>
        <Button onClick={() => navigate('/home')}>Back to Start</Button>
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
    <div className="w-full h-full flex items-center justify-center p-4">
      <div className="flex flex-col gap-4 max-w-2xl">
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
