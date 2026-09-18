import { Spinner } from '@/components/api';
import { Alert, AlertDescription } from '@/components/api';
import { AlertCircle } from 'lucide-react';

export type LoginStatusProps = {
  isLoading: boolean;
  loadingText?: string;
  error?: string;
};

export default function LoginStatus({
  isLoading,
  loadingText,
  error,
}: LoginStatusProps) {
  if (error) {
    return (
      <Alert
        data-testid="login-error"
        variant="destructive"
        className="border-0"
      >
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (isLoading && loadingText) {
    return (
      <div
        data-testid="login-loading"
        className="flex items-center gap-3 text-sm text-muted-foreground"
      >
        <Spinner variant="default" size={24} className="text-primary" />
        <span>{loadingText}</span>
      </div>
    );
  }

  return null;
}
