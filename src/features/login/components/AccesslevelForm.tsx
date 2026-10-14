import { useRef } from 'react';
import { Input } from '@/components/api';
import { Label } from '@/components/api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/api';
import { AccessLevel } from '@/karabo/data/enums';
import { ActivityStatus } from '../auth.types';
import { useLoginContext } from '../LoginContext';

export default function AccessLevelForm() {
  const {
    userName,
    userAccessLevel,
    setUserName,
    setUserAccessLevel,
    activityStatus,
  } = useLoginContext();
  const disabled = activityStatus !== ActivityStatus.NO_ACTIVITY;
  const userRef = useRef<HTMLInputElement>(null);

  return (
    <Card data-testid="access-level-form">
      <CardHeader>
        <CardTitle className="text-sm font-semibold">
          ACCESS LEVEL LOGIN
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
            disabled={disabled}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="access-level">Access Level</Label>
          <Select
            onValueChange={(value) => setUserAccessLevel(parseInt(value, 10))}
            disabled={disabled}
            value={String(userAccessLevel)}
          >
            <SelectTrigger id="access-level" data-testid="login-access-level">
              <SelectValue placeholder="Select access level" />
            </SelectTrigger>
            <SelectContent>
              {[
                AccessLevel.OBSERVER,
                AccessLevel.OPERATOR,
                AccessLevel.EXPERT,
              ].map((level) => (
                <SelectItem
                  key={level}
                  value={String(level)}
                  data-testid={`login-access-level-option-${AccessLevel[level].toLowerCase()}`}
                >
                  {AccessLevel[level]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
