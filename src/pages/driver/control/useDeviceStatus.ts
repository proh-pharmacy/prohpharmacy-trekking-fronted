import { useCallback, useEffect, useRef, useState } from 'react';
import { fieldApi, type DriverDevice, type DriverLocation } from './api';
import { fieldStore } from './store';

type BatteryNavigator = Navigator & { getBattery?: () => Promise<{ level: number }> };
export type Weather = {
  temperature: number;
  description: string;
  condition?: string;
  humidity?: number;
  windSpeed?: number;
  precipitation?: number;
};
interface PhoneAddress { label: string; latitude: number; longitude: number; resolvedAt: string }
const WEATHER_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY as string | undefined;

function describeWeatherCode(code: number): { condition: string; description: string } {
  if (code === 0) return { condition: 'Clear', description: 'clear sky' };
  if ([1, 2].includes(code)) return { condition: 'Clouds', description: 'partly cloudy' };
  if (code === 3) return { condition: 'Clouds', description: 'overcast' };
  if ([45, 48].includes(code)) return { condition: 'Fog', description: 'foggy' };
  if ([51, 53, 55, 56, 57].includes(code)) return { condition: 'Drizzle', description: 'light drizzle' };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { condition: 'Rain', description: 'rain showers' };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { condition: 'Snow', description: 'snow showers' };
  if ([95, 96, 99].includes(code)) return { condition: 'Thunderstorm', description: 'thunderstorms' };
  return { condition: 'Unknown', description: 'current conditions' };
}

