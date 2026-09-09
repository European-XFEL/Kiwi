import { render, screen } from '@testing-library/react';
import { LabelModel } from '@/karabo/common/api';

// The real module pulls in import.meta.glob via the stateful-icon bootstrap,
// which Jest's CJS runtime cannot parse. Only the font style helper is needed.
jest.mock('@/features/controllers/api', () => ({
  getQFontTextStyle: () => ({}),
}));

import Label from '../Label';

function renderLabel(alignh: 1 | 2 | 4, text = 'Beamline') {
  const model = new LabelModel();
  model.text = text;
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

describe('Label whitespace', () => {
  // Scene authors pad Text widgets with runs of spaces to align table-like
  // columns. 'nowrap' collapses each run to a single space and loses that
  // alignment, so the widget renders with 'pre'. jsdom does no layout, so the
  // computed style is the only observable proxy for the collapsing itself.
  const padded = 'f/1.4    1     0';

  it('renders with a whitespace mode that preserves space runs', () => {
    expect(renderLabel(1, padded)).toHaveStyle({ whiteSpace: 'pre' });
  });

  it('passes the model text through unnormalized', () => {
    expect(renderLabel(1, padded)).toHaveTextContent(padded, {
      normalizeWhitespace: false,
    });
  });
});
