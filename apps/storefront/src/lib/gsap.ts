import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register plugins only on the client
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);

  // Set default quiet luxury easing
  gsap.defaults({
    ease: 'power3.out',
    duration: 0.9,
  });
}

export { gsap, ScrollTrigger };
