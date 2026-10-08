import { BaseBinding } from '@/lib/binding/api';

export class BindingValidator<TValue> {
  constructor(private readonly binding: BaseBinding<TValue>) {}

  validate(value: unknown): TValue | undefined {
    return this.binding.validateValue(value);
  }
}
