const GHANA_MAP_URL = `${import.meta.env.BASE_URL}maps/ghana-z9.pmtiles`;
const CACHE_NAME = 'proh-field-offline-maps-v1';

export function regionMapUrl(regionName?: string): string | null {
  if (!regionName) return null;
  const slug = regionName.toLowerCase().replace(/\s+region\s*$/, '').trim().replace(/[^a-z0-9]+/g, '-');
  return slug ? `${import.meta.env.BASE_URL}maps/regions/${slug}-z14.pmtiles` : null;
}

async function mapResponse(regionName?: string): Promise<Response | undefined> {
  const preferredUrl = regionMapUrl(regionName);
  if (!('caches' in window)) return undefined;
  const cache = await caches.open(CACHE_NAME);
  if (preferredUrl) {
    const regional = await cache.match(preferredUrl);
    if (regional) return regional;
  }
  return cache.match(GHANA_MAP_URL);
}

export async function isOfflineMapSaved(regionName?: string): Promise<boolean> {
  if (!('caches' in window)) return false;
  const preferredUrl = regionMapUrl(regionName);
  const response = await mapResponse(regionName);
  return Boolean(preferredUrl ? response && (await caches.open(CACHE_NAME)).match(preferredUrl) : response);
}

export async function getOfflineMap(regionName?: string): Promise<Blob | null> {
  const preferredUrl = regionMapUrl(regionName);
  let response: Response | undefined;
  if ('caches' in window) {
    const cache = await caches.open(CACHE_NAME);
    response = preferredUrl ? await cache.match(preferredUrl) : undefined;
    if (!response) response = await cache.match(GHANA_MAP_URL);
    if (!response && navigator.onLine) {
      if (preferredUrl) {
        const regional = await fetch(preferredUrl);
        if (regional.ok) {
          await cache.put(preferredUrl, regional.clone());
          response = regional;
        }
      }
      if (!response) {
        const downloaded = await fetch(GHANA_MAP_URL);
        if (!downloaded.ok) throw new Error('Map download failed.');
        await cache.put(GHANA_MAP_URL, downloaded.clone());
        response = downloaded;
      }
    }
  } else if (navigator.onLine) {
    response = await fetch(preferredUrl || GHANA_MAP_URL);
    if (!response.ok) throw new Error('Map download failed.');
  }
  return response ? response.blob() : null;
}

export async function downloadOfflineMap(regionName?: string): Promise<'regional' | 'ghana'> {
  if (!('caches' in window)) throw new Error('Offline maps are not supported in this browser.');
  const cache = await caches.open(CACHE_NAME);
  const preferredUrl = regionMapUrl(regionName);
  if (preferredUrl) {
    const regional = await fetch(preferredUrl);
    if (regional.ok) {
      await cache.put(preferredUrl, regional);
      window.dispatchEvent(new Event('field-map-saved'));
      return 'regional';
    }
  }
  const response = await fetch(GHANA_MAP_URL);
  if (!response.ok) throw new Error('Map download failed.');
  await cache.put(GHANA_MAP_URL, response);
  window.dispatchEvent(new Event('field-map-saved'));
  return 'ghana';
}
