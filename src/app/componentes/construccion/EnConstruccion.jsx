'use client';

import Link from 'next/link';
import Image from 'next/image'; 
import styles from '@/styles/components/PaginaNoEncontrada/EnConstruccion.module.css';

export default function EnConstruccion() {
  return (
    // Contenedor principal centrado
    <div className={styles.enConstruccionContainer}>
      <div className={styles.content}>
        {/* Identidad / isotipo de la escuela */}
        <div className={styles.logoContainer}>
          <p className={styles.logo}>EAV Martín Malharro</p>
        </div>

        {/* Mensaje principal */}
        <h1 className={styles.title}>En construcción</h1>

        {/* Subtítulo breve */}
        <p className={styles.subtitle}>
          Esta página está en desarrollo. <br />
          ¡Vuelve cuando esté terminada!
        </p>

        {/* CTA para volver al inicio */}
        <Link href="/" className={styles.homeButton}>
          {/* Ícono de casa (decorativo) */}
          <svg
            width="16" height="16" viewBox="0 0 16 16" fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true" focusable="false"
          >
            <path d="M2 6L8 1L14 6V13C14 13.5304 13.7893 14.0391 13.4142 14.4142C13.0391 14.7893 12.5304 15 12 15H4C3.46957 15 2.96086 14.7893 2.58579 14.4142C2.21071 14.0391 2 13.5304 2 13V6Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M6 15V8H10V15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
