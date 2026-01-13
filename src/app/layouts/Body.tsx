import { Outlet } from 'react-router-dom';
import type { BodyProps } from '@/shared/types';

export default function Body({
  useOutlet,
  className,
  id = 'main',
  children,
  ...rest
}: BodyProps) {
  return (
    <main id={id} role="main" tabIndex={-1} className={className} {...rest}>
      {useOutlet ? <Outlet /> : children}
    </main>
  );
}
