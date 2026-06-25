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
import { Hash } from '@/karabo/data/hash';
import { broadcast_event, KaraboEvent } from '@/lib/events';

// useSceneNavigate
// ----------------------------------------------------------------------------
// Fires KaraboEvent.OpenScene instead of calling navigate().
// PanelWrangler can inherit host/port/domain/project from the active scene,
// so widget clicks should not depend on the current browser URL state.

function useSceneNavigate(
  target: string,
  _targetWindow: 'mainwin' | 'dialog',
  title?: string
) {
  return React.useCallback(() => {
    if (!target) return;

    const colonIdx = target.indexOf(':');
    const projectName = colonIdx >= 0 ? target.slice(0, colonIdx) : undefined;
    const uuid = colonIdx >= 0 ? target.slice(colonIdx + 1) : target;
    if (!uuid) return;

    const hash = new Hash();
    hash.set('uuid', uuid);
    if (projectName) {
      hash.set('project', projectName);
    }
    if (title) {
      hash.set('name', title);
    }

    broadcast_event(KaraboEvent.OpenScene, hash);
  }, [target, title]);
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
}> = ({ model, ctx }) => {
  const scenes = ctx?.proxy?.value;
  const firstScene: string =
    Array.isArray(scenes) && scenes.length > 0
      ? String(scenes[0])
      : typeof scenes === 'string' && scenes
        ? scenes
        : '';
  const go = useSceneNavigate(firstScene, model.target_window);
  return (
    <LinkButton
      text={model.text}
      font={model.font}
      foreground={model.foreground}
      background={model.background}
      frame_width={model.frame_width}
      title={firstScene}
      onClick={firstScene ? go : undefined}
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
