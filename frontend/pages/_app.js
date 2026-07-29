import { useEffect } from 'react';
import '../styles/globals.css';
import ToastContainer from '../components/ToastContainer';
import LiveAgentWidget from '../components/LiveAgentWidget';
import DocumentationModal from '../components/DocumentationModal';
import { useAuthStore } from '../lib/store';
import { Analytics } from '@vercel/analytics/next';

export default function App({ Component, pageProps }) {
  useEffect(() => {
    useAuthStore.getState().hydrate();
  }, []);

  return (
    <>
      <Component {...pageProps} />
      <ToastContainer />
      <LiveAgentWidget />
      <DocumentationModal />
      <Analytics />
    </>
  );
}
