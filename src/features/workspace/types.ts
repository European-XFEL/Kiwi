import type { RootProjectBrowser } from '@/features/project/api';
import type { BaseWidgetObjectData } from '@/karabo/common/api';
import type { ActiveIndicatorProps } from '@/features/status';
import type {
  AccessLevelSelectorProps,
  UserProfileProps,
} from '@/features/user';

// Workspace
// ---

export type WorkspaceId = string;

export interface WorkspacePolicy {
  readonly defaultCenterTab: PanelTab;
  readonly persistActiveTab: boolean;
  readonly showProjectNavigation: boolean;
}

export interface WorkspaceModel {
  id: WorkspaceId;
  title: string;
  policy: WorkspacePolicy;
  header: WorkspaceHeaderModel;
  body: WorkspaceBodyModel;
  footer: WorkspaceFooterModel;
}

// Header
// ---

export type WorkspaceHeaderKind = 'app-navbar';
export type WorkspaceHeaderDensity = 'compact' | 'comfortable';

export interface WorkspaceHeaderModel {
  kind: WorkspaceHeaderKind;
  visible: boolean;
  density: WorkspaceHeaderDensity;
}

// Body → Panel Area
// ---

// One of the three regions of the panel area.
export type PanelSlot = 'left' | 'center' | 'right';
export type PanelAreaOrientation = 'horizontal';
export type WorkspacePanelContent = 'topology' | 'scene' | 'right-area';

export interface WorkspaceBodyModel {
  panelArea: PanelAreaModel;
}

export interface PanelAreaModel {
  id: string;
  orientation: PanelAreaOrientation;
  left: PanelModel;
  center: PanelModel;
  right: PanelModel;
}

export type PanelId = string;

export interface PanelModel {
  id: PanelId;
  slot: PanelSlot;
  content: WorkspacePanelContent;
  title: string;
  description?: string;
  // Width when the panel is expanded, expressed as a percentage of the full panel area.
  defaultWidthPercent: number;
  // Smallest width this panel may shrink to when expanded.
  minWidthPercent: number;
  // Largest width this panel may grow to when expanded.
  maxWidthPercent?: number;
  // Whether the panel may be collapsed to a rail or hidden width.
  collapsible: boolean;
  // Current collapsed state. Left and right begin collapsed in the base model.
  collapsed: boolean;
  // Width used when the panel is collapsed. Zero means fully hidden.
  collapsedWidthPercent: number;
  // Width to restore when reopening a collapsed panel.
  lastExpandedWidthPercent?: number;
  // Whether the panel should render its internal border treatment.
  bordered: boolean;
  // Whether this panel is allowed to participate in resize behavior.
  resizable: boolean;
}

// Footer
// ---

export type WorkspaceFooterKind = 'app-footer';

export interface WorkspaceFooterModel {
  kind: WorkspaceFooterKind;
  visible: boolean;
}

// Runtime state
// ---

export interface WorkspaceRuntime {
  access?: Omit<AccessLevelSelectorProps, 'compact' | 'badgeClassName'>;
  activity?: ActiveIndicatorProps;
  browser?: RootProjectBrowser;
  connected: boolean;
  guiServer?: string;
  guiServerVersion?: string;
  onGoToHomeTab?: () => void;
  projectLoading?: boolean;
  sceneTabOpen?: boolean;
  topic?: string;
  user?: Omit<UserProfileProps, 'nameClassName'>;
}

export type WorkspaceFooterRuntime = Pick<
  WorkspaceRuntime,
  'connected' | 'guiServer' | 'guiServerVersion' | 'topic'
> & {
  connectedFor?: string;
  latestLatency: number | null;
  queuedMessageCount: number;
};

// Panel tabs & live state
// ---

export type PanelTabId = string;

export interface PanelTab {
  id: PanelTabId;
  title: string;
  closable: boolean;
  detached?: boolean;
}

export interface PanelState {
  id: PanelSlot;
  tabs: PanelTab[];
  activeTabId?: PanelTabId;
}

// Session descriptors only. Mounted containers own their proxies and contexts.
export interface ControllerPanelModel {
  id: string;
  title: string;
  model: BaseWidgetObjectData;
}

export interface RightPanelState extends PanelState {
  id: 'right';
  controllerPanels: ControllerPanelModel[];
}

export interface PanelAreaState {
  left: PanelState;
  center: PanelState;
  right: RightPanelState;
}

// Scene tab
// ---

export interface SceneTabSnapshot {
  isUnattachedScene: false;
  id: PanelTabId;
  title: string;
  domain: string;
  projectUuid: string;
  projectName: string;
  uuid: string;
}

export interface UnnatachedSceneTabSnapshot {
  isUnattachedScene: true;
  id: PanelTabId;
  title: string;
  deviceId?: string;
  sceneName: string;
}

export interface WorkspaceSessionSnapshot {
  version: 1;
  center: {
    tabs: SceneTabSnapshot[];
    activeTabId?: PanelTabId;
  };
}
