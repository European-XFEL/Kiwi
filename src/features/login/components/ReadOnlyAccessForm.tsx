import { useRef } from 'react';
import { Input } from '@/components/api';
import { Label } from '@/components/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/api';
import { ActivityStatus } from '../auth.types';
import { useLoginContext } from '../LoginContext';

export type ReadOnlyAccessFormProps = {
  onSubmit: () => void;
};

export default function ReadOnlyAccessForm({
  onSubmit,
}: ReadOnlyAccessFormProps) {
  const { userName, setUserName, activityStatus } = useLoginContext();
  const disabled = activityStatus !== ActivityStatus.NO_ACTIVITY;
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
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
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
