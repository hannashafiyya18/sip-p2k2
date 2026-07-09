import React, { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

const prefersReduced = () =>
  typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

/**
 * Angka yang menghitung naik secara halus saat muncul & saat nilainya berubah.
 * Menghormati prefers-reduced-motion (langsung tampil tanpa animasi).
 *
 * @param {number} value      nilai target
 * @param {(n:number)=>string} [format] pemformat tampilan (default: bilangan bulat lokal id-ID)
 * @param {number} [duration] durasi animasi (detik)
 */
export default function CountUp({ value = 0, format, duration = 0.7, className }) {
  const ref = useRef(null);
  const obj = useRef({ n: 0 });
  const fmt = format || ((n) => Math.round(n).toLocaleString('id-ID'));

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const target = Number(value) || 0;
      if (prefersReduced()) {
        obj.current.n = target;
        el.textContent = fmt(target);
        return;
      }
      gsap.to(obj.current, {
        n: target,
        duration,
        ease: 'power2.out',
        overwrite: true,
        onUpdate: () => {
          el.textContent = fmt(obj.current.n);
        },
      });
    },
    { dependencies: [value] }
  );

  return (
    <span ref={ref} className={className}>
      {fmt(Number(value) || 0)}
    </span>
  );
}
