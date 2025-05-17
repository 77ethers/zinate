import React from 'react';
import styles from './ZineCreationProgress.module.css';

const ZineCreationProgress = ({ currentStep, error }) => {
  // Define all the possible steps in the zine creation process
  const steps = [
    { id: 'planning', label: 'Crafting your mythic story...' },
    { id: 'content', label: 'Creating vivid scenes and descriptions...' },
    { id: 'generating', label: 'Bringing your story to life with images...' },
    { id: 'assembling', label: 'Assembling your zine...' },
    { id: 'complete', label: 'Your mythic zine is ready!' }
  ];

  // Determine which steps have been completed
  const getStepStatus = (stepId) => {
    const stepIndex = steps.findIndex(step => step.id === stepId);
    const currentIndex = steps.findIndex(step => step.id === currentStep);
    
    if (error) return 'error';
    if (stepIndex < currentIndex) return 'complete';
    if (stepIndex === currentIndex) return 'active';
    return 'pending';
  };

  return (
    <div className={styles.progressContainer}>
      <h2 className={styles.progressTitle}>
        {error ? 'Oops! Something went wrong' : 'Creating Your Mythic Zine'}
      </h2>
      
      <ul className={styles.progressList}>
        {steps.map((step) => {
          const status = getStepStatus(step.id);
          return (
            <li 
              key={step.id} 
              className={`${styles.progressItem} ${styles[status]}`}
            >
              <span className={styles.progressIcon}>
                {status === 'complete' && '✓'}
                {status === 'active' && '•'}
                {status === 'error' && '!'}
                {status === 'pending' && ''}
              </span>
              <span className={styles.progressLabel}>{step.label}</span>
              {status === 'active' && <span className={styles.progressDots}>...</span>}
            </li>
          );
        })}
      </ul>

      {error && (
        <div className={styles.errorContainer}>
          <p className={styles.errorMessage}>{error}</p>
          <p className={styles.errorTip}>Please try again with a different prompt.</p>
        </div>
      )}
    </div>
  );
};

export default ZineCreationProgress;
