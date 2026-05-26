/** Links — DeviceSceneLink (controller), SceneLink, WebLink. */

import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Cpu, ExternalLink, Film } from 'lucide-react';
import {
  DeviceSceneLinkModel,
  SceneLinkModel,
  WebLinkModel,
} from '@/karabo/common/scenemodel/widgets/links';
import type { ControllerContainerContext } from '@/features/controllers/components/ControllerContainer';
import { registerRenderer } from '@/features/scene-view/renderRegistry';
import { getQFontTextStyle } from '@/features/controllers/utils/fonts';
import { getControllerIndicator } from '@/features/controllers/utils/controller_semantics';

// useSceneNavigate
// ----------------------------------------------------------------------------
// target may be "projectName:uuid" (SceneLink) or just "uuid" (DeviceSceneLink).
// Replaces only the parts that are present, preserving host/port/domain.

function useSceneNavigate(target: string, targetWindow: 'mainwin' | 'dialog') {
  const location = useLocation();
  const navigate = useNavigate();

  return React.useCallback(() => {
    if (!target) return;
    const colonIdx = target.indexOf(':');
    const projectName = colonIdx >= 0 ? target.slice(0, colonIdx) : null;
    const uuid = colonIdx >= 0 ? target.slice(colonIdx + 1) : target;

    let next = location.search.replace(/([?&]uuid=)[^&]*/, `$1${uuid}`);
    if (projectName) {
      next = next.replace(/([?&]projectName=)[^&]*/, `$1${projectName}`);
    }

    if (targetWindow === 'dialog') {
      window.open(
        `${location.pathname}${next}`,
        '_blank',
        'noopener,noreferrer'
      );
    } else {
      navigate({ pathname: location.pathname, search: next });
    }
  }, [target, targetWindow, location, navigate]);
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
        width: '100%',
        height: '100%',
        backgroundColor: background,
        color: foreground,
        borderWidth: frame_width,
        borderStyle: 'solid',
        borderColor: foreground,
        ...getQFontTextStyle(font),
        cursor: onClick ? 'pointer' : 'default',
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
// target="scene" is a fixed label — the real scene identifier comes from
// the device's availableScenes property (ctx.proxy.value).

const DeviceSceneLink: React.FC<{
  model: DeviceSceneLinkModel;
  ctx?: ControllerContainerContext;
}> = ({ model, ctx }) => {
  const scenes = ctx?.proxy?.value;
  const disabledReason = getControllerIndicator(
    model.keys,
    ctx?.proxy
  ).statusText;
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
      title={
        firstScene
          ? `Scene: ${firstScene}`
          : (disabledReason ?? 'No scene available')
      }
      onClick={firstScene ? go : undefined}
      Icon={Cpu}
      iconColor="#0ea5e9"
    />
  );
};

// SceneLink
// ----------------------------------------------------------------------------

const SceneLink: React.FC<{ model: SceneLinkModel }> = ({ model }) => {
  const go = useSceneNavigate(model.target, model.target_window);
  return (
    <LinkButton
      text={model.text}
      font={model.font}
      foreground={model.foreground}
      background={model.background}
      frame_width={model.frame_width}
      title={`Scene: ${model.target}`}
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
