import React, { useState, useEffect } from 'react';
import styles from './ShareZineButton.module.css';
import ShareButton from './ShareButton';
import ClientWorkerAdapter from '../services/client-worker-adapter';

// This component handles all the share functionality and wraps the ShareButton UI
const ShareZineButton = ({ items, title, prompt }) => {
  const [isSharing, setIsSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState(null);
  const [adapter] = useState(() => new ClientWorkerAdapter());

  // Handle sharing the zine
  const handleShare = async () => {
    if (items.length === 0) return;
    
    try {
      setIsSharing(true);
      
      // Get current zine title from the first item or use a default
      const zineTitle = title || (items[0]?.title || 'My Mythic Zine');
      
      // Prepare the zine data for sharing
      const zineData = {
        title: zineTitle,
        prompt: prompt || 'Custom zine',
        items: items.map(item => ({
          imageUrl: item.imageUrl,
          caption: item.caption,
          provider: item.provider || 'unknown'
        }))
      };
      
      // Call the share API through the adapter
      const response = await adapter.shareZine(zineData);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to share zine');
      }
      
      // Set the share URL for display
      setShareUrl(response.shareUrl);
    } catch (error) {
      console.error('Error sharing zine:', error);
      alert('Failed to share zine: ' + (error.message || 'Unknown error'));
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className={styles.shareZineButtonContainer}>
      <ShareButton 
        onShare={handleShare} 
        isSharing={isSharing} 
        shareUrl={shareUrl} 
      />
    </div>
  );
};

export default ShareZineButton;
