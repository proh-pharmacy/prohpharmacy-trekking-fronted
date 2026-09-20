import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { FlatModal } from '../../../../components/overlay';
import { FlatButton, FlatDropdown } from '../../../../components/flat-form';
import { productsApi, type ImportProductsResult } from '../../../../api-client';
import { resetTableData } from '../../../../components/data-table';
import toast from 'react-hot-toast';

interface ImportProductsModalProps {
  visible: boolean;
  onHide: () => void;
}

type Step = 'upload' | 'map' | 'result';

export const ImportProductsModal: React.FC<ImportProductsModalProps> = ({ visible, onHide }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [productNameColumn, setProductNameColumn] = useState('');
  const [basicUnitColumn, setBasicUnitColumn] = useState('');
  const [basicUnitPriceColumn, setBasicUnitPriceColumn] = useState('');
  const [packagingUnitColumn, setPackagingUnitColumn] = useState('');
  const [packagingUnitPriceColumn, setPackagingUnitPriceColumn] = useState('');
  const [allowUpdate, setAllowUpdate] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportProductsResult | null>(null);

  const reset = () => {
    setStep('upload');
    setFile(null);
    setHeaders([]);
    setProductNameColumn('');
    setBasicUnitColumn('');
    setBasicUnitPriceColumn('');
    setPackagingUnitColumn('');
    setPackagingUnitPriceColumn('');
    setAllowUpdate(false);
    setImporting(false);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleHide = () => {
    reset();
    onHide();
  };

  const readHeaders = (selectedFile: File): Promise<string[]> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const wb = XLSX.read(data, { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 });
          const firstRow = (rows[0] as string[]) ?? [];
          resolve(firstRow.filter(Boolean).map(String));
        } catch {
          reject(new Error('Could not read file. Make sure it is a valid .xlsx or .xls file.'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file.'));
      reader.readAsArrayBuffer(selectedFile);
    });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    try {
      const detectedHeaders = await readHeaders(selected);
      if (detectedHeaders.length === 0) {
        toast.error('No headers found in the first row of the file.');
        return;
      }
      setFile(selected);
      setHeaders(detectedHeaders);
      setProductNameColumn('');
      setBasicUnitColumn('');
      setBasicUnitPriceColumn('');
      setPackagingUnitColumn('');
      setPackagingUnitPriceColumn('');
      setAllowUpdate(false);
      setStep('map');
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to read file headers.');
    }
  };

  const handleImport = async () => {
    if (!file || !productNameColumn || !basicUnitColumn) return;
    setImporting(true);
    try {
      const res = await productsApi.importProducts({
        file,
        productNameColumn,
        basicUnitColumn,
        basicUnitPriceColumn: basicUnitPriceColumn || undefined,
        packagingUnitColumn: packagingUnitColumn || undefined,
        packagingUnitPriceColumn: packagingUnitColumn ? packagingUnitPriceColumn || undefined : undefined,
        allowUpdate,
      });
      setResult(res);
      setStep('result');
      if (res.imported > 0 || res.updated > 0 || res.unitsCreated > 0) {
        resetTableData();
        toast.success(`${res.imported} imported, ${res.updated} updated.`);
      } else {
        toast('No new products were imported.', { icon: 'ℹ️' });
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Import failed.';
      toast.error(msg);
    } finally {
      setImporting(false);
    }
  };

  const headerOptions = headers.map((h) => ({ label: h, value: h }));

  const footer = (
    <div className="flex items-center justify-end gap-3 w-full">
      {step === 'upload' && (
        <FlatButton variant="danger-outline" label="Cancel" onClick={handleHide} />
      )}
      {step === 'map' && (
        <>
          <FlatButton
            variant="danger-outline"
            label="Back"
            onClick={() => { setStep('upload'); setFile(null); setHeaders([]); if (fileInputRef.current) fileInputRef.current.value = ''; }}
            disabled={importing}
          />
          <FlatButton
            variant="primary"
            label={importing ? 'Importing...' : 'Import'}
            icon="pi pi-upload"
            onClick={handleImport}
            loading={importing}
            disabled={importing || !productNameColumn || !basicUnitColumn}
          />
        </>
      )}
      {step === 'result' && (
        <FlatButton variant="primary" label="Done" onClick={handleHide} />
      )}
    </div>
  );

  return (
    <FlatModal
      visible={visible}
      onHide={handleHide}
      title="Import Products"
      size="sm"
      footer={footer}
    >
      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div className="space-y-4">
          <p className="text-xs text-portal-muted leading-relaxed">
            Upload an <span className="text-white">.xlsx</span> or <span className="text-white">.xls</span> file.
            Row 1 must be a header row. You'll map the columns on the next step.
          </p>
          <div
            className="border-2 border-dashed border-portal-border/60 hover:border-portal-accent/50 rounded p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition"
            onClick={() => fileInputRef.current?.click()}
          >
            <i className="pi pi-file-excel text-2xl text-portal-muted" />
            <p className="text-xs text-portal-muted">Click to select a file</p>
            <p className="text-[11px] text-portal-muted/60">.xlsx or .xls</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      )}

      {/* Step 2: Map columns */}
      {step === 'map' && file && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-portal-canvas/60 border border-portal-border/40 rounded">
            <i className="pi pi-file-excel text-sm text-portal-accent" />
            <div className="min-w-0">
              <p className="text-xs text-white font-medium truncate">{file.name}</p>
              <p className="text-[11px] text-portal-muted">{headers.length} column{headers.length !== 1 ? 's' : ''} detected</p>
            </div>
          </div>

          <p className="text-xs text-portal-muted">
            Match the file headers to product units and prices. Unmapped price columns default to 0.
          </p>

          <div>
            <label className="block text-[11px] font-medium text-portal-muted uppercase tracking-wide mb-1.5">
              Product Name Column <span className="text-red-400">*</span>
            </label>
            <FlatDropdown
              value={productNameColumn}
              options={headerOptions}
              onChange={(val: any) => setProductNameColumn(val?.value !== undefined ? val.value : val)}
              placeholder="Select column..."
              size="md"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-portal-muted uppercase tracking-wide mb-1.5">
              Basic Unit Column <span className="text-red-400">*</span>
            </label>
            <FlatDropdown
              value={basicUnitColumn}
              options={headerOptions}
              onChange={(val: string) => setBasicUnitColumn(val || '')}
              placeholder="Select column..."
              size="md"
            />
          </div>

          <FlatDropdown
            label="Basic Unit Price Column (Optional)"
            value={basicUnitPriceColumn}
            options={headerOptions}
            onChange={(val: string) => setBasicUnitPriceColumn(val || '')}
            placeholder="Defaults to 0"
            showClear
            size="md"
          />

          <FlatDropdown
            label="Packaging Unit Column (Optional)"
            value={packagingUnitColumn}
            options={headerOptions}
            onChange={(val: string) => {
              setPackagingUnitColumn(val || '');
              if (!val) setPackagingUnitPriceColumn('');
            }}
            placeholder="No packaging unit"
            showClear
            size="md"
          />

          <FlatDropdown
            label="Packaging Unit Price Column (Optional)"
            value={packagingUnitPriceColumn}
            options={headerOptions}
            onChange={(val: string) => setPackagingUnitPriceColumn(val || '')}
            placeholder="Defaults to 0"
            showClear
            disabled={!packagingUnitColumn}
            size="md"
          />

          <label className="flex items-start gap-2 text-xs text-portal-text cursor-pointer">
            <input
              type="checkbox"
              checked={allowUpdate}
              onChange={(event) => setAllowUpdate(event.target.checked)}
              className="mt-0.5 accent-portal-accent"
            />
            <span>Update existing products with units and prices from this file</span>
          </label>
        </div>
      )}

      {/* Step 3: Result */}
      {step === 'result' && result && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-portal-canvas/60 border border-portal-border/40 rounded p-3 text-center">
              <p className="text-xl font-bold text-portal-accent">{result.imported}</p>
              <p className="text-[10px] text-portal-muted uppercase tracking-wide mt-1">Imported</p>
            </div>
            <div className="bg-portal-canvas/60 border border-portal-border/40 rounded p-3 text-center">
              <p className="text-xl font-bold text-portal-accent">{result.updated ?? 0}</p>
              <p className="text-[10px] text-portal-muted uppercase tracking-wide mt-1">Updated</p>
            </div>
            <div className="bg-portal-canvas/60 border border-portal-border/40 rounded p-3 text-center">
              <p className="text-xl font-bold text-white">{result.skipped}</p>
              <p className="text-[10px] text-portal-muted uppercase tracking-wide mt-1">Skipped</p>
            </div>
            <div className="bg-portal-canvas/60 border border-portal-border/40 rounded p-3 text-center">
              <p className="text-xl font-bold text-white">{result.unitsCreated}</p>
              <p className="text-[10px] text-portal-muted uppercase tracking-wide mt-1">Units Created</p>
            </div>
          </div>

          {result.skippedNames.length > 0 && (
            <div>
              <p className="text-[11px] font-medium text-portal-muted uppercase tracking-wide mb-2">
                Skipped ({result.skippedNames.length}) — duplicate or missing basic unit
              </p>
              <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                {result.skippedNames.map((name) => (
                  <div key={name} className="flex items-center gap-2 text-xs text-portal-muted py-1 border-b border-portal-border/20 last:border-0">
                    <i className="pi pi-minus-circle text-[10px]" />
                    <span>{name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </FlatModal>
  );
};
