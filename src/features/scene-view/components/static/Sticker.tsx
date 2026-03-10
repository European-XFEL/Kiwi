/** Sticker — multiline static text label, no device binding. */

import React from 'react';
import { StickerModel } from '@/karabo/common/api';
import { registerRenderer } from '../../render/registry';
import { QFont } from '@/features/controllers/utils/fonts';

// Sticker
// ----------------------------------------------------------------------------

const Sticker: React.FC<{ model: StickerModel }> = ({ model }) => {
  const font = new QFont(model.font);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: model.background,
        color: model.foreground,
        display: 'flex',
        alignItems: 'flex-start',
        overflow: 'hidden',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        padding: '2px 4px',
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

registerRenderer('Sticker', Sticker);

export default Sticker;
