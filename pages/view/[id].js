import Head from 'next/head';
import { useRouter } from 'next/router';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import FullscreenZineViewer from '../../components/FullscreenZineViewer';
import styles from '../../styles/SharedZine.module.css';
import ClientWorkerAdapter from '../../services/client-worker-adapter';

export default function SharedZinePage() {
  const router = useRouter();
  const { id } = router.query;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [zine, setZine] = useState(null);
  const [adapter] = useState(() => new ClientWorkerAdapter());

  useEffect(() => {
    async function fetchSharedZine() {
      if (!id) return; // Wait for router to be ready

      try {
        setLoading(true);
        setError(null);

        const response = await adapter.getSharedZine(id);

        if (!response.success || !response.zine) {
          throw new Error(response.error || 'Failed to load the shared zine');
        }

        // Format items as required by the FullscreenZineViewer
        setZine(response.zine);
      } catch (err) {
        console.error('Error fetching shared zine:', err);
        setError(err.message || 'Something went wrong loading the zine');
      } finally {
        setLoading(false);
      }
    }

    fetchSharedZine();
  }, [id, adapter]);

  if (!id) {
    return <div className={styles.loadingContainer}>Loading...</div>;
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>{zine?.title || 'Shared Zine'} | ZineQuest</title>
        <meta name="description" content={`View a shared mythic zine: ${zine?.title || 'ZineQuest creation'}`} />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <header className={styles.header}>
        <div className={styles.headerContent}>
          <Link href="/" className={styles.homeLink}>
            <h1 className={styles.logo}>ZineQuest</h1>
          </Link>
          {zine && (
            <div className={styles.zineInfo}>
              <h2 className={styles.zineTitle}>{zine.title}</h2>
              {zine.prompt && <p className={styles.zinePrompt}>Inspired by: "{zine.prompt}"</p>}
            </div>
          )}
        </div>
      </header>

      <main className={styles.main}>
        {loading && (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner}></div>
            <p>Loading shared zine...</p>
          </div>
        )}

        {error && (
          <div className={styles.errorContainer}>
            <svg xmlns="http://www.w3.org/2000/svg" className={styles.errorIcon} viewBox="0 0 24 24" fill="currentColor">
              <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
            </svg>
            <h3>Error Loading Zine</h3>
            <p>{error}</p>
            <Link href="/" className={styles.returnHomeButton}>
              Return Home
            </Link>
          </div>
        )}

        {!loading && !error && zine && (
          <FullscreenZineViewer
            items={zine.items}
            isLoading={false}
            hasMore={false}
            error={null}
          />
        )}
      </main>

      <footer className={styles.footer}>
        <p>Create your own mythic zine at <Link href="/" className={styles.footerLink}>ZineQuest</Link></p>
      </footer>
    </div>
  );
}
