import React, { useState } from 'react';
import { SparklesIcon } from '@heroicons/react/24/outline';
import styles from './PromptInput.module.css';

const PromptInput = ({ onSubmit, isLoading, minimized }) => {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (prompt.trim().length >= 10) {
      onSubmit(prompt.trim());
    } else {
      alert('Prompt must be at least 10 characters long.');
    }
  };

  const isDisabled = isLoading || prompt.trim().length < 10;

  return (
    <form onSubmit={handleSubmit} className={`${styles.promptForm} ${minimized ? styles.promptFormMinimized : ''}`}>
      <div className={`${styles.inputWrapper} ${minimized ? styles.inputWrapperMinimized : ''}`}>
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g., Hanuman lifts the mountain..."
          className={`${styles.promptInput} ${minimized ? styles.promptInputMinimized : ''}`}
          disabled={isLoading}
          minLength={10}
          required
        />
        <button
          type="submit"
          disabled={isDisabled}
          className={`${styles.submitButton} ${isDisabled ? styles.submitButtonDisabled : styles.submitButtonEnabled} ${minimized ? styles.submitButtonMinimized : ''}`}
        >
          {isLoading ? (
            <svg className={styles.spinner} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle opacity="0.25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path opacity="0.75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <>
              <SparklesIcon className={styles.icon} />
              Create
            </>
          )}
        </button>
      </div>
      <p className={`${styles.helperText} ${minimized ? styles.helperTextMinimized : ''}`}>
        Enter a theme or scene (min. 10 characters). Example: "Krishna plays the flute by the Yamuna river."
      </p>
    </form>
  );
};

export default PromptInput;
