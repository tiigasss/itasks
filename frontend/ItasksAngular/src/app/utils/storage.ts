export function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof sessionStorage !== 'undefined';
}

export function safeGetItem(key: string): string | null {
  if (!isBrowser()) return null;
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSetItem(key: string, value: string): void {
  if (!isBrowser()) return;
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* Ignorar erros do navegador */
  }
}
