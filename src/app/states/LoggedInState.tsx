import Body from '../layouts/Body';
import KiwiFooter from '../layouts/KiwiFooter';
import Layout from '../layouts/Layout';
import { NavBar } from '@/features/navigation';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useGlobalStore } from '@/store/api';
import { toast } from 'sonner';

const LoggedInState = () => {
  const location = useLocation();
  const { globalState, secondsToSessionExpiration } = useGlobalStore();
  const isWorkspaceRoute = location.pathname.startsWith('/main');

  useEffect(() => {
    if (globalState === 'NOTIFIED_SESSION_EXPIRATION') {
      toast.warning('Your session is about to expire', {
        description: 'Refresh the page to extend it',
        position: 'top-center',
        duration: (Number(secondsToSessionExpiration!) - 0.5) * 1000,
      });
    }
  }, [globalState, secondsToSessionExpiration]);

  if (isWorkspaceRoute) {
    return (
      <Layout className="min-h-dvh flex flex-col overflow-hidden">
        <Body className="w-full h-full" useOutlet />
      </Layout>
    );
  }

  return (
    <Layout className="min-h-dvh flex flex-col overflow-hidden">
      <div className="fixed inset-x-0 top-0 z-50 h-14 md:h-16 lg:h-20">
        <NavBar />
      </div>

      <main className="flex-1 overflow-y-auto overscroll-contain pt-14 md:pt-16 lg:pt-20 pb-12 sm:pb-14 px-2 sm:px-4">
        <Body className="w-full h-full" useOutlet />
      </main>

      <div className="fixed inset-x-0 bottom-0 z-50">
        <KiwiFooter />
      </div>
    </Layout>
  );
};

export default LoggedInState;
