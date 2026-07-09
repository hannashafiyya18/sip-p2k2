import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

const prefersReduced = () =>
  typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

/**
 * Stagger-reveal untuk anak-anak sebuah container saat mount / saat dependency berubah.
 * Kembalikan `scope` ref yang dipasang ke elemen container.
 *
 * @param {object}   opts
 * @param {string}   [opts.selector] target anak (default: anak langsung)
 * @param {number}   [opts.y]        offset awal ke bawah (px)
 * @param {number}   [opts.stagger]  jeda antar item (detik)
 * @param {number}   [opts.duration] durasi per item (detik)
 * @param {number}   [opts.max]      batas item yang dianimasikan (sisanya langsung tampil)
 * @param {Array}    [opts.deps]     dependency untuk menjalankan ulang animasi
 */
export function useReveal({
  selector = ':scope > *',
  y = 16,
  stagger = 0.05,
  duration = 0.45,
  max = 12,
  deps = [],
} = {}) {
  const scope = useRef(null);

  useGSAP(
    () => {
      if (!scope.current || prefersReduced()) return;
      const targets = Array.from(scope.current.querySelectorAll(selector)).slice(0, max);
      if (!targets.length) return;
      gsap.from(targets, {
        opacity: 0,
        y,
        duration,
        stagger,
        ease: 'power2.out',
        clearProps: 'opacity,transform',
      });
    },
    { scope, dependencies: deps }
  );

  return scope;
}
