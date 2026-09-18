import { useRef } from 'react';
import { Input } from '@/components/api';
import { Label } from '@/components/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/api';

export type ReadOnlyAccessFormProps = {
  onUserNameChange: (username: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
};

export default function ReadOnlyAccessForm({
  onUserNameChange,
  onSubmit,
  disabled = false,
}: ReadOnlyAccessFormProps) {
  const userRef = useRef<HTMLInputElement>(null);

  return (
    <Card data-testid="read-only-access-form">
      <CardHeader>
        <CardTitle className="text-sm font-semibold">
          READ-ONLY SERVER LOGIN
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="username-al">Username</Label>
          <Input
            data-testid="login-username"
            id="username-al"
            ref={userRef}
            onChange={(e) => onUserNameChange(e.target.value)}
            onKeyDown={(e) => {
              if (
                e.key === 'Enter' &&
                userRef.current?.value.trim() &&
                !disabled
              ) {
                onSubmit();
              }
            }}
            disabled={disabled}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="access-level">Access Level</Label>
          <div id="access-level" data-testid="login-access-level">
            OBSERVER
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
