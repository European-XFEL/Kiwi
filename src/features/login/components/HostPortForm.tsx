import { useEffect, useRef } from 'react';
import {
  Input,
  Label,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/api';
import { ActivityStatus } from '../auth.types';
import { useLoginContext } from '../LoginContext';
import { useServerProbe } from '../hooks/useServerProbe';

export default function HostPortForm() {
  const { host, port, setHost, setPort, probeResult, activityStatus } =
    useLoginContext();
  const probedServerInfo =
    probeResult.status === 'success' ? probeResult.serverInfo : null;
  const { doProbeServer, resetProbe } = useServerProbe();
  const disabled = activityStatus !== ActivityStatus.NO_ACTIVITY;
  const initialServerRef = useRef({ host, port });
  const previousServerRef = useRef({ host, port });
  const debounceTimerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const server = initialServerRef.current;
    doProbeServer(server.host.trim(), parseInt(server.port, 10));
  }, [doProbeServer]);

  useEffect(() => {
    const previous = previousServerRef.current;
    if (previous.host === host && previous.port === port) return;
    previousServerRef.current = { host, port };
    resetProbe();

    debounceTimerRef.current = window.setTimeout(() => {
      doProbeServer(host.trim(), parseInt(port, 10));
    }, 2_000);

    return () => window.clearTimeout(debounceTimerRef.current);
  }, [host, port, doProbeServer, resetProbe]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !disabled) {
      event.preventDefault();
      window.clearTimeout(debounceTimerRef.current);
      doProbeServer(host.trim(), parseInt(port, 10));
    }
  };

  return (
    <Card data-testid="host-port-form">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-4 text-sm font-semibold">
          <span>GUI SERVER</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="hostname">Hostname</Label>
          <Input
            data-testid="login-host"
            id="hostname"
            value={host}
            onChange={(event) => setHost(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            inputMode="text"
            autoComplete="host"
          />
        </div>
        <div className="grid grid-cols-3 gap-4 items-end">
          <div className="space-y-2">
            <Label htmlFor="port">Port</Label>
            <Input
              data-testid="login-port"
              id="port"
              value={port}
              onChange={(event) => setPort(event.target.value)}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              inputMode="numeric"
              pattern="[0-9]*"
            />
          </div>
          {probedServerInfo?.topic && (
            <div className="col-span-2 text-right text-sm text-muted-foreground">
              Topic:{' '}
              <span className="font-medium break-words">
                {probedServerInfo.topic}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
