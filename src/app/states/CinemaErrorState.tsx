import { AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/api';

export default function CinemaErrorState({ error }: { error: string }) {
  return (
    <main className="mx-auto w-full max-w-2xl p-4 sm:p-8">
      <Card role="alert" className="border-destructive/50">
        <CardHeader className="flex flex-row items-center gap-2 text-destructive">
          <AlertTriangle aria-hidden="true" className="h-5 w-5 shrink-0" />
          <CardTitle>Cinema error</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="whitespace-pre-line wrap-break-word">{error}</p>
          <p className="text-sm text-muted-foreground">
            Open a valid /cinema bookmark, or refresh this page to retry the
            original launch.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
