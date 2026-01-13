export default function Throttler<F extends (...args: any[]) => void>(
  fn: F,
  throttleTime: number
): F {
  let isThrottled = false;

  const wrapped = function (
    this: ThisParameterType<F>,
    ...args: Parameters<F>
  ) {
    if (isThrottled) return;
    fn.apply(this, args);
    isThrottled = true;
    setTimeout(() => {
      isThrottled = false;
    }, throttleTime);
  } as F;

  return wrapped;
}
