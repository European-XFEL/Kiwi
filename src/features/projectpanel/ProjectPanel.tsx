import { memo, useState, useSyncExternalStore } from 'react';
import { getProjectModel } from '@/lib/singletons/api';
import ProjectTree from './ProjectTree';

function ProjectPanel() {
  const model = getProjectModel();
  const snapshot = useSyncExternalStore(model.subscribe, model.getSnapshot);
  // Reset the tree on root replacement, including a new model with the same UUID.
  const [attachment, setAttachment] = useState({
    root: snapshot.root,
    domain: snapshot.domain,
    revision: 0,
  });
  if (
    attachment.root !== snapshot.root ||
    attachment.domain !== snapshot.domain
  ) {
    setAttachment({
      root: snapshot.root,
      domain: snapshot.domain,
      revision: attachment.revision + 1,
    });
  }
  return (
    <ProjectTree key={attachment.revision} model={model} snapshot={snapshot} />
  );
}

export default memo(ProjectPanel);
