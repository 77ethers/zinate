import React, { useRef, useEffect, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './FullscreenZineViewer.module.css';

const FullscreenZinePage = ({ imageUrl, caption, index, isActive, totalPages }) => {
  // Use a ref to track if this is the first render
  const firstRender = React.useRef(true);
  
  // After first render, set firstRender to false
  React.useEffect(() => {
    firstRender.current = false;
  }, []);
  
  // Use spring animation for more fluid motion
  const pageVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.5 } }
  };
  
  // Image animation variants
  const imageVariants = {
    inactive: { 
      scale: 1.05, 
      opacity: 0.3,
      y: 20,
      filter: 'brightness(0.7) blur(3px)' 
    },
    active: { 
      scale: 1, 
      opacity: 1, 
      y: 0,
      filter: 'brightness(1.05) blur(0px)' 
    }
  };
  
  // Caption animation variants
  const captionVariants = {
    inactive: { y: 50, opacity: 0 },
    active: { y: 0, opacity: 1, transition: { delay: 0.3, duration: 0.7 } }
  };
  
  return (
    <motion.div 
      className={`${styles.zinePage} ${isActive ? styles.activePage : ''}`} 
      id={`page-${index}`}
      variants={pageVariants}
      initial='hidden'
      animate='visible'
      style={{
        // Add a slight parallax effect during scrolling
        transformStyle: 'preserve-3d',
        perspective: '1000px'
      }}
    >
      <motion.div 
        className={styles.imageContainer}
        animate={isActive ? 'active' : 'inactive'}
        variants={imageVariants}
        transition={{ 
          type: 'spring',
          stiffness: 120,
          damping: 20
        }}
      >
        <motion.img 
          src={imageUrl} 
          alt={`Zine page ${index + 1}`}
          className={styles.fullscreenImage}
          initial={{ scale: firstRender.current ? 1 : 1.1, opacity: firstRender.current ? (isActive ? 1 : 0) : 0 }}
          animate={{ 
            scale: isActive ? 1 : 1.1, 
            opacity: isActive ? 1 : 0,
          }}
          transition={{ 
            duration: 0.8, 
            ease: [0.19, 1, 0.22, 1], // Expo ease
            opacity: { duration: 0.6 }
          }}
          whileHover={{ scale: 1.02 }} // Subtle hover effect
          layoutId={`image-${index}`} // Helps with consistent animation
        />
      </motion.div>
      
      <motion.div 
        className={styles.captionContainer}
        variants={captionVariants}
        animate={isActive ? 'active' : 'inactive'}
        transition={{ 
          type: 'spring',
          stiffness: 100,
          damping: 20,
          ease: [0.19, 1, 0.22, 1]
        }}
      >
        <motion.div 
          className={styles.caption}
          dangerouslySetInnerHTML={{ __html: caption }}
          initial={{ opacity: 0 }}
          animate={{ opacity: isActive ? 1 : 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        />
        <motion.div 
          className={styles.pageIndicator}
          animate={{ 
            scale: isActive ? 1.1 : 1,
            opacity: isActive ? 1 : 0.7
          }}
          transition={{ 
            type: 'spring',
            stiffness: 300,
            damping: 20
          }}
        >
          <span className={styles.pageNumber}>{index + 1}</span>
          <span className={styles.pageDivider}>/</span>
          <span className={styles.totalPages}>{totalPages}</span>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

const FullscreenZineViewer = ({ items, onLoadMore, isLoading, hasMore, error }) => {
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [showScrollIndicator, setShowScrollIndicator] = useState(true);
  const observerRef = useRef(null);
  const pagesRef = useRef([]);
  const viewerRef = useRef(null);
  
  // Set up intersection observer to detect which page is currently visible
  useEffect(() => {
    const options = {
      root: null, // viewport
      rootMargin: '0px',
      threshold: 0.6 // 60% of the element must be visible
    };
    
    const handleIntersect = (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          const index = parseInt(id.split('-')[1]);
          setActivePageIndex(index);
          
          // Hide scroll indicator after first page
          if (index > 0) {
            setShowScrollIndicator(false);
          } else {
            setShowScrollIndicator(true);
          }
          
          // If we're near the end, load more content
          if (index >= items.length - 3 && hasMore && !isLoading) {
            onLoadMore();
          }
        }
      });
    };
    
    observerRef.current = new IntersectionObserver(handleIntersect, options);
    
    // Observe all pages
    pagesRef.current.forEach(page => {
      if (page) observerRef.current.observe(page);
    });
    
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [items, hasMore, isLoading, onLoadMore]);
  
  // Update refs when items change
  useEffect(() => {
    pagesRef.current = pagesRef.current.slice(0, items.length);
    
    // Re-observe all pages
    if (observerRef.current) {
      observerRef.current.disconnect();
      pagesRef.current.forEach(page => {
        if (page) observerRef.current.observe(page);
      });
    }
  }, [items]);
  
  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === ' ') {
        // Navigate to next page
        if (activePageIndex < items.length - 1) {
          const nextPage = document.getElementById(`page-${activePageIndex + 1}`);
          if (nextPage) nextPage.scrollIntoView({ behavior: 'smooth' });
        }
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        // Navigate to previous page
        if (activePageIndex > 0) {
          const prevPage = document.getElementById(`page-${activePageIndex - 1}`);
          if (prevPage) prevPage.scrollIntoView({ behavior: 'smooth' });
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePageIndex, items.length]);
  
  if (error) {
    return (
      <div className={styles.errorContainer}>
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
      <div className={styles.messageContainer}>
        <p className={styles.messageText}>You've reached the end of this adventure!</p>
        <p className={styles.secondaryMessage}>Want to start a new one? Enter a new prompt above.</p>
      </div>
    );
  }

  return (
    <div className={styles.fullscreenViewer} ref={viewerRef}>
      {items.length === 0 && isLoading ? (
        <motion.div 
          className={styles.loadingContainer}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className={styles.loadingSpinner}></div>
          <p className={styles.loadingMessage}>Creating your mythic zine...</p>
        </motion.div>
      ) : (
        <>
          <div className={styles.pagesContainer}>
            {items.map((item, index) => (
              <div 
                key={item.id || index}
                ref={el => pagesRef.current[index] = el}
                id={`page-${index}`}
                className={styles.pageWrapper}
              >
                <FullscreenZinePage 
                  imageUrl={item.imageUrl} 
                  caption={item.caption} 
                  index={index}
                  isActive={activePageIndex === index}
                  totalPages={items.length}
                />
              </div>
            ))}
          </div>
          
          {/* The 'isLoading && items.length > 0' loader has been moved to the footer in pages/index.js */}
          
          {!isLoading && !hasMore && items.length > 0 && activePageIndex === items.length - 1 && (
            <motion.div 
              className={styles.endMessageContainer}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <p className={styles.endMessageTitle}>You've reached the end!</p>
              <p className={styles.messageText}>Enjoyed this mythic journey?</p>
              <p className={styles.secondaryMessage}>Start a new adventure with a fresh prompt above!</p>
            </motion.div>
          )}
          
          {items.length > 0 && showScrollIndicator && (
            <motion.div 
              className={styles.scrollIndicator}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.8 }}
              transition={{ delay: 1, duration: 0.5 }}
            >
              <div className={styles.scrollArrow}></div>
              <p>Scroll or use ↓ keys</p>
            </motion.div>
          )}
          
          {items.length > 1 && (
            <div className={styles.navigationControls}>
              <button 
                className={`${styles.navButton} ${styles.prevButton} ${activePageIndex === 0 ? styles.navDisabled : ''}`}
                onClick={() => {
                  if (activePageIndex > 0) {
                    const prevPage = document.getElementById(`page-${activePageIndex - 1}`);
                    if (prevPage) prevPage.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                aria-label="Previous page"
                disabled={activePageIndex === 0}
              >
                <span className={styles.navArrow}>←</span>
              </button>
              <button 
                className={`${styles.navButton} ${styles.nextButton} ${activePageIndex === items.length - 1 ? styles.navDisabled : ''}`}
                onClick={() => {
                  if (activePageIndex < items.length - 1) {
                    const nextPage = document.getElementById(`page-${activePageIndex + 1}`);
                    if (nextPage) nextPage.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                aria-label="Next page"
                disabled={activePageIndex === items.length - 1}
              >
                <span className={styles.navArrow}>→</span>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default FullscreenZineViewer;
