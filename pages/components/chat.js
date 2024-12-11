import React, { useState } from 'react';
import styles from './chat.module.css';

const ChatUI = (histories) => {

  return (
    <div className={styles.chatContainer}>
      <div className={styles.chatHeader}>
        <div className={styles.backButton}>{'<'}</div>
        <div className={styles.chatTitle}>guide</div>
        <div className={styles.chatInfo}>●</div>
      </div>

      <div className={styles.messageContainer}>
      {histories?.map((history) => (
          <div 
            key={history.id} 
          >
            <div className={styles.messageText}>{history.content}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChatUI;

/*
        {histories.map((history) => (
          <div 
            key={history.id} 
            className={`
              ${styles.messageBubble} 
              ${history.role === 'user' ? styles.userMessage : styles.aiMessage}
            `}
          >
            <div className={styles.messageText}>{history.content}</div>
          </div>
        ))}
*/