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

export type AccessLevelFormProps = {
  onUserNameChange: (username: string) => void;
  onAccessLevelChange: (level: number) => void;
  disabled?: boolean;
};

export default function AccessLevelForm({
  onUserNameChange,
  onAccessLevelChange,
  disabled = false,
}: AccessLevelFormProps) {
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
            onChange={(e) => onUserNameChange(e.target.value)}
            disabled={disabled}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="access-level">Access Level</Label>
          <Select
            onValueChange={(value) => onAccessLevelChange(parseInt(value))}
            disabled={disabled}
            defaultValue="0"
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
                <SelectItem key={level} value={String(level)}>
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
