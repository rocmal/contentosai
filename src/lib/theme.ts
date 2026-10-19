/**
 * Light / dark mode for the website. Tailwind's `dark:` styles follow the `dark` class on <html> (see the
 * @custom-variant in index.css). The choice belongs to the person, so it is kept in this browser; until they pick
 * one, the computer's own light/dark setting is used.
 */

const STORAGE_KEY = 'lumora.theme';

/** The saved choice, or the computer's setting when nothing has been chosen yet. */
export function initialDarkMode(): boolean {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') return saved === 'dark';
  } catch {
    // Storage blocked (private window, site data off) - fall back to the computer's setting.
  }
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/** Remembers the choice in this browser. */
export function saveDarkMode(dark: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light');
  } catch {
    // Not saved; the toggle still works until the page is reloaded.
  }
}

/** Switches the page: the `dark` class for Tailwind, and color-scheme so scrollbars and form controls match. */
export function applyDarkMode(dark: boolean): void {
  document.documentElement.classList.toggle('dark', dark);
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
}
