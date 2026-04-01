import Body from '../layouts/Body';
import KiwiFooter from '../layouts/KiwiFooter';
import Layout from '../layouts/Layout';
import { NavBar } from '@/features/navigation';
import { useEffect } from 'react';
import { useGlobalStore } from '@/store/globalAppStateStore';
import { Slide, ToastContainer, toast } from 'react-toastify';

const LoggedInState = () => {
  const { globalState, secondsToSessionExpiration } = useGlobalStore();

  useEffect(() => {
    if (globalState === 'NOTIFIED_SESSION_EXPIRATION') {
      toast.warn(
        <div>
          {'Your session is about to expire'}
          <br />
          {'Refresh the page to extend it'}
        </div>,
        {
          position: 'top-center',
          autoClose: (Number(secondsToSessionExpiration!) - 0.5) * 1000,
          closeOnClick: true,
          theme: 'colored',
          transition: Slide,
        }
      );
    }
  }, [globalState, secondsToSessionExpiration]);

  return (
    <Layout className="min-h-dvh flex flex-col overflow-hidden">
      {/* Fixed Header */}
      <div className="fixed inset-x-0 top-0 z-50 h-14 md:h-16 lg:h-20">
        <NavBar />
        <ToastContainer position="top-center" theme="light" />
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
};

export default LoggedInState;
