import Body from '../layouts/Body';
import KiwiFooter from '../layouts/KiwiFooter';
import Layout from '../layouts/Layout';
import { NavBar } from '@/navigation';

const LoggedInState = () => (
  <Layout className="min-h-dvh flex flex-col overflow-hidden">
    {/* Fixed Header */}
    <div className="fixed inset-x-0 top-0 z-50 h-14 md:h-16 lg:h-20">
      <NavBar />
    </div>

    {/* Scrollable body with padding to clear fixed header & footer */}
    <main className="flex-1 overflow-y-auto overscroll-contain pt-14 md:pt-16 lg:pt-20 pb-12 sm:pb-14 px-2 sm:px-4">
      <Body className="w-full h-full" useOutlet />
    </main>

    {/* Fixed Footer (assume ~48px–56px tall) */}
    <div className="fixed inset-x-0 bottom-0 z-50">
      <KiwiFooter />
    </div>
  </Layout>
);

export default LoggedInState;
