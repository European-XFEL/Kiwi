import useWorkspaceFooterRuntime from '../hooks/useWorkspaceFooterRuntime';
import type { WorkspaceFooterModel, WorkspaceFooterRuntime } from '../types';
import WorkspaceFooter from './WorkspaceFooter';

export default function WorkspaceFooterContainer({
  footer,
  runtime,
}: {
  footer: WorkspaceFooterModel;
  runtime: Pick<
    WorkspaceFooterRuntime,
    'connected' | 'guiServer' | 'guiServerVersion' | 'topic'
  >;
}) {
  const status = useWorkspaceFooterRuntime();

  return (
    <WorkspaceFooter
      footer={footer}
      runtime={{
        connected: runtime.connected,
        guiServer: runtime.guiServer,
        guiServerVersion: runtime.guiServerVersion,
        topic: runtime.topic,
        ...status,
      }}
    />
  );
}
