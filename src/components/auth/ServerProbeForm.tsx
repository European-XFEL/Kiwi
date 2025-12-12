import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export type ServerProbeFormProps = {
  host: string;
  port: string;
  onHostChange: (host: string) => void;
  onPortChange: (port: string) => void;
  onCommit?: (host: string, port: string) => void;
  topic?: string;
  disabled?: boolean;
};

export default function ServerProbeForm({
  host,
  port,
  onHostChange,
  onPortChange,
  onCommit,
  topic,
  disabled = false,
}: ServerProbeFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">GUI SERVER</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="hostname">Hostname</Label>
          <Input
            id="hostname"
            value={host}
            onChange={(e) => onHostChange(e.target.value)}
            onBlur={() => onCommit?.(host, port)}
            disabled={disabled}
            inputMode="text"
            autoComplete="host"
          />
        </div>

        <div className="grid grid-cols-3 gap-4 items-end">
          <div className="space-y-2">
            <Label htmlFor="port">Port</Label>
            <Input
              id="port"
              value={port}
              onChange={(e) => onPortChange(e.target.value)}
              onBlur={() => onCommit?.(host, port)}
              disabled={disabled}
              inputMode="numeric"
              pattern="[0-9]*"
            />
          </div>

          {topic && (
            <div className="col-span-2 text-right text-sm text-muted-foreground">
              Topic: <span className="font-medium break-words">{topic}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
