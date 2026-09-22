import { Footer } from '@/app/api';
import {
  Separator,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/api';
import type { WorkspaceFooterModel, WorkspaceRuntime } from '../types';

function FooterText({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <span className="text-sm text-muted-foreground">
        {label}: <span className="font-semibold text-foreground">{value}</span>
      </span>
    </div>
  );
}

function WorkspaceTopicDisplay({
  topic,
  className,
}: {
  topic?: string;
  className?: string;
}) {
  if (!topic) {
    return null;
  }

  return <FooterText label="Topic" value={topic} className={className} />;
}

function WorkspaceGuiServerDisplay({
  guiServer,
  guiServerVersion,
  className,
}: {
  guiServer?: string;
  guiServerVersion?: string;
  className?: string;
}) {
  if (!guiServer) {
    return null;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={className}>
          <FooterText label="GUI Server" value={guiServer} />
        </div>
      </TooltipTrigger>
      {guiServerVersion ? (
        <TooltipContent>
          <p>Version: {guiServerVersion}</p>
        </TooltipContent>
      ) : null}
    </Tooltip>
  );
}

function WorkspaceConnectionTimer({
  connected,
  connectedFor,
  queuedMessageCount,
  latestLatency,
  className,
}: {
  connected: boolean;
  connectedFor?: string;
  queuedMessageCount?: number;
  latestLatency?: number | null;
  className?: string;
}) {
  const label = connected ? 'Connected for' : 'Connection';
  const value = connected ? (connectedFor ?? '--') : 'Disconnected';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={className}>
          <FooterText label={label} value={value} />
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>Messages Queued: {queuedMessageCount ?? 0}</p>
        <p>Latest Latency (sec): {latestLatency!.toFixed(3) ?? '--'}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export default function WorkspaceFooter({
  footer,
  runtime,
}: {
  footer: WorkspaceFooterModel;
  runtime: WorkspaceRuntime;
}) {
  if (!footer.visible || footer.kind !== 'app-footer') {
    return null;
  }

  return (
    <Footer id="workspace-footer" className="shrink-0">
      <div className="flex flex-col">
        <div className="flex flex-col gap-2 px-4 py-2 text-xs md:hidden">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <WorkspaceTopicDisplay topic={runtime.topic} />
              <WorkspaceGuiServerDisplay
                guiServer={runtime.guiServer}
                guiServerVersion={runtime.guiServerVersion}
              />
            </div>
            <WorkspaceConnectionTimer
              connected={runtime.connected}
              connectedFor={runtime.connectedFor}
              queuedMessageCount={runtime.queuedMessageCount}
              latestLatency={runtime.latestLatency}
              className="shrink-0 text-right"
            />
          </div>
        </div>

        <div className="hidden items-center justify-between gap-4 px-4 py-2 md:flex">
          <div className="flex items-center gap-4">
            <WorkspaceTopicDisplay topic={runtime.topic} />
            {runtime.topic && runtime.guiServer ? (
              <Separator orientation="vertical" className="h-4" />
            ) : null}
            <WorkspaceGuiServerDisplay
              guiServer={runtime.guiServer}
              guiServerVersion={runtime.guiServerVersion}
            />
          </div>

          <WorkspaceConnectionTimer
            connected={runtime.connected}
            connectedFor={runtime.connectedFor}
            queuedMessageCount={runtime.queuedMessageCount}
            latestLatency={runtime.latestLatency}
          />
        </div>
      </div>
    </Footer>
  );
}
