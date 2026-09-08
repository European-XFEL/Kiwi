import { render, screen } from '@testing-library/react';
import { EvaluatorModel } from '@/karabo/common/api';
import { AccessLevel } from '@/karabo/data/enums';
import {
  BindingRoot,
  DeviceProxy,
  PropertyProxy,
  StringBinding,
} from '@/lib/binding/api';
import Evaluator from '../Evaluator';

test('renders the value on a grey background', () => {
  const root = new DeviceProxy('DEV');
  root.binding = new BindingRoot();
  root.binding.value!.set('value', new StringBinding({ value: 'reading' }));
  const proxy = new PropertyProxy(root, 'value');
  const ctx = {
    proxy,
    proxies: [proxy],
    userAccessLevel: AccessLevel.OBSERVER,
  };
  render(<Evaluator model={new EvaluatorModel()} ctx={ctx} />);
  expect(screen.getByText('reading').style.backgroundColor).toBe(
    'rgb(238, 238, 238)'
  );
});
