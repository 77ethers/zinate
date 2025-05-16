import React from 'react';
import styles from './Hero.module.css';

const Hero = () => {
  return (
    <div className={styles.heroContainer}>
      {/* Iridescent background element - will be partially visible through glassmorphism */}
      {/* The 'animate-hue-rotate' class for the body is in globals.css */}
      <div className={styles.iridescentBg}>
        <div className={styles.gradientOverlay}></div>
      </div>

      {/* Glassmorphism container for content */}
      <div className={styles.glassmorphismBox}>
        <h1 className={styles.title}>
          Zine<span className={styles.titleQuest}>Quest</span>
        </h1>
        <p className={styles.subtitle}>
          Craft endless mythic tales with AI. Your imagination is the only limit.
        </p>
        {/* Placeholder for prompt input, to be added later */}
      </div>

      {/* Radial mask effect (optional, enhances focus) */}
      <div className={styles.radialMask}></div>
    </div>
  );
};

export default Hero;
