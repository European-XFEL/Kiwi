import { render, screen } from '@testing-library/react';
import { LabelModel } from '@/karabo/common/api';

// The real module pulls in import.meta.glob via the stateful-icon bootstrap,
// which Jest's CJS runtime cannot parse. Only the font style helper is needed.
jest.mock('@/features/controllers/api', () => ({
  getQFontTextStyle: () => ({}),
}));

import Label from '../Label';

function renderLabel(alignh: 1 | 2 | 4) {
  const model = new LabelModel();
  model.text = 'Beamline';
  model.foreground = '#000000';
  model.alignh = alignh;

  render(<Label model={model} />);
  return screen.getByRole('text');
}

describe('Label horizontal alignment', () => {
  // alignh carries Qt alignment bit flags: AlignLeft = 0x1, AlignRight = 0x2,
  // AlignHCenter = 0x4. Reading them as an ordinal left/center/right enum
  // swaps right and center, which rendered centered labels flush right.
  it('renders Qt::AlignLeft (1) flush left', () => {
    expect(renderLabel(1)).toHaveStyle({ justifyContent: 'flex-start' });
  });

  it('renders Qt::AlignRight (2) flush right', () => {
    expect(renderLabel(2)).toHaveStyle({ justifyContent: 'flex-end' });
  });

  it('renders Qt::AlignHCenter (4) centered', () => {
    expect(renderLabel(4)).toHaveStyle({ justifyContent: 'center' });
  });

  it('defaults to left alignment', () => {
    expect(new LabelModel().alignh).toBe(1);
  });
});
