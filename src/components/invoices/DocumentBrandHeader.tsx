interface Props {
  qrCode?: string | null;
  qrCaption?: string | null;
}

export function DocumentBrandHeader({ qrCode, qrCaption }: Props) {
  return (
    <header className="flex items-center justify-between gap-4 border-b-2 border-invoice-ink px-[4mm] pb-[2mm] pt-[2mm] text-invoice-ink">
      <div className="flex items-center gap-3">
        <img src="/images/prohpharmacy_icon.png" alt="" className="h-9 w-9 shrink-0 object-contain" />
        <div>
          <p className="text-sm font-semibold leading-tight tracking-wide">PROH PHARMACY</p>
          <p className="mt-1 text-[10px] leading-tight text-slate-500">Trekking Operations</p>
        </div>
      </div>
      {qrCode && (
        <div className="flex shrink-0 items-center gap-2">
          <p className="max-w-[32mm] text-right text-[10px] leading-tight text-slate-500">{qrCaption || 'Scan to view this invoice.'}</p>
          <img src={qrCode} alt="Invoice QR code" className="h-9 w-9 shrink-0 object-contain" />
        </div>
      )}
    </header>
  );
}
