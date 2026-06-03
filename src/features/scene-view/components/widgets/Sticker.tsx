/** Sticker — multiline static text label, no device binding. */

import React from 'react';
import { StickerModel } from '@/karabo/common/api';
import { registerRenderer } from '../../renderRegistry';
import { getQFontTextStyle } from '@/features/controllers/api';

// Sticker
// ----------------------------------------------------------------------------

const Sticker: React.FC<{ model: StickerModel }> = ({ model }) => {
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
        ...getQFontTextStyle(model.font),
      }}
    >
      {model.text}
    </div>
  );
};

registerRenderer('Sticker', Sticker);

export default Sticker;
