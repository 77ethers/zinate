import React, { useRef, useEffect, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './FullscreenZineViewer.module.css';
import ShareZineButton from './ShareZineButton';
import ClientWorkerAdapter from '../services/client-worker-adapter';

// Individual page component
const FullscreenZinePage = ({ imageUrl, caption, index, isActive, totalPages, onZoomToggle, isZoomed }) => {
  // Use a ref to track if this is the first render
  const firstRender = React.useRef(true);
  // Track device dimensions
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  
  // After first render, set firstRender to false and track dimensions
  React.useEffect(() => {
    firstRender.current = false;
    
    // Function to update dimensions
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };
    
    // Set initial dimensions
    updateDimensions();
    
    // Add event listener for window resize
    window.addEventListener('resize', updateDimensions);
    
    // Clean up
    return () => window.removeEventListener('resize', updateDimensions);
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
    inactive: { y: 15, opacity: 0 },
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
        transformStyle: 'preserve-3d',
        perspective: '1000px'
      }}
    >
      <motion.div 
        className={`${styles.imageContainer} ${isZoomed ? styles.zoomedContainer : ''}`}
        animate={isActive ? 'active' : 'inactive'}
        variants={imageVariants}
        transition={{ 
          type: 'spring',
          stiffness: 120,
          damping: 20
        }}
      >
        <div className={styles.contentWrapper}>
          <motion.div className={styles.imageWrapper}>
            <motion.img 
              src={imageUrl} 
              alt={`Zine page ${index + 1}`}
              className={`${styles.fullscreenImage} ${isZoomed ? styles.zoomedImage : ''}`}
              initial={{ scale: firstRender.current ? 1 : 1.1, opacity: firstRender.current ? (isActive ? 1 : 0) : 0 }}
              animate={{ 
                scale: isActive ? (isZoomed ? 1.8 : 1) : 1.1, 
                opacity: isActive ? 1 : 0,
              }}
              transition={{ 
                duration: 0.8, 
                ease: [0.19, 1, 0.22, 1], // Expo ease
                opacity: { duration: 0.6 }
              }}
              whileHover={isZoomed ? {} : { scale: 1.02 }} // Subtle hover effect only when not zoomed
              layoutId={`image-${index}`} // Helps with consistent animation
              onClick={() => onZoomToggle(index)}
              style={{ cursor: isActive ? 'zoom-in' : 'default' }}
              draggable={isZoomed}
            />
          </motion.div>
          
          {/* Caption container within the same content wrapper */}
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
        </div>
      </motion.div>
    </motion.div>
  );
};

