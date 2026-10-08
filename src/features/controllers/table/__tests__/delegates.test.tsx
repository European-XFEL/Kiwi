import { render, screen } from '@testing-library/react';
import { HashAttributes, HashType } from '@/karabo/data/api';
import {
  BaseBinding,
  BoolBinding,
  DoubleBinding,
  Int8Binding,
  StringBinding,
  VectorStringBinding,
  Int64Binding,
} from '@/lib/binding/api';
import { getStateColor } from '@/lib/Indicators';
import {
  BoolButtonDelegate,
  StringButtonDelegate,
  type DelegateProps,
} from '../delegates';
import { getDisplayDelegate } from '../getDisplayDelegate';
import { formatTableCell } from '../formatTableCell';

function Cell(props: DelegateProps) {
  const delegate = getDisplayDelegate(props.binding);
  const Component = delegate.Component;
  return (
    <div style={delegate.getStyle?.(props)}>
      {Component ? (
        <Component {...props} />
      ) : (
        formatTableCell(props.value, props.binding)
      )}
    </div>
  );
}

function binding<T extends BaseBinding>(
  value: T,
  displayType: string,
  hashType: HashType
) {
  value.displayType = displayType;
  value.hashType = hashType;
  return value;
}

test('selects delegates by prefix and compatible binding, with exact state matching', () => {
  expect(
    getDisplayDelegate(
      binding(
        new BoolBinding(),
        'TableBoolButton|confirmation=1',
        HashType.Bool
      )
    )
  ).toEqual({ Component: BoolButtonDelegate });
  expect(
    getDisplayDelegate(
      binding(new StringBinding(), 'TableStringButton', HashType.String)
    )
  ).toEqual({ Component: StringButtonDelegate });
  expect(
    getDisplayDelegate(
      binding(new Int8Binding(), 'TableProgressBar', HashType.Int8)
    )
  ).toEqual({ Component: expect.any(Function) });
  expect(
    getDisplayDelegate(
      binding(new StringBinding(), 'TableColor', HashType.String)
    )
  ).toEqual({ getStyle: expect.any(Function) });
  expect(
    getDisplayDelegate(
      binding(new DoubleBinding(), 'TableColor', HashType.Double)
    )
  ).toEqual({ getStyle: expect.any(Function) });
  expect(
    getDisplayDelegate(binding(new StringBinding(), 'State', HashType.String))
  ).toEqual({ getStyle: expect.any(Function) });
  expect(
    getDisplayDelegate(
      binding(new StringBinding(), 'state|x=y', HashType.String)
    )
  ).toEqual({});
  expect(
    getDisplayDelegate(
      binding(new StringBinding(), 'TableBoolButton', HashType.String)
    )
  ).toEqual({});
  expect(
    getDisplayDelegate(
      binding(new VectorStringBinding(), 'TableColor', HashType.VectorString)
    )
  ).toEqual({});
});

test('bigint progress subtracts nearby 64-bit bounds before conversion', () => {
  const low = (1n << 63n) - 100n;
  const column = binding(
    new Int64Binding({
      attributes: new HashAttributes({ minInc: low, maxInc: low + 10n }),
    }),
    'TableProgressBar',
    HashType.Int64
  );
  render(<Cell value={low + 5n} binding={column} />);
  expect(screen.getByRole('progressbar')).toHaveAttribute(
    'aria-valuenow',
    '50'
  );
});

test('unusable bigint limit attributes retain text without a fill', () => {
  const column = binding(
    new Int64Binding({ attributes: new HashAttributes({ minExc: NaN }) }),
    'TableProgressBar',
    HashType.Int64
  );
  render(<Cell value={5n} binding={column} />);
  expect(screen.getByText('5')).toBeInTheDocument();
  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
});

test('state fills the cell and leaves invalid state text uncolored', () => {
  const column = binding(new StringBinding(), 'State', HashType.String);
  const { getStyle } = getDisplayDelegate(column);
  expect(getStyle!({ value: 'ACTIVE', binding: column }).backgroundColor).toBe(
    getStateColor('ACTIVE')
  );
  expect(
    getStyle!({ value: 'nonsense', binding: column }).backgroundColor
  ).toBe('');
  render(<Cell value="nonsense" binding={column} />);
  expect(screen.getByText('nonsense')).toBeInTheDocument();
});

