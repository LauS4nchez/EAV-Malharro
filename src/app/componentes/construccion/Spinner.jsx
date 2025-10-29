'use client';
import styles from '@/styles/components/Construccion/Spinner.module.css';

export default function Spinner({ visible }) {
  return (
    <div
      className={`${styles.spinnerOverlay} ${
        visible ? styles.visible : styles.hidden
      }`}
    >
      <div className={styles.spinner}></div>
    </div>
  );
}
