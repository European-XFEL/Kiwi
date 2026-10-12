import { ProjectLoading } from '@/features/project/api';
import { useEffect, useState, type ReactNode } from 'react';
import type { WorkspaceModel, WorkspaceRuntime } from '../types';
import WorkspaceBody from './WorkspaceBody';
import WorkspaceFooterContainer from './WorkspaceFooterContainer';
import WorkspaceHeader from './WorkspaceHeader';

function usePageVisibility(): boolean {
  const [isVisible, setIsVisible] = useState(() => !document.hidden);

  useEffect(() => {
    const updateVisibility = () => setIsVisible(!document.hidden);

    document.addEventListener('visibilitychange', updateVisibility);
    return () =>
      document.removeEventListener('visibilitychange', updateVisibility);
  }, []);

  return isVisible;
}

export default function WorkspaceShell({
  workspace,
  runtime,
}: {
  workspace: WorkspaceModel;
  runtime: WorkspaceRuntime;
}) {
  const isPageVisible = usePageVisibility();

  let header: ReactNode = null;
  if (workspace.header.visible) {
    header = <WorkspaceHeader header={workspace.header} runtime={runtime} />;
  }
  let content = (
    <WorkspaceBody body={workspace.body} isPageVisible={isPageVisible} />
  );
  if (runtime.projectLoading) {
    content = <ProjectLoading />;
  }
  let footer: ReactNode = null;
  if (workspace.footer.visible) {
    footer = (
      <WorkspaceFooterContainer footer={workspace.footer} runtime={runtime} />
    );
  }

  return (
    <section
      data-testid="workspace-shell"
      className="flex h-dvh min-h-0 flex-col overflow-hidden bg-background"
    >
      {header}
      <div className="min-h-0 flex-1 overflow-hidden">{content}</div>
      {footer}
    </section>
  );
}
