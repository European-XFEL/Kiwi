import type { NodeApi } from 'react-arborist';
import icons from '@/assets/icons';
import { retrieveDefaultDeviceScene } from '@/features/project/api';
import { Capabilities } from '@/karabo/data/api';
import { InstanceStatus } from '@/lib/binding/api';
import { showMessageBox } from '@/lib/messagebox';
import { getLogger, getTopology } from '@/lib/singletons/api';
import type { SystemTreeNode } from '@/lib/topology/SystemTree';

const SERVICE_MANAGER_DEVICE_ID = 'KaraboDaemonManager';

const statusIcons = {
  [InstanceStatus.NONE]: undefined,
  [InstanceStatus.OK]: icons.statusOk,
  [InstanceStatus.ERROR]: icons.statusError,
  [InstanceStatus.UNKNOWN]: icons.statusUnknown,
};

function languageIcon(node: SystemTreeNode): string | undefined {
  const development =
    (node.attributes.findValue<number>('serverFlags') ?? 0) & 1;
  const language = node.attributes.findValue('lang');
  switch (language) {
    case 'python':
      return development ? icons.pythonDevelopment : icons.python;
    case 'bound':
      return development ? icons.boundDevelopment : icons.bound;
    case 'cpp':
      return development ? icons.cppDevelopment : icons.cpp;
    case 'macro':
      return development ? icons.macroDevelopment : icons.macro;
    default:
      return undefined;
  }
}

export function getStaticIcons(node: SystemTreeNode) {
  let type: string | undefined;
  if (node.kind === 'host') {
    type = icons.host;
  } else if (node.kind === 'server') {
    type = icons.yes;
  } else if (node.kind === 'class') {
    type = icons.deviceClass;
  }
  return {
    type,
    language: node.kind === 'server' ? languageIcon(node) : undefined,
  };
}

export function getDecorationIcon(
  node: SystemTreeNode,
  status: boolean
): string | undefined {
  if (status) {
    return statusIcons[node.status];
  }
  if (node.status === InstanceStatus.ERROR) {
    return icons.deviceInstanceError;
  }
  return node.monitoring ? icons.deviceMonitored : icons.deviceInstance;
}

export function initializeMonitoring(node: SystemTreeNode): void {
  if (node.kind === 'device' || node.kind === 'macro') {
    const monitoring = getTopology().getDeviceMonitoringState(node.id);
    if (monitoring !== undefined) {
      node.setMonitoring(monitoring);
    }
  }
}

export function activate(node: NodeApi<SystemTreeNode>): void {
  if (node.data.kind === 'device') {
    const capabilities =
      node.data.attributes.findValue<number>('capabilities') ?? 0;
    if (!(capabilities & Capabilities.PROVIDES_SCENES)) {
      getLogger().info(`Device "${node.id}" does not provide a scene.`);
      return;
    }
    void retrieveDefaultDeviceScene(node.id);
  }
}

export function openServiceManager(): void {
  if (!getTopology().isDeviceOnline(SERVICE_MANAGER_DEVICE_ID)) {
    showMessageBox({
      variant: 'error',
      title: 'Service Manager not online',
      msg: `Device "${SERVICE_MANAGER_DEVICE_ID}" is not online. Cannot open Service Manager.`,
    });
    return;
  }
  void retrieveDefaultDeviceScene(SERVICE_MANAGER_DEVICE_ID);
}