// Main Zine Viewer component
const FullscreenZineViewer = ({ items, onLoadMore, isLoading, hasMore, error, prompt, title }) => {
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollDirection, setScrollDirection] = useState(null);
  const [lastScrollY, setLastScrollY] = useState(0);
  const scrollTimeout = useRef(null);
  const [showScrollIndicator, setShowScrollIndicator] = useState(true);
  const [showShortcutHelp, setShowShortcutHelp] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [zoomedPageIndex, setZoomedPageIndex] = useState(null);
  const [isSharing, setIsSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState(null);
  const [adapter] = useState(() => new ClientWorkerAdapter());
  
  // Handle zoom toggle for pages
  const handleZoomToggle = useCallback((index) => {
    setZoomedPageIndex(prevIndex => prevIndex === index ? null : index);
  }, []);
  const observerRef = useRef(null);
  const pagesRef = useRef([]);
  const viewerRef = useRef(null);
  const thumbnailsRef = useRef(null);
  const containerRef = useRef(null);
  
  // Helper function to get the closest page index to current scroll position
  const getClosestPageIndex = useCallback(() => {
    if (!containerRef.current || pagesRef.current.length === 0) return 0;
    
    let closestIndex = 0;
    let minDistance = Infinity;
    const containerHeight = containerRef.current.clientHeight;
    const viewportCenter = containerHeight / 2;
    
    // Check all pages to find the one closest to the center of viewport
    pagesRef.current.forEach((page, index) => {
      if (!page) return;
      
      const rect = page.getBoundingClientRect();
      const elementCenter = rect.top + rect.height / 2;
      const distanceToCenter = Math.abs(elementCenter - viewportCenter);
      
      if (distanceToCenter < minDistance) {
        minDistance = distanceToCenter;
        closestIndex = index;
      }
    });
    
    return closestIndex;
  }, []);

  // Handle magnetic snap effect when scrolling stops
  const handleScrollEnd = useCallback(() => {
    if (!containerRef.current) return;
    
    const closestIndex = getClosestPageIndex();
    const targetPage = pagesRef.current[closestIndex];
    
    if (targetPage) {
      // Apply elastic spring effect for a natural, magnetic feel
      targetPage.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
      
      // Explicitly set the active page for visual feedback
      setActivePageIndex(closestIndex);
    }
    
    // Reset scroll states
    setIsScrolling(false);
    setScrollDirection(null);
  }, [getClosestPageIndex]);

  // Monitor scroll movement
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    
    // Get current scroll position
    const currentScrollY = containerRef.current.scrollTop;
    
    // Determine scroll direction
    const direction = currentScrollY > lastScrollY ? 'down' : 'up';
    
    // Update state
    setScrollDirection(direction);
    setLastScrollY(currentScrollY);
    setIsScrolling(true);
    
    // Clear any existing timeout
    if (scrollTimeout.current) {
      clearTimeout(scrollTimeout.current);
    }
    
    // Set a new timeout to detect when scrolling stops
    scrollTimeout.current = setTimeout(() => {
      handleScrollEnd();
    }, 150); // Adjust for natural feel - higher for more inertia
  }, [lastScrollY, handleScrollEnd]);

  // Define intersection handler for tracking active page
  const handleIntersect = useCallback((entries) => {
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
  }, [items, hasMore, isLoading, onLoadMore]);

  // Set up intersection observer to detect which page is currently visible
  useEffect(() => {
    const options = {
      root: null, // viewport
      rootMargin: '0px',
      threshold: 0.6 // 60% of the element must be visible
    };
    
    observerRef.current = new IntersectionObserver(handleIntersect, options);
    
    // Observe all pages
    pagesRef.current.forEach(page => {
      if (page) observerRef.current.observe(page);
    });
    
    // Setup scroll event for magnetic snap effect
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
    }
    
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
      
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
    };
  }, [items, handleScroll, handleIntersect]);
  
  // Update refs when items change
  useEffect(() => {
    pagesRef.current = pagesRef.current.slice(0, items.length);
  }, [items]);
  
  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Check if user is focused on an input, textarea, or contentEditable element
      // If so, don't trigger keyboard shortcuts
      const targetTag = e.target.tagName.toLowerCase();
      const isEditableTarget = 
        targetTag === 'input' || 
        targetTag === 'textarea' || 
        e.target.isContentEditable || 
        e.target.getAttribute('role') === 'textbox';
      
      if (isEditableTarget) {
        // Allow default behavior for typing in input fields
        return;
      }

      // If zoomed, ESC unzooms
      if (zoomedPageIndex !== null && e.key === 'Escape') {
        e.preventDefault();
        setZoomedPageIndex(null);
        return;
      }
      
      // If help is showing, ESC closes it
      if (showShortcutHelp && e.key === 'Escape') {
        e.preventDefault();
        setShowShortcutHelp(false);
        return;
      }
      
      // If thumbnails are showing, ESC closes them
      if (showThumbnails && e.key === 'Escape') {
        e.preventDefault();
        setShowThumbnails(false);
        return;
      }

      // Toggle help overlay with '?'
      if (e.key === '?' || (e.key === 'h' && !e.ctrlKey && !e.metaKey)) {
        e.preventDefault();
        setShowShortcutHelp(prev => !prev);
        return;
      }

      // Toggle thumbnails with 't'
      if (e.key === 't' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setShowThumbnails(prev => !prev);
        return;
      }

      // Toggle zoom with 'z'
      if (e.key === 'z' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleZoomToggle(activePageIndex);
        return;
      }

      // Home key - go to first page
      if (e.key === 'Home') {
        e.preventDefault();
        if (items.length > 0) {
          goToPage(0);
        }
        return;
      }

      // End key - go to last page
      if (e.key === 'End') {
        e.preventDefault();
        if (items.length > 0) {
          goToPage(items.length - 1);
        }
        return;
      }

      // Left/Up arrow - previous page
      if ((e.key === 'ArrowLeft' || e.key === 'ArrowUp') && !showThumbnails) {
        e.preventDefault();
        if (activePageIndex > 0) {
          goToPage(activePageIndex - 1);
        }
        return;
      }

      // Right/Down arrow - next page
      if ((e.key === 'ArrowRight' || e.key === 'ArrowDown') && !showThumbnails) {
        e.preventDefault();
        if (activePageIndex < items.length - 1) {
          goToPage(activePageIndex + 1);
        } else if (hasMore && !isLoading) {
          onLoadMore();
        }
        return;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePageIndex, items.length, zoomedPageIndex, showShortcutHelp, showThumbnails, hasMore, isLoading, onLoadMore, items]);

  // Handle page navigation
  const goToPage = (index) => {
    if (index >= 0 && index < items.length) {
      const page = document.getElementById(`page-${index}`);
      if (page) {
        page.scrollIntoView({ behavior: 'smooth' });
        setActivePageIndex(index);
      }
    }
  };

  const progressPercentage = items.length > 1 ? (activePageIndex / (items.length - 1)) * 100 : 0;

  return (
    <div className={styles.fullscreenViewer} ref={viewerRef}>
      {error ? (
        <motion.div 
          className={styles.errorContainer}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className={styles.errorMessage}>Oops! Something went wrong</h2>
          <p className={styles.errorDetails}>{error}</p>
          <button 
            className={styles.retryButton}
            onClick={onLoadMore}
          >
            Try Again
          </button>
          <p className={styles.secondaryMessage}>Or try a different prompt</p>
        </motion.div>
      ) : items.length === 0 && isLoading ? (
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
          {/* Progress bar at the top */}
          <div className={styles.progressBarContainer}>
            <div 
              className={styles.progressBar} 
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          
          {/* Main content container with rubber band effect */}
          <div 
            className={`${styles.pagesContainer} ${isScrolling ? styles.scrollingActive : ''}`}
            ref={containerRef}
            id='pagesContainer'
          >
            {items.map((item, index) => (
              <div 
                key={`page-wrapper-${item.id || index}`} 
                className={`${styles.pageWrapper} ${scrollDirection === 'up' ? styles.scrollingUp : ''} ${scrollDirection === 'down' ? styles.scrollingDown : ''}`}
                ref={el => pagesRef.current[index] = el}
                id={`page-${index}`}
              >
                <FullscreenZinePage
                  imageUrl={item.imageUrl}
                  caption={item.caption}
                  index={index}
                  isActive={activePageIndex === index}
                  totalPages={items.length}
                  onZoomToggle={handleZoomToggle}
                  isZoomed={zoomedPageIndex === index}
                />
              </div>
            ))}
            
            {/* Load more content has been moved to footer */}
            
            {/* End of content message */}
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
          </div>
          
          {/* Scroll indicator for first-time users */}
          {showScrollIndicator && items.length > 1 && (
            <motion.div 
              className={styles.scrollIndicator}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 0.5 }}
            >
              <p>Scroll to explore</p>
              <div className={styles.scrollArrow}></div>
              <button 
                className={styles.helpButton} 
                onClick={() => setShowShortcutHelp(true)}
                aria-label="View keyboard shortcuts"
              >
                Keyboard Shortcuts
              </button>
            </motion.div>
          )}
          
          {/* Loading indicator in footer */}
          {isLoading && items.length > 0 && (
            <motion.div 
              className={styles.footerLoadingIndicator}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className={styles.loadingSpinner}></div>
              <p className={styles.loadingText}>Loading more content...</p>
            </motion.div>
          )}

          {/* Navigation controls */}
          {items.length > 1 && !zoomedPageIndex && (
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
          
          {/* Control buttons */}
          <div className={styles.controlButtons}>
            <button
              className={styles.controlButton}
              onClick={() => setShowThumbnails(prev => !prev)}
              aria-label="Toggle thumbnails"
              title="Show thumbnails (T)"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="4" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="2" />
                <rect x="4" y="14" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="2" />
                <rect x="14" y="4" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="2" />
                <rect x="14" y="14" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="2" />
              </svg>
            </button>
            <button
              className={`${styles.controlButton} ${zoomedPageIndex === activePageIndex ? styles.activeControl : ''}`}
              onClick={() => handleZoomToggle(activePageIndex)}
              aria-label="Toggle zoom"
              title="Zoom image (Z)"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                <path d="M20 20L16 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                {zoomedPageIndex === activePageIndex ? (
                  <path d="M8 11H14M11 8V14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                ) : (
                  <path d="M8 11H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                )}
              </svg>
            </button>
            <button
              className={styles.controlButton}
              onClick={() => setShowShortcutHelp(true)}
              aria-label="Show keyboard shortcuts"
              title="Keyboard shortcuts (H)"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="8" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
                <path d="M8 8V6C8 4.89543 8.89543 4 10 4H14C15.1046 4 16 4.89543 16 6V8" stroke="currentColor" strokeWidth="2" />
                <path d="M7 13H9M12 13H12.01M15 13H17M7 17H9M12 17H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          
          {/* Thumbnails panel */}
          <AnimatePresence>
            {showThumbnails && (
              <motion.div 
                className={styles.thumbnailsPanel}
                initial={{ x: '-100%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: '-100%', opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                ref={thumbnailsRef}
              >
                <div className={styles.thumbnailsHeader}>
                  <h3>Pages</h3>
                  <button 
                    className={styles.closeThumbnails}
                    onClick={() => setShowThumbnails(false)}
                    aria-label="Close thumbnails"
                  >
                    ×
                  </button>
                </div>
                <div className={styles.thumbnailsGrid}>
                  {items.map((item, index) => (
                    <div 
                      key={`thumb-${item.id || index}`}
                      className={`${styles.thumbnail} ${activePageIndex === index ? styles.activeThumbnail : ''}`}
                      onClick={() => goToPage(index)}
                    >
                      <img 
                        src={item.imageUrl} 
                        alt={`Thumbnail ${index + 1}`} 
                        className={styles.thumbnailImage}
                      />
                      <div className={styles.thumbnailNumber}>{index + 1}</div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Keyboard shortcuts help overlay */}
          <AnimatePresence>
            {showShortcutHelp && (
              <motion.div 
                className={styles.shortcutHelp}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowShortcutHelp(false)}
              >
                <motion.div 
                  className={styles.shortcutCard}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className={styles.shortcutHeader}>
                    <h3>Keyboard Shortcuts</h3>
                    <button 
                      className={styles.closeShortcuts}
                      onClick={() => setShowShortcutHelp(false)}
                      aria-label="Close shortcuts help"
                    >
                      ×
                    </button>
                  </div>
                  <div className={styles.shortcutGrid}>
                    <div className={styles.shortcutItem}>
                      <kbd>←</kbd> <kbd>↑</kbd>
                      <span>Previous page</span>
                    </div>
                    <div className={styles.shortcutItem}>
                      <kbd>→</kbd> <kbd>↓</kbd> <kbd>Space</kbd>
                      <span>Next page</span>
                    </div>
                    <div className={styles.shortcutItem}>
                      <kbd>z</kbd>
                      <span>Zoom image</span>
                    </div>
                    <div className={styles.shortcutItem}>
                      <kbd>t</kbd>
                      <span>Toggle thumbnails</span>
                    </div>
                    <div className={styles.shortcutItem}>
                      <kbd>Home</kbd>
                      <span>First page</span>
                    </div>
                    <div className={styles.shortcutItem}>
                      <kbd>End</kbd>
                      <span>Last page</span>
                    </div>
                    <div className={styles.shortcutItem}>
                      <kbd>Esc</kbd>
                      <span>Close overlays</span>
                    </div>
                    <div className={styles.shortcutItem}>
                      <kbd>?</kbd> <kbd>h</kbd>
                      <span>Toggle this help</span>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
};

export default FullscreenZineViewer;
