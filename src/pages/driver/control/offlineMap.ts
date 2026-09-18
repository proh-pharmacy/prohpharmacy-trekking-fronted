const MAP_URL = `${import.meta.env.BASE_URL}maps/ghana-z9.pmtiles`;
const CACHE_NAME = 'proh-field-offline-maps-v1';

export async function isOfflineMapSaved(): Promise<boolean> {
  if (!('caches' in window)) return false;
  const cache = await caches.open(CACHE_NAME);
  return Boolean(await cache.match(MAP_URL));
}

export async function getOfflineMap(): Promise<Blob | null> {
  let response: Response | undefined;
  if ('caches' in window) {
    const cache = await caches.open(CACHE_NAME);
    response = await cache.match(MAP_URL);
    if (!response && navigator.onLine) {
      const downloaded = await fetch(MAP_URL);
      if (!downloaded.ok) throw new Error('Map download failed.');
      await cache.put(MAP_URL, downloaded.clone());
      response = downloaded;
    }
  } else if (navigator.onLine) {
    response = await fetch(MAP_URL);
    if (!response.ok) throw new Error('Map download failed.');
  }
  return response ? response.blob() : null;
}

export async function downloadOfflineMap(): Promise<void> {
  if (!('caches' in window)) throw new Error('Offline maps are not supported in this browser.');
  const cache = await caches.open(CACHE_NAME);
  const response = await fetch(MAP_URL);
  if (!response.ok) throw new Error('Map download failed.');
  await cache.put(MAP_URL, response);
  window.dispatchEvent(new Event('field-map-saved'));
}
