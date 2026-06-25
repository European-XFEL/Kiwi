import type {
  WorkspaceBodyModel,
  WorkspaceModel,
  WorkspacePanelContent,
  PanelModel,
  PanelSlot,
} from './types';

function createBodyPanel(options: {
  id: string;
  slot: PanelSlot;
  content: WorkspacePanelContent;
  title: string;
  description: string;
  defaultWidthPercent: number;
  minWidthPercent: number;
  maxWidthPercent?: number;
  collapsible: boolean;
  collapsed: boolean;
  collapsedWidthPercent: number;
  lastExpandedWidthPercent?: number;
}): PanelModel {
  return {
    id: options.id,
    slot: options.slot,
    content: options.content,
    title: options.title,
    description: options.description,
    defaultWidthPercent: options.defaultWidthPercent,
    minWidthPercent: options.minWidthPercent,
    maxWidthPercent: options.maxWidthPercent,
    collapsible: options.collapsible,
    collapsed: options.collapsed,
    collapsedWidthPercent: options.collapsedWidthPercent,
    lastExpandedWidthPercent:
      options.lastExpandedWidthPercent ?? options.defaultWidthPercent,
    bordered: true,
    resizable: true,
  };
}

function createDefaultWorkspaceBodyModel(): WorkspaceBodyModel {
  return {
    panelArea: {
      id: 'workspace-panel-area',
      orientation: 'horizontal',
      // Startup rule: left and right are closed; the scene owns the initial space.
      // The handles can still resize panels back out, and the model keeps their normal open widths.
      left: createBodyPanel({
        id: 'workspace-topology-panel',
        slot: 'left',
        content: 'topology',
        title: 'Topology',
        description:
          'This region hosts the topology panel on the left side of the workspace.',
        defaultWidthPercent: 0,
        minWidthPercent: 0,
        collapsible: true,
        collapsed: true,
        collapsedWidthPercent: 0,
        lastExpandedWidthPercent: 20,
      }),
      center: createBodyPanel({
        id: 'workspace-scene-panel',
        slot: 'center',
        content: 'scene',
        title: 'Scene',
        description:
          'This region hosts the scene workspace in the center of the layout.',
        defaultWidthPercent: 100,
        minWidthPercent: 0,
        collapsible: true,
        collapsed: false,
        collapsedWidthPercent: 0,
        lastExpandedWidthPercent: 0,
      }),
      right: createBodyPanel({
        id: 'workspace-configurator-panel',
        slot: 'right',
        content: 'configurator',
        title: 'Configurator',
        description:
          'This region hosts the configurator panel on the right side of the workspace.',
        defaultWidthPercent: 0,
        minWidthPercent: 0,
        collapsible: true,
        collapsed: true,
        collapsedWidthPercent: 0,
        lastExpandedWidthPercent: 0,
      }),
    },
  };
}

export function createDefaultWorkspaceModel(): WorkspaceModel {
  return {
    id: 'workspace-main',
    title: 'Main Workspace',
    header: {
      kind: 'app-navbar',
      visible: true,
      density: 'compact',
    },
    body: createDefaultWorkspaceBodyModel(),
    footer: {
      kind: 'app-footer',
      visible: true,
    },
  };
}
