/** Links — DeviceSceneLink, SceneLink, WebLink. No device binding. */

import React from 'react';
import {
  DeviceSceneLinkModel,
  SceneLinkModel,
  WebLinkModel,
} from '@/karabo/common/models/widgets/links';
import { registerRenderer } from '@/features/scene-view/render/registry';
import { QtFontDescriptor } from '@/scene/utils/QtFontDescriptor';

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
}: {
  text: string;
  font: string;
  foreground: string;
  background: string;
  frame_width: number;
  title?: string;
  onClick?: () => void;
}) {
  const f = new QtFontDescriptor(font);
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: background,
        color: foreground,
        borderWidth: frame_width,
        borderStyle: 'solid',
        borderColor: foreground,
        fontFamily: f.css_fontFamily,
        fontSize: f.css_fontSize,
        fontWeight: f.css_fontWeight,
        fontStyle: f.css_fontStyle,
        textDecoration: f.css_textDecoration,
        cursor: onClick ? 'pointer' : 'default',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
      }}
    >
      {text}
    </button>
  );
}

// DeviceSceneLink
// ----------------------------------------------------------------------------

const DeviceSceneLink: React.FC<{ model: DeviceSceneLinkModel }> = ({
  model,
}) => (
  <LinkButton
    text={model.text}
    font={model.font}
    foreground={model.foreground}
    background={model.background}
    frame_width={model.frame_width}
    title={`Scene: ${model.target}`}
    onClick={() => {
      // TODO: open target scene in dialog or tab
    }}
  />
);

// SceneLink
// ----------------------------------------------------------------------------

const SceneLink: React.FC<{ model: SceneLinkModel }> = ({ model }) => (
  <LinkButton
    text={model.text}
    font={model.font}
    foreground={model.foreground}
    background={model.background}
    frame_width={model.frame_width}
    title={`Scene: ${model.target}`}
    onClick={() => {
      // TODO: navigate to target scene
    }}
  />
);

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
  />
);

registerRenderer('DeviceSceneLink', DeviceSceneLink);
registerRenderer('SceneLink', SceneLink);
registerRenderer('WebLink', WebLink);
