import Body from '../layouts/Body';
import Layout from '../layouts/Layout';
import { useEffect } from 'react';
import { useGlobalStore } from '@/store/api';
import { toast } from 'sonner';

const LoggedInState = () => {
  const { globalState, secondsToSessionExpiration } = useGlobalStore();

  useEffect(() => {
    if (globalState === 'NOTIFIED_SESSION_EXPIRATION') {
      toast.warning('Your session is about to expire', {
        description: 'Refresh the page to extend it',
        position: 'top-center',
        duration: (Number(secondsToSessionExpiration!) - 0.5) * 1000,
      });
    }
  }, [globalState, secondsToSessionExpiration]);

  return (
    <Layout className="min-h-dvh flex flex-col overflow-hidden">
      <Body className="w-full h-full" useOutlet />
    </Layout>
  );
};

export default LoggedInState;
