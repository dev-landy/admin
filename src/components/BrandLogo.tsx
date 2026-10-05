import styles from "./BrandLogo.module.css";

/** Official house mark and English wordmark from the Landy mobile design handoff. */
export function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`${styles.brand}${compact ? ` ${styles.compact}` : ""}`} role="img" aria-label="랜디 관리자">
      <span className={styles.symbol} aria-hidden="true" />
      <span className={styles.lockup} aria-hidden="true">
        <span className={styles.wordmark}>Landy</span>
        <span className={styles.context}>Admin</span>
      </span>
    </span>
  );
}
