import { Outlet } from 'react-router-dom';

export type BodyProps = React.HTMLAttributes<HTMLElement> & {
  useOutlet?: boolean;
  id?: string;
};

export default function Body({
  useOutlet,
  className,
  id = 'main',
  children,
  ...rest
}: BodyProps) {
  return (
    <main
      data-testid="app-body"
      id={id}
      role="main"
      tabIndex={-1}
      className={className}
      {...rest}
    >
      {useOutlet ? <Outlet /> : children}
    </main>
  );
}
