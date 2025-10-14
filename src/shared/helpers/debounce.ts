export default function Debouncer<F extends (...args: any[]) => void>(
  fn: F,
  delay: number
): F {
  let timerId: ReturnType<typeof setTimeout> | null = null;

  const wrapped = function (
    this: ThisParameterType<F>,
    ...args: Parameters<F>
  ) {
    if (timerId) clearTimeout(timerId);
    timerId = setTimeout(() => {
      fn.apply(this, args);
      timerId = null;
    }, delay);
  } as F;

  return wrapped;
}
