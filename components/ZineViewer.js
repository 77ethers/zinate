import React, { useRef, useEffect, useCallback } from 'react';
import ZineItem from './ZineItem';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './ZineViewer.module.css';

const ZineViewer = ({ items, onLoadMore, isLoading, hasMore, error }) => {
  const observer = useRef();

  const lastItemRef = useCallback(node => {
    if (isLoading || !hasMore || error) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        onLoadMore();
      }
    });
    if (node) observer.current.observe(node);
  }, [isLoading, hasMore, onLoadMore, error]);

  if (error) {
    return (
      <div className={styles.stateContainer}>
        <p className={styles.errorMessage}>Oops! Something went wrong.</p>
        <p className={styles.errorDetails}>{error.message || 'Failed to load new zine pages.'}</p>
        <button 
          onClick={onLoadMore} 
          className={styles.retryButton}
          disabled={isLoading}
        >
          {isLoading ? 'Retrying...' : 'Retry'}
        </button>
      </div>
    );
  }

  if (items.length === 0 && !isLoading && !error && hasMore === false) {
     return (
      <div className={styles.stateContainer}>
        <p className={styles.messageText}>You've reached the end of this adventure!</p>
        <p className={styles.secondaryMessage}>Want to start a new one? Enter a new prompt above.</p>
      </div>
    );
  }

  return (
    <div className={styles.viewerContainer}>
      <AnimatePresence>
        <div className={styles.itemsGrid}>
          {items.map((item, index) => (
            <motion.div 
              key={item.id || index} 
              ref={index === items.length - 1 ? lastItemRef : null}
            >
              <ZineItem imageUrl={item.imageUrl} caption={item.caption} />
            </motion.div>
          ))}
        </div>
      </AnimatePresence>

      {isLoading && (
        <div className={styles.stateContainer}>
          <div className={styles.loadingSpinner}></div>
          <p className={styles.loadingMessage}>Conjuring new pages...</p>
        </div>
      )}

      {!isLoading && !hasMore && items.length > 0 && (
        <div className={`${styles.stateContainer} ${styles.endMessageContainerLargePadding}`}>
          <p className={styles.endMessageTitle}>You've reached the end!</p>
          <p className={styles.messageText}>Enjoyed this mythic journey?</p>
          <p className={styles.secondaryMessage}>Start a new adventure with a fresh prompt above!</p>
        </div>
      )}
    </div>
  );
};

export default ZineViewer;
