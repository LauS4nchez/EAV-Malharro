import styles from "@/styles/components/Acordeon/CircularContainer.module.css";

export default function CircularContainer({ children, title }) {
  return (
    <div className={styles.circularContainer}>
      <div className={styles.content}>
        {title && (
          <div className={`${styles.title} mb-3`}>
            <h2>{title}</h2>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}