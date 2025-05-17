import React, { useState } from 'react';
import styles from './ShareButton.module.css';
import { motion } from 'framer-motion';

const ShareButton = ({ onShare, isSharing = false, shareUrl = null }) => {
  const [copied, setCopied] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const handleCopyClick = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setShowTooltip(true);
      setTimeout(() => {
        setCopied(false);
        setShowTooltip(false);
      }, 2000);
    }
  };

  return (
    <div className={styles.shareContainer}>
      {!shareUrl && (
        <motion.button
          className={styles.shareButton}
          onClick={onShare}
          disabled={isSharing}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {isSharing ? (
            <>
              <span className={styles.loadingSpinner}></span>
              <span>Sharing...</span>
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={styles.shareIcon}>
                <path fillRule="evenodd" d="M15.75 4.5a3 3 0 11.825 2.066l-8.421 4.679a3.002 3.002 0 010 1.51l8.421 4.679a3 3 0 11-.83 2.12l-8.369-4.779a3 3 0 110-5.189l8.369-4.779a3 3 0 01.83 2.058z" clipRule="evenodd" />
              </svg>
              <span>Share Zine</span>
            </>
          )}
        </motion.button>
      )}

      {shareUrl && (
        <div className={styles.shareUrlContainer}>
          <motion.div 
            className={styles.shareUrlInput}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className={styles.shareUrlText}>{shareUrl}</div>
            <button 
              className={styles.copyButton}
              onClick={handleCopyClick}
            >
              {copied ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={styles.checkIcon}>
                  <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={styles.copyIcon}>
                  <path fillRule="evenodd" d="M17.663 3.118c.225.015.45.032.673.05C19.876 3.298 21 4.604 21 6.109v9.642a3 3 0 01-3 3V16.5c0-5.922-4.576-10.775-10.384-11.217.324-1.132 1.3-2.01 2.548-2.114.224-.019.448-.036.673-.051A3 3 0 0113.5 1.5H15a3 3 0 012.663 1.618zM12 4.5A1.5 1.5 0 0113.5 3H15a1.5 1.5 0 011.5 1.5H12z" clipRule="evenodd" />
                  <path d="M3 8.625c0-1.036.84-1.875 1.875-1.875h.375A3.75 3.75 0 019 10.5v1.875c0 1.036.84 1.875 1.875 1.875h1.875A3.75 3.75 0 0116.5 18v2.625c0 1.035-.84 1.875-1.875 1.875h-9.75A1.875 1.875 0 013 20.625v-12z" />
                </svg>
              )}
            </button>
            {showTooltip && (
              <motion.div 
                className={styles.tooltip}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                Copied to clipboard!
              </motion.div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default ShareButton;
