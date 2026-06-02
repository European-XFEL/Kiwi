import { useRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/api';
import { Label } from '@/components/api';
import { Button } from '@/components/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/api';

export type AuthenticationFormProps = {
  onUserNameChange: (username: string) => void;
  onPasswordChange: (password: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
};

export default function AuthenticationForm({
  onUserNameChange,
  onPasswordChange,
  onSubmit,
  disabled = false,
}: AuthenticationFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const userRef = useRef<HTMLInputElement>(null);
  const passwdRef = useRef<HTMLInputElement>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">
          USER AUTHENTICATION
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            ref={userRef}
            onChange={(e) => onUserNameChange(e.target.value)}
            disabled={disabled}
            autoComplete="username"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              ref={passwdRef}
              type={showPassword ? 'text' : 'password'}
              onChange={(e) => onPasswordChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !disabled) {
                  onSubmit();
                }
              }}
              disabled={disabled}
              autoComplete="current-password"
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => setShowPassword(!showPassword)}
              disabled={disabled}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
