interface Props {
  regionName?: string | null;
  vehicleName?: string | null;
  driverName?: string | null;
  salesStaffName?: string | null;
  message?: string;
  generatedAt: string;
  pageNumber?: number;
  totalPages?: number;
}

export function DocumentPageFooter({ regionName, vehicleName, salesStaffName, generatedAt, pageNumber = 1, totalPages = 1 }: Props) {
  const details = [
    regionName,
    vehicleName,
    salesStaffName && `Sales staff: ${salesStaffName}`,
  ].filter(Boolean).join(' · ');

  return (
    <footer className="document-inline-footer mt-auto break-inside-avoid pt-2">
      <div className="flex items-center justify-between gap-4 border-t border-invoice-ink bg-light-green px-[4mm] py-[1.5mm] text-[9px] leading-tight text-muted-text">
        <p className="print-footer-website shrink-0 font-semibold text-invoice-ink">prohpharmacy.com</p>
        <div className="flex flex-wrap items-center justify-end gap-x-2 gap-y-0.5 text-right">
          {details && (
            <>
              <span className="print-footer-details">{details}</span>
              <span aria-hidden="true">·</span>
            </>
          )}
          <span className="print-generated-at">Generated: {generatedAt}</span>
          <span aria-hidden="true">·</span>
          <span className="print-page-number font-medium">Page {pageNumber} of {totalPages}</span>
        </div>
      </div>
    </footer>
  );
}
