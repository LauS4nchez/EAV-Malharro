'use client'; // Página de error 404 renderizada en el cliente

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from '@/styles/components/PaginaNoEncontrada/NotFound.module.css';

export default function NotFound() {
  const router = useRouter();

  // Vuelve a la página anterior
  const handleGoBack = () => {
    router.back();
  };

  return (
    <div className={styles.notFoundContainer}>
      <div className={styles.content}>
        <div className={styles.errorCode}>404</div>
        
        <h1 className={styles.title}>Página no encontrada</h1>
        
        <p className={styles.subtitle}>
          La página que estás buscando no existe o ha sido movida.
        </p>
        
        {/* Acciones principales: volver o ir al inicio */}
        <div className={styles.buttonGroup}>
          <button onClick={handleGoBack} className={styles.backButton}>
            {/* Ícono decorativo de flecha */}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
              <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Volver
          </button>
          
          <Link href="/" className={styles.homeButton}>
            {/* Ícono decorativo de inicio */}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
              <path d="M2 6L8 1L14 6V13C14 13.5304 13.7893 14.0391 13.4142 14.4142C13.0391 14.7893 12.5304 15 12 15H4C3.46957 15 2.96086 14.7893 2.58579 14.4142C2.21071 14.0391 2 13.5304 2 13V6Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 15V8H10V15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Ir al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
