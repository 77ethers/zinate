import Head from 'next/head';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Hero from '../components/Hero';
import PromptInput from '../components/PromptInput';
import FullscreenZineViewer from '../components/FullscreenZineViewer';
import ZineCreationProgress from '../components/ZineCreationProgress';
import ShareZineButton from '../components/ShareZineButton';
import useWorkerServices from '../hooks/useWorkerServices';
import styles from '../styles/Home.module.css'; // Import CSS Modules

const MAX_ITEMS_PER_SESSION = 30; // Soft quota as per doc
const ITEMS_PER_REQUEST = 3;

export default function HomePage() {
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [zineItems, setZineItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true); // True if more items can be loaded
  const [page, setPage] = useState(1); // For pagination/tracking loaded sets
  const [headerMinimized, setHeaderMinimized] = useState(false);
  
  // Status tracking for zine creation process
  const [creationStep, setCreationStep] = useState(null); // null, 'planning', 'content', 'generating', 'assembling', 'complete'
  
  // Use our new worker services hook
  const { generateZine, generationProgress, useDirectWorker, isGenerating } = useWorkerServices();

  const [lastRequestTime, setLastRequestTime] = useState(0);
  const REQUEST_COOLDOWN_MS = 5000; // 5 seconds

  const fetchZinePages = useCallback(async (promptToFetch, isNewPrompt = false) => {
    console.log(`[Debug] fetchZinePages: Received promptToFetch = "${promptToFetch}", isNewPrompt = ${isNewPrompt}`);
    if (Date.now() - lastRequestTime < REQUEST_COOLDOWN_MS && !isNewPrompt) {
      return;
    }

    setIsLoading(true);
    setError(null);
    
    // For first-time prompts, start tracking creation progress
    if (isNewPrompt) {
      setCreationStep('planning');
    }

    try {
      console.log(`[Debug] Starting zine generation with useDirectWorker=${useDirectWorker}`);
      
      // Use our worker services to generate the zine
      // This will automatically use Cloudflare Workers directly if enabled,
      // or fall back to the Next.js API
      const data = await generateZine(promptToFetch);
      
      console.log('[Debug] Received zine data:', {
        success: data.success,
        error: data.error,
        itemsCount: data.items ? data.items.length : 0,
        title: data.title
      });
      
      // Update our creation step based on the worker progress
      if (generationProgress.step) {
        setCreationStep(generationProgress.step);
      }
      
      setLastRequestTime(Date.now());

      if (!data.success && data.error) {
        throw new Error(data.error || 'Failed to generate zine');
      }
      
      // Set creation step to complete when data is received
      setCreationStep('complete');
      
      const newItemsWithIds = data.items.map((item, index) => ({ 
        ...item, 
        id: `item-${isNewPrompt ? 0 : zineItems.length}-${index}-${Date.now()}` 
      }));

      setZineItems(prevItems => isNewPrompt ? newItemsWithIds : [...prevItems, ...newItemsWithIds]);
      setHasMore(newItemsWithIds.length === ITEMS_PER_REQUEST && (isNewPrompt ? newItemsWithIds.length : zineItems.length + newItemsWithIds.length) < MAX_ITEMS_PER_SESSION);
      if (isNewPrompt) {
        setPage(2);
      } else {
        setPage(prevPage => prevPage + 1);
      }

    } catch (err) {
      console.error("Fetch error:", err);
      setError(err);
      setHasMore(false);
      // Reset creation step on error
      setCreationStep('error');
    } finally {
      setIsLoading(false);
    }
  }, [page, zineItems.length, lastRequestTime, generateZine, generationProgress]);

  const handlePromptSubmit = (newPrompt) => {
    setCurrentPrompt(newPrompt);
    setZineItems([]);
    setPage(1);
    setHasMore(true);
    setError(null);
    setLastRequestTime(0);
    // Reset creation step when starting new prompt
    setCreationStep('planning');
    // Auto-minimize header when creating a new zine
    setHeaderMinimized(true);
    console.log(`[Debug] handlePromptSubmit: Calling fetchZinePages with newPrompt = "${newPrompt}"`);
    fetchZinePages(newPrompt, true);
  };

  const loadMoreItems = () => {
    if (!isLoading && hasMore && currentPrompt) {
      fetchZinePages(currentPrompt, false);
    }
  };

  // Effect to handle header minimization on scroll
  useEffect(() => {
    const handleScroll = () => {
      // Always keep header minimized when loading or when zine items exist
      if (isLoading || zineItems.length > 0) {
        setHeaderMinimized(true);
        return;
      }
      
      // Only in case of no items and not loading, consider scroll position
      const scrollY = window.scrollY;
      const threshold = 50; // Lower threshold for better responsiveness
      
      if (scrollY > threshold) {
        setHeaderMinimized(true);
      } else {
        setHeaderMinimized(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    // Initial check in case the page loads scrolled or with items already
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [zineItems.length, isLoading]); // Re-run if zineItems or loading state changes

  // Effect to minimize header when images are loading or present
  useEffect(() => {
    // If we're loading images or have images, minimize the header
    if (isLoading || zineItems.length > 0) {
      setHeaderMinimized(true);
    }
    // We don't expand the header here to avoid conflicts with scroll behavior
  }, [isLoading, zineItems.length]);

  return (
    <div className={`${styles.container} ${headerMinimized ? styles.containerWithMinimizedHeader : ''}`}>
      <Head>
        <title>ZineQuest - AI Mythic Zines</title>
        <meta name="description" content="Generate endless mythic zines with AI-powered art and captions." />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <header className={`${styles.header} ${headerMinimized ? styles.headerMinimized : ''}`}>
        <Hero minimized={headerMinimized} />
        <div className={styles.promptInputWrapper}>
          <PromptInput onSubmit={handlePromptSubmit} isLoading={isLoading && zineItems.length === 0} minimized={headerMinimized} />
        </div>
      </header>

      <main className={styles.mainContent}>
        {zineItems.length === 0 && !isLoading && !error && !currentPrompt && (
          <div className={styles.initialMessageContainer}>
            <p className={styles.initialMessageText}>Type a theme above to begin your mythic journey!</p>
            <p className={styles.initialMessageExample}>For example: "Ganesha enjoying a cosmic ladoo feast"</p>
          </div>
        )}
        
        {/* Show progress indicator when loading a new zine */}
        {isLoading && zineItems.length === 0 && creationStep && (
          <ZineCreationProgress 
            currentStep={creationStep}
            error={error ? error.message : null}
          />
        )}

        <FullscreenZineViewer 
          items={zineItems} 
          onLoadMore={loadMoreItems} 
          isLoading={isLoading}
          hasMore={hasMore}
          error={error}
        />
        
        {/* Share button for when zine is created */}
        {zineItems.length > 0 && !isLoading && !error && (
          <div className={styles.shareButtonWrapper}>
            <ShareZineButton 
              items={zineItems}
              title={zineItems[0]?.title || 'My Mythic Zine'} 
              prompt={currentPrompt}
            />
          </div>
        )}
      </main>

      <footer className={styles.footer}>
        {isLoading && zineItems.length > 0 && (
          <div className={styles.footerLoadingIndicator}>
            <div className={styles.footerLoadingSpinner}></div>
            <p className={styles.footerLoadingMessage}>Conjuring more pages...</p>
          </div>
        )}
        <p className={styles.footerText}>
          ZineQuest &copy; {new Date().getFullYear()} - An AI Experiment by Windsurf
        </p>
      </footer>
    </div>
  );
}
