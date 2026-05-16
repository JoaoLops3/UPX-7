/** Remove SW legado (ex.: PWA antigo) que quebra fetch com staleWhileRevalidate. */
export function unregisterOrphanServiceWorker(): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

  void navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      void registration.unregister();
    }
  });
}
