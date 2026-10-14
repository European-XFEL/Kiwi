import {
  memo,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { Spinner } from '@/components/api';
import { AccessLevel, type Hash } from '@/karabo/data/api';
import type { DeviceProxy } from '@/lib/binding/api';
import { KaraboEvent, useKaraboEvent } from '@/lib/events';
import { ConfigurationTreeModel } from './ConfigurationTreeModel';
import ConfigurationTree from './components/ConfigurationTree';

function ConfigurationPanel() {
  const [model] = useState(() => new ConfigurationTreeModel());
  const data = useSyncExternalStore(model.subscribe, model.getSnapshot);
  const [visibility, setVisibility] = useState(AccessLevel.OPERATOR);
  useKaraboEvent(
    KaraboEvent.ShowConfiguration,
    ({ proxy }: { proxy?: DeviceProxy }) => model.setRoot(proxy)
  );
  useKaraboEvent(KaraboEvent.NetworkConnectStatus, (data: Hash) => {
    if (!data.getValue<boolean>('status')) {
      model.setRoot(undefined);
    }
  });
  useKaraboEvent(KaraboEvent.SessionDropped, () => model.setRoot(undefined));
  useKaraboEvent(KaraboEvent.SessionExpired, () => model.setRoot(undefined));
  useEffect(() => () => model.dispose(), [model]);
  let content: ReactNode;
  if (!model.root) {
    content = (
      <p className="p-3 text-sm text-muted-foreground">
        Select a device to view its configuration.
      </p>
    );
  } else if (!model.root.hasSchema()) {
    content = (
      <div
        role="status"
        aria-label="Waiting for device schema"
        className="flex flex-1 flex-col items-center justify-center gap-3 text-sm text-muted-foreground"
      >
        <Spinner variant="circle" size={28} aria-hidden="true" />
        <span>Waiting for device schema…</span>
      </div>
    );
  } else {
    content = (
      <ConfigurationTree key={model.deviceRevision} model={model} data={data} />
    );
  }
  return (
    <section
      aria-label="Configuration"
      className="flex h-full min-h-0 flex-col"
    >
      <div className="flex h-8 shrink-0 items-center justify-between gap-2 px-2 text-xs">
        <span className="truncate" title={model.root?.deviceId}>
          {model.root?.deviceId}
        </span>
        <select
          aria-label="Configuration visibility"
          value={visibility}
          className="rounded border bg-background"
          onChange={(event) => {
            const level = Number(event.target.value) as
              AccessLevel.OPERATOR | AccessLevel.EXPERT;
            setVisibility(level);
            model.setVisibility(level);
          }}
        >
          <option value={AccessLevel.OPERATOR}>Normal</option>
          <option value={AccessLevel.EXPERT}>Expert</option>
        </select>
      </div>
      {content}
    </section>
  );
}

export default memo(ConfigurationPanel);
