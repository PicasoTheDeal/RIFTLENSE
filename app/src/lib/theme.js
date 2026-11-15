import { writable, derived, get } from 'svelte/store';
import { css } from './style.js';

function createTheme() {
  const inner = writable('dark');
  let inited = false;

  function apply(t) {
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem('rl-theme', t); } catch {}
    inner.set(t);
  }

  return {
    subscribe: inner.subscribe,
    set: apply,
    toggle: () => apply(get(inner) === 'dark' ? 'light' : 'dark'),
    init: () => {
      if (inited) return;
      inited = true;
      let t = 'dark';
      try { t = localStorage.getItem('rl-theme') || 'dark'; } catch {}
      apply(t);
    }
  };
}

export const theme = createTheme();

// Re-reads CSS vars after every toggle. `theme` is included so panels can
// ask for a value keyed by theme (e.g. railBasePaint($palette.theme)).
export const palette = derived(theme, ($t) => ({
  theme: $t,
  ink:   css('--ink'),
  paper: css('--paper'),
  dim:   css('--dim'),
  faint: css('--faint'),
  rule:  css('--rule'),
  card:  css('--card')
}));