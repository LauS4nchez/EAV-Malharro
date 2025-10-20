// src/components/basicos/CircularContainer.js
import styles from "@/styles/components/CircularContainer.module.css";

export default function CircularContainer({ children, title }) {
  return (
    <div className={styles.circularContainer}>
      <div className={styles.content}>
        {title && (
          <div className={styles.title}>
            <h2>{title}</h2>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}