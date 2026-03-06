/** Label — static text widget, no device binding. */

import React from 'react';
import { LabelModel } from '@/karabo/common/scenemodel/widgets/static';
import { registerRenderer } from '@/features/scene-view/render/registry';
import { QFont } from '@/features/controllers/utils/fonts';

// Label
// ----------------------------------------------------------------------------

const ALIGNH_MAP: Record<1 | 2 | 4, React.CSSProperties['justifyContent']> = {
  1: 'flex-start',
  2: 'center',
  4: 'flex-end',
};

const Label: React.FC<{ model: LabelModel }> = ({ model }) => {
  const font = new QFont(model.font);

  return (
    <div
      role="text"
      aria-label={model.text}
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: model.background,
        borderWidth: model.frame_width,
        borderColor: model.foreground,
        borderStyle: 'solid',
        color: model.foreground,
        display: 'flex',
        alignItems: 'center',
        justifyContent: ALIGNH_MAP[model.alignh],
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
        fontFamily: font.css_fontFamily,
        fontSize: font.css_fontSize,
        fontWeight: font.css_fontWeight,
        fontStyle: font.css_fontStyle,
        textDecoration: font.css_textDecoration,
      }}
    >
      {model.text}
    </div>
  );
};

registerRenderer('Label', Label);

export default Label;