test('selects the state delegate for the schema display type State', () => {
  expect(
    getDisplayDelegate(binding(new StringBinding(), 'state', HashType.String))
  ).toEqual({});
  expect(
    getDisplayDelegate(binding(new StringBinding(), 'State', HashType.String))
  ).toEqual({ getStyle: expect.any(Function) });
  expect(
    getDisplayDelegate(
      binding(new StringBinding(), 'State|x=y', HashType.String)
    )
  ).toEqual({});
});

test('color mappings use the first value, default, formatted numbers, and unset invalid colors', () => {
  const column = binding(
    new StringBinding(),
    'TableColor|yes=red&yes=blue&bad=invalid&default=green',
    HashType.String
  );
  const { getStyle } = getDisplayDelegate(column);
  expect(getStyle!({ value: 'yes', binding: column })).toEqual({
    backgroundColor: 'red',
    textAlign: 'center',
  });
  expect(getStyle!({ value: 'other', binding: column }).backgroundColor).toBe(
    'green'
  );
  expect(getStyle!({ value: 'bad', binding: column }).backgroundColor).toBe('');
  column.displayType = 'TableColor';
  expect(
    getDisplayDelegate(column).getStyle!({ value: 'yes', binding: column })
      .backgroundColor
  ).toBe('');
  const number = binding(
    new DoubleBinding(),
    'TableColor|1.000=red',
    HashType.Double
  );
  expect(
    getDisplayDelegate(number).getStyle!({ value: 1, binding: number })
      .backgroundColor
  ).toBe('red');
});

test('color and state delegate preparation creates no elements', () => {
  const color = binding(
    new StringBinding(),
    'TableColor|yes=red&default=green',
    HashType.String
  );
  const state = binding(new StringBinding(), 'State', HashType.String);
  const createElement = jest.spyOn(document, 'createElement');
  getDisplayDelegate(color);
  getDisplayDelegate(state);
  expect(createElement).not.toHaveBeenCalled();
  createElement.mockRestore();
});

test('color query decoding preserves blank mappings and the first default', () => {
  const column = binding(
    new StringBinding(),
    'TableColor|a%26b=%23ff0000&with+space=blue&literal%2Bplus=red&blank=&default=green&default=blue',
    HashType.String
  );
  const { getStyle } = getDisplayDelegate(column);
  const color = (value: string) =>
    getStyle!({ value, binding: column }).backgroundColor;
  expect(color('a&b')).toBe('#ff0000');
  expect(color('with space')).toBe('blue');
  expect(color('literal+plus')).toBe('red');
  expect(color('blank')).toBe('');
  expect(color('unmapped')).toBe('green');
  expect(color('default')).toBe('green');
});

test.each(['TableColor', 'TableColor|yes=red|default=green'])(
  'color queries require exactly one separator: %s',
  (displayType) => {
    const column = binding(new StringBinding(), displayType, HashType.String);
    const { getStyle } = getDisplayDelegate(column);
    expect(getStyle!({ value: 'yes', binding: column }).backgroundColor).toBe(
      ''
    );
  }
);

test('progress clamps fill while preserving formatted text, and omits invalid fills', () => {
  const column = binding(
    new DoubleBinding({
      attributes: new HashAttributes({ minInc: 0, maxInc: 10 }),
    }),
    'TableProgressBar',
    HashType.Double
  );
  const { rerender } = render(<Cell value={20} binding={column} />);
  expect(screen.getByRole('progressbar')).toHaveAttribute(
    'aria-valuenow',
    '100'
  );
  expect(screen.getByText('20.000')).toBeInTheDocument();
  rerender(<Cell value={-5} binding={column} />);
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  rerender(<Cell value={NaN} binding={column} />);
  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  column.attributes = new HashAttributes({ minInc: 1, maxInc: 1 });
  rerender(<Cell value={1} binding={column} />);
  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
});

test('progress handles the native double range without overflowing', () => {
  const column = binding(
    new DoubleBinding(),
    'TableProgressBar',
    HashType.Double
  );
  render(<Cell value={0} binding={column} />);
  expect(screen.getByRole('progressbar')).toHaveAttribute(
    'aria-valuenow',
    '50'
  );
});

test.each([
  [-10n, '0'],
  [20n, '100'],
] as const)('bigint progress clamps %p', (value, percentage) => {
  const column = binding(
    new Int64Binding({
      attributes: new HashAttributes({ minInc: 0n, maxInc: 10n }),
    }),
    'TableProgressBar',
    HashType.Int64
  );
  render(<Cell value={value} binding={column} />);
  expect(screen.getByRole('progressbar')).toHaveAttribute(
    'aria-valuenow',
    percentage
  );
});
