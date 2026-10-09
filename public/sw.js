// As notificações foram removidas. Este service worker apenas se desinstala
// dos aparelhos que ativaram notificações em versões anteriores.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const subscription = await self.registration.pushManager.getSubscription();
      if (subscription) await subscription.unsubscribe();
      await self.registration.unregister();
    })(),
  );
});
