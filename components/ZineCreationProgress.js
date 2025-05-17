import React from 'react';
import styles from './ZineCreationProgress.module.css';

const ZineCreationProgress = ({ currentStep, error }) => {
  // Define all the possible steps in the zine creation process
  const steps = [
    { id: 'planning', label: 'Crafting your mythic story...', alternateIds: ['story-planning'] },
    { id: 'content', label: 'Creating vivid scenes and descriptions...', alternateIds: ['content-generation'] },
    { id: 'generating', label: 'Bringing your story to life with images...', alternateIds: ['image-generation'] },
    { id: 'assembling', label: 'Assembling your zine...', alternateIds: [] },
    { id: 'complete', label: 'Your mythic zine is ready!', alternateIds: [] }
  ];

  // Determine which steps have been completed
  const getStepStatus = (stepId) => {
    // Find step index in the steps array
    const stepIndex = steps.findIndex(step => step.id === stepId);
    
    // Map the current step to a canonical step if it's an alternate ID
    let canonicalCurrentStep = currentStep;
    for (const step of steps) {
      if (step.alternateIds && step.alternateIds.includes(currentStep)) {
        canonicalCurrentStep = step.id;
        break;
      }
    }
    
    // Find the index of the canonical current step
    const currentIndex = steps.findIndex(step => step.id === canonicalCurrentStep);
    
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
