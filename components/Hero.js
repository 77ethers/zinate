import React from 'react';
import styles from './Hero.module.css';

const Hero = ({ minimized }) => {
  return (
    <div className={`${styles.heroContainer} ${minimized ? styles.heroContainerMinimized : ''}`}>
      {/* Iridescent background element - will be partially visible through glassmorphism */}
      {/* The 'animate-hue-rotate' class for the body is in globals.css */}
      <div className={styles.iridescentBg}>
        <div className={styles.gradientOverlay}></div>
      </div>

      {/* Glassmorphism container for content */}
      <div className={`${styles.glassmorphismBox} ${minimized ? styles.glassmorphismBoxMinimized : ''}`}>
        <h1 className={`${styles.title} ${minimized ? styles.titleMinimized : ''}`}>
          Zine<span className={styles.titleQuest}>Quest</span>
        </h1>
        <p className={`${styles.subtitle} ${minimized ? styles.subtitleMinimized : ''}`}>
          Craft endless mythic tales with AI. Your imagination is the only limit.
        </p>
        {/* Placeholder for prompt input, to be added later */}
      </div>

      {/* Radial mask effect (optional, enhances focus) */}
      <div className={`${styles.radialMask} ${minimized ? styles.radialMaskMinimized : ''}`}></div>
    </div>
  );
};

export default Hero;
