import Lenis from 'lenis';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

document.documentElement.classList.add('js-enabled');
document
  .querySelectorAll<HTMLElement>(
    'main .surface, main .interactive-card, main .research-card, main .publication-card, main .academic-info-item, main .enter-panel',
  )
  .forEach((element, index) => {
    element.style.setProperty('--enter-index', String(Math.min(index, 14)));
    element.classList.add('enter-expand');
  });
window.requestAnimationFrame(() => document.documentElement.classList.add('is-loaded'));

if (!reduceMotion.matches) {
  const lenis = new Lenis({
    duration: 1.5,
    lerp: 0.07,
    smoothWheel: true,
    wheelMultiplier: 0.9,
    touchMultiplier: 1.05,
  });

  const raf = (time: number) => {
    lenis.raf(time);
    window.requestAnimationFrame(raf);
  };

  window.requestAnimationFrame(raf);

  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const link = target.closest<HTMLAnchorElement>('a[href^="#"]');
    if (!link) return;
    const targetId = link.getAttribute('href');
    if (!targetId || targetId === '#') return;
    const section = document.querySelector<HTMLElement>(targetId);
    if (!section) return;
    event.preventDefault();
    lenis.scrollTo(section, { offset: -96, duration: 1.5 });
  });
}

const canTrackPointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches && !reduceMotion.matches;
const primaryGlow = document.querySelector<HTMLElement>('[data-mouse-glow="primary"]');
const secondaryGlow = document.querySelector<HTMLElement>('[data-mouse-glow="secondary"]');

if (canTrackPointer && primaryGlow && secondaryGlow) {
  const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const primary = { ...target };
  const secondary = { ...target };

  window.addEventListener(
    'pointermove',
    (event) => {
      target.x = event.clientX;
      target.y = event.clientY;
    },
    { passive: true },
  );

  const moveLayer = (layer: HTMLElement, x: number, y: number, size: number) => {
    layer.style.transform = `translate3d(${x - size / 2}px, ${y - size / 2}px, 0)`;
  };

  const animateGlow = () => {
    primary.x += (target.x - primary.x) * 0.08;
    primary.y += (target.y - primary.y) * 0.08;
    secondary.x += (target.x - secondary.x) * 0.04;
    secondary.y += (target.y - secondary.y) * 0.04;

    moveLayer(primaryGlow, primary.x, primary.y, 900);
    moveLayer(secondaryGlow, secondary.x, secondary.y, 680);
    window.requestAnimationFrame(animateGlow);
  };

  animateGlow();
}
