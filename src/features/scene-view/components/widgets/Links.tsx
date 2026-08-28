/** Links — DeviceSceneLink (controller), SceneLink, WebLink. */

import React from 'react';
import { Cpu, ExternalLink, Film } from 'lucide-react';
import {
  DeviceSceneLinkModel,
  SceneLinkModel,
  WebLinkModel,
} from '@/karabo/common/scenemodel/widgets/links';
import type { ControllerContainerContext } from './ControllerContainer';
import { registerRenderer } from '../../renderRegistry';
import { getQFontTextStyle } from '@/features/controllers/api';
import {
  openSceneLinkInWorkspace,
  openDeviceSceneLinkInWorkspace,
} from '@/features/project/api';

import { splitKaraboKeys } from '@/lib/binding/utils/splitKaraboKeys';

// useSceneNavigate
// ----------------------------------------------------------------------------
// Resolves links through the current project model before opening a scene.

function useSceneNavigate(
  target: string,
  _targetWindow: 'mainwin' | 'dialog',
  title?: string
) {
  return React.useCallback(() => {
    if (!target) return;

    openSceneLinkInWorkspace(target);
  }, [target, title]);
}

// useDeviceSceneNavigate
// ----------------------------------------------------------------------------
// Resolves links to device provided scenes from the device ID and the scene
// name before opening a scene.

function useDeviceSceneNavigate(
  deviceId: string,
  sceneName: string,
  _targetWindow: 'mainwin' | 'dialog',
  title?: string
) {
  return React.useCallback(async () => {
    if (!deviceId || !sceneName) return;

    await openDeviceSceneLinkInWorkspace(deviceId, sceneName);
  }, [deviceId, sceneName, title]);
}

// LinkButton — shared layout for all link types
// ----------------------------------------------------------------------------

function LinkButton({
  text,
  font,
  foreground,
  background,
  frame_width,
  title,
  onClick,
  Icon,
  iconColor,
}: {
  text: string;
  font: string;
  foreground: string;
  background: string;
  frame_width: number;
  title?: string;
  onClick?: () => void;
  Icon: React.ElementType;
  iconColor: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={{
        position: 'relative',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        height: '100%',
        backgroundColor: background,
        color: foreground,
        borderWidth: frame_width,
        borderStyle: 'solid',
        borderColor: foreground,
        ...getQFontTextStyle(font),
        cursor: onClick ? 'pointer' : 'default',
        pointerEvents: 'auto',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
      }}
    >
      <Icon
        size={10}
        color={iconColor}
        style={{ position: 'absolute', top: 2, left: 2 }}
      />
      {text}
    </button>
  );
}

// DeviceSceneLink
// ----------------------------------------------------------------------------

const DeviceSceneLink: React.FC<{
  model: DeviceSceneLinkModel;
  ctx?: ControllerContainerContext;
}> = ({ model }) => {
  const { deviceId } = splitKaraboKeys(model.keys[0]);
  const sceneName = model.target;
  const go = useDeviceSceneNavigate(deviceId, sceneName, model.target_window);
  return (
    <LinkButton
      text={model.text}
      font={model.font}
      foreground={model.foreground}
      background={model.background}
      frame_width={model.frame_width}
      title={sceneName}
      onClick={sceneName ? go : undefined}
      Icon={Cpu}
      iconColor="#0ea5e9"
    />
  );
};

// SceneLink
// ----------------------------------------------------------------------------

const SceneLink: React.FC<{ model: SceneLinkModel }> = ({ model }) => {
  const parts = model.target.split(':');
  if (parts.length !== 2) {
    return;
  }
  const name = parts[0];
  const target = parts[1];

  const go = useSceneNavigate(target, model.target_window, name);
  return (
    <LinkButton
      text={model.text}
      font={model.font}
      foreground={model.foreground}
      background={model.background}
      frame_width={model.frame_width}
      title={`Scene: ${name}`}
      onClick={go}
      Icon={Film}
      iconColor="#64748b"
    />
  );
};

// WebLink
// ----------------------------------------------------------------------------

const WebLink: React.FC<{ model: WebLinkModel }> = ({ model }) => (
  <LinkButton
    text={model.text}
    font={model.font}
    foreground={model.foreground}
    background={model.background}
    frame_width={model.frame_width}
    title={model.target}
    onClick={() => {
      if (model.target)
        window.open(model.target, '_blank', 'noopener,noreferrer');
    }}
    Icon={ExternalLink}
    iconColor="#f43f5e"
  />
);

registerRenderer('DeviceSceneLink', DeviceSceneLink);
registerRenderer('SceneLink', SceneLink);
registerRenderer('WebLink', WebLink);
