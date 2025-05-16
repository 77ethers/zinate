import React from 'react';
import { motion } from 'framer-motion';
import styles from './ZineItem.module.css';

const ZineItem = ({ imageUrl, caption }) => {
  return (
    <motion.div
      className={styles.zineItem} // Replaced Tailwind classes
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <div className={styles.imageWrapper}> {/* Replaced Tailwind classes */}
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt="Zine page image" 
            className={styles.image} // Replaced Tailwind classes
          />
        ) : (
          <div className={styles.loadingPlaceholder}> {/* Replaced Tailwind classes */}
            Loading image...
          </div>
        )}
      </div>
      {caption && (
        <div 
          className={styles.caption} // Replaced Tailwind classes
          dangerouslySetInnerHTML={{ __html: caption }} 
        />
      )}
    </motion.div>
  );
};

export default ZineItem;
