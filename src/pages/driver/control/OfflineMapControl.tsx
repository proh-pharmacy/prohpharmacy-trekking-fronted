import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FlatButton } from '../../../components/flat-form';
import { downloadOfflineMap, isOfflineMapSaved } from './offlineMap';

export function OfflineMapControl({ regionName, online }: { regionName: string; online: boolean }) {
  const [saved, setSaved] = useState(false);
  const [downloading, setDownloading] = useState(false);
  useEffect(() => {
    let active = true;
    const update = () => void isOfflineMapSaved(regionName).then((value) => { if (active) setSaved(value); });
    update();
    window.addEventListener('field-map-saved', update);
    return () => { active = false; window.removeEventListener('field-map-saved', update); };
  }, [regionName]);

  async function download() {
    setDownloading(true);
    try {
      const mapType = await downloadOfflineMap(regionName);
      setSaved(true);
      toast.success(mapType === 'regional' ? `${regionName} offline map saved on this device.` : 'Regional map unavailable; Ghana fallback map saved.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Map download failed.');
    } finally {
      setDownloading(false);
    }
  }

  return <section className="bg-portal-surface border border-portal-border/60 rounded p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
    <div>
      <h2 className="text-sm font-semibold text-portal-text">Offline map</h2>
      <p className="text-[11px] text-portal-muted mt-1">High-detail {regionName} map when available; Ghana fallback otherwise.</p>
      <p className={`text-[11px] mt-1 ${saved ? 'text-portal-accent' : 'text-portal-muted'}`}>{saved ? 'Saved on this device' : 'Download once while online'}</p>
    </div>
    <FlatButton size="sm" variant="outline" leftIcon="pi pi-download" loading={downloading} disabled={!online || downloading} onClick={() => void download()}>{saved ? 'Update map' : 'Download map'}</FlatButton>
  </section>;
}
