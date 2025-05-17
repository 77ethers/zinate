import React, { useRef, useEffect, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './FullscreenZineViewer.module.css';
import ShareButton from './ShareButton';
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