async function fetchWeather(latitude: number, longitude: number): Promise<Weather | null> {
  if (WEATHER_KEY) {
    try {
      const params = new URLSearchParams({ lat: String(latitude), lon: String(longitude), appid: WEATHER_KEY, units: 'metric' });
      const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?${params}`);
      if (response.ok) {
        const data = await response.json() as {
          main?: { temp?: number; humidity?: number };
          wind?: { speed?: number };
          weather?: { description?: string; main?: string }[];
          clouds?: { all?: number };
        };
        if (data.main?.temp != null) {
          return {
            temperature: data.main.temp,
            description: data.weather?.[0]?.description ?? 'Current conditions',
            condition: data.weather?.[0]?.main ?? 'Sunny',
            humidity: data.main.humidity,
            windSpeed: data.wind?.speed != null ? Math.round(data.wind.speed * 3.6) : undefined,
            precipitation: data.clouds?.all,
          };
        }
      }
    } catch {
      // Fall through to the keyless provider when OpenWeather is unavailable.
    }
  }

  const params = new URLSearchParams({
    latitude: String(latitude), longitude: String(longitude),
    current: 'temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m',
    timezone: 'auto',
  });
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!response.ok) return null;
  const data = await response.json() as {
    current?: { temperature_2m?: number; relative_humidity_2m?: number; precipitation?: number; weather_code?: number; wind_speed_10m?: number };
  };
  const current = data.current;
  if (current?.temperature_2m == null) return null;
  const description = describeWeatherCode(current.weather_code ?? -1);
  return {
    temperature: current.temperature_2m,
    description: description.description,
    condition: description.condition,
    humidity: current.relative_humidity_2m,
    windSpeed: current.wind_speed_10m,
    precipitation: current.precipitation,
  };
}

function currentPosition(): Promise<GeolocationPosition | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), {
      enableHighAccuracy: true, timeout: 10000, maximumAge: 30000,
    });
  });
}

async function readLocation(): Promise<DriverLocation | null> {
  const position = await currentPosition();
  if (!position) return null;
  const battery = await (navigator as BatteryNavigator).getBattery?.().catch(() => null);
  return {
    latitude: position.coords.latitude, longitude: position.coords.longitude,
    altitude: position.coords.altitude, speed: position.coords.speed,
    bearing: position.coords.heading, accuracy: position.coords.accuracy,
    batteryLevel: battery?.level ?? null, recordedAt: new Date().toISOString(),
  };
}

export function useDeviceStatus(token: string) {
  const [device, setDevice] = useState<DriverDevice | null>(null);
  const [lastFix, setLastFix] = useState<DriverLocation | null>(null);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [phoneAddress, setPhoneAddress] = useState<PhoneAddress | null>(null);
  const [deviceUnavailable, setDeviceUnavailable] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [sendingSos, setSendingSos] = useState(false);
  const weatherFetchedAt = useRef(0);
  const addressLookup = useRef<PhoneAddress | null>(null);

  const resolvePhoneAddress = useCallback(async (fix: DriverLocation) => {
    const previous = addressLookup.current;
    const metres = previous ? Math.hypot(
      (fix.latitude - previous.latitude) * 111_000,
      (fix.longitude - previous.longitude) * 111_000 * Math.cos(fix.latitude * Math.PI / 180),
    ) : Infinity;
    const elapsed = previous ? Date.now() - new Date(previous.resolvedAt).getTime() : Infinity;
    if (previous && (elapsed < 5 * 60_000 || (elapsed < 10 * 60_000 && metres < 1000))) return;
    if (!navigator.onLine) return;
    // A place lookup is occasional; GPS reporting itself continues every 45 seconds.
    addressLookup.current = { label: previous?.label ?? '', latitude: fix.latitude, longitude: fix.longitude, resolvedAt: new Date().toISOString() };
    try {
      const params = new URLSearchParams({ format: 'jsonv2', lat: String(fix.latitude), lon: String(fix.longitude), zoom: '18', addressdetails: '1' });
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, {
        headers: { Accept: 'application/json' }, referrerPolicy: 'strict-origin-when-cross-origin',
      });
      if (!response.ok) return;
      const data = await response.json() as { name?: string; display_name?: string; address?: Record<string, string> };
      const place = data.name || data.address?.road || data.address?.neighbourhood || data.address?.suburb || data.address?.city || data.address?.town;
      const area = data.address?.suburb || data.address?.city || data.address?.town || data.address?.state;
      const label = [place, area && area !== place ? area : null].filter(Boolean).join(', ') || data.display_name?.split(',').slice(0, 3).join(', ');
      if (!label) return;
      const resolved = { label, latitude: fix.latitude, longitude: fix.longitude, resolvedAt: new Date().toISOString() };
      addressLookup.current = resolved;
      setPhoneAddress(resolved);
      await fieldStore.set(token, 'phoneAddress', resolved);
    } catch { /* Keep the last readable address if lookup is unavailable. */ }
  }, [token]);

  const refreshDevice = useCallback(async () => {
    if (!token || !navigator.onLine) return;
    try {
      const next = await fieldApi.getDevice(token);
      setDevice(next);
      await fieldStore.set(token, 'device', next);
      setDeviceUnavailable(false);
    } catch { setDeviceUnavailable(true); }
  }, [token]);

  const report = useCallback(async (useCached = false) => {
    if (!token || !navigator.onLine || document.visibilityState !== 'visible') return;
    setReporting(true);
    try {
      const fix = useCached ? await fieldStore.get<DriverLocation>(token, 'lastFix') : await readLocation();
      if (!fix) { setLocationError('Location permission or GPS fix unavailable.'); return; }
      setLastFix(fix);
      if (!useCached) await fieldStore.set(token, 'lastFix', fix);
      if (!useCached) void resolvePhoneAddress(fix);

      // Weather is independent of the field backend. Fetch it before reporting
      // GPS so a temporary device or telemetry error does not hide weather.
      if (!useCached && Date.now() - weatherFetchedAt.current > 10 * 60_000) {
        try {
          const nextWeather = await fetchWeather(fix.latitude, fix.longitude);
          if (nextWeather) {
            setWeather(nextWeather);
            weatherFetchedAt.current = Date.now();
            await fieldStore.set(token, 'weather', nextWeather);
          }
        } catch { /* Weather is optional and never blocks field work. */ }
      }

      await fieldApi.reportLocation(token, fix);
      setLocationError(null);
      await refreshDevice();
    } catch { setLocationError('Location could not be sent. The latest fix is saved on this device.'); }
    finally { setReporting(false); }
  }, [token, refreshDevice, resolvePhoneAddress]);

  const sendSos = useCallback(async () => {
    if (!navigator.onLine) throw new Error('Connect to the internet before sending an SOS.');
    setSendingSos(true);
    try {
      const fix = await readLocation();
      if (!fix) throw new Error('A current GPS fix is required to send an SOS. Check location permission and try again.');
      await fieldStore.set(token, 'lastFix', fix); setLastFix(fix);
      await fieldApi.sendSos(token, fix);
    } finally { setSendingSos(false); }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    void fieldStore.get<DriverDevice>(token, 'device').then((saved) => { if (saved) setDevice(saved); }).catch(() => {});
    void fieldStore.get<DriverLocation>(token, 'lastFix').then((saved) => { if (saved) setLastFix(saved); }).catch(() => {});
    void fieldStore.get<PhoneAddress>(token, 'phoneAddress').then((saved) => { if (saved) { setPhoneAddress(saved); addressLookup.current = saved; } }).catch(() => {});
    void fieldStore.get<Weather>(token, 'weather').then((saved) => { if (saved) setWeather(saved); }).catch(() => {});
    void refreshDevice();
    void report();
    const deviceTimer = window.setInterval(() => { if (document.visibilityState === 'visible') void refreshDevice(); }, 60_000);
    const locationTimer = window.setInterval(() => { void report(); }, 45_000);
    const onOnline = () => { void report(true).then(() => report()); void refreshDevice(); };
    window.addEventListener('online', onOnline);
    return () => { clearInterval(deviceTimer); clearInterval(locationTimer); window.removeEventListener('online', onOnline); };
  }, [token, refreshDevice, report]);

  return { device, lastFix, phoneAddress, weather, deviceUnavailable, reporting, locationError, sendingSos, refreshDevice, report, sendSos };
}
