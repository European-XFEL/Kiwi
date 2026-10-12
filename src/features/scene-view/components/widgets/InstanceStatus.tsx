import { InstanceStatusModel } from '@/karabo/common/api';
import { InstanceStatus } from '@/lib/binding/api';
import icons from '@/assets/icons';
import { useDeviceProxy } from '../../hooks/useDeviceProxy';
import { registerRenderer } from '../../renderRegistry';

const statusIcons = {
  [InstanceStatus.NONE]: icons.statusOffline,
  [InstanceStatus.OK]: icons.statusOk,
  [InstanceStatus.ERROR]: icons.statusError,
  [InstanceStatus.UNKNOWN]: icons.statusUnknown,
};

export function InstanceStatusWidget({
  model,
}: {
  model: InstanceStatusModel;
}) {
  const deviceId = model.keys[0]?.split('.')[0] ?? '';
  const proxy = useDeviceProxy(deviceId);
  const isOnline = proxy?.isOnline ?? false;
  const instanceStatus = proxy?.instanceStatus ?? InstanceStatus.NONE;
  const status = isOnline ? instanceStatus.toUpperCase() : 'OFFLINE';
  const title = `${deviceId} - ${status}`;
  return (
    <img
      src={isOnline ? statusIcons[instanceStatus] : icons.statusOffline}
      alt={title}
      title={title}
      draggable={false}
      style={{ width: '100%', height: '100%', cursor: 'default' }}
    />
  );
}

registerRenderer('InstanceStatus', InstanceStatusWidget);
