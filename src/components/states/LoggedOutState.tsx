import { Separator } from '@/components/ui/separator';
import Header from '../layouts/Header';
import { LoginPage } from '@/login';

const LoggedOutState = () => (
  <main
    className="flex flex-col mx-auto w-full max-w-md sm:max-w-lg px-4 sm:px-6 py-6 gap-4"
    aria-label="Authentication"
  >
    <Header className="w-full max-w-[580px] mx-auto mt-1 mb-3 px-4">
      <div className="flex items-baseline justify-between">
        <div className="font-bold text-2xl tracking-tight">KIWI</div>
        <img
          src="xfel_logo_128.png"
          alt="XFEL Logo"
          className="h-10 w-auto md:h-12"
        />
      </div>

      <Separator className="mt-3" />
    </Header>
    <section className="w-full">
      <LoginPage />
    </section>
  </main>
);

export default LoggedOutState;
