import QRCode from 'qrcode';

export interface DriverInvoiceLine {
  productName: string;
  basicQuantity: number;
  basicUnitName: string;
  basicUnitPrice: number;
  packagingQuantity: number;
  packagingUnitName: string | null;
  packagingUnitPrice: number | null;
  amountPaid: number;
  paymentMethod: string | null;
}

interface DriverInvoiceInput {
  token: string;
  invoiceNumber?: string | null;
  trekNumber: string;
  scheduledDate: string;
  vehicleName: string;
  customerName: string;
  customerCode: string;
  customerClientGeneratedId?: string | null;
  customerPhone?: string | null;
  lines: DriverInvoiceLine[];
}

const escapeHtml = (value: unknown): string => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const money = (value: number): string => `GHS ${value.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const quantityText = (line: DriverInvoiceLine): string => [
  line.packagingQuantity > 0 && line.packagingUnitName ? `${line.packagingQuantity.toLocaleString()} ${line.packagingUnitName}` : '',
  line.basicQuantity > 0 ? `${line.basicQuantity.toLocaleString()} ${line.basicUnitName}` : '',
].filter(Boolean).join(' · ');

export async function openDriverInvoice(input: DriverInvoiceInput): Promise<void> {
  const invoiceWindow = window.open('', '_blank', 'width=920,height=760');
  if (!invoiceWindow) throw new Error('Allow pop-ups to open the invoice.');

  invoiceWindow.document.write('<!doctype html><html><head><title>Preparing invoice...</title></head><body></body></html>');

  try {
    const identifierParam = input.customerCode
      ? `cc=${encodeURIComponent(input.customerCode)}`
      : `cid=${encodeURIComponent(input.customerClientGeneratedId ?? '')}`;
    const previewUrl = `${window.location.origin}/invoice/preview?token=${encodeURIComponent(input.token)}&${identifierParam}`;
    const qrCode = await QRCode.toDataURL(previewUrl, { errorCorrectionLevel: 'M', margin: 1, width: 144 });
    const total = input.lines.reduce((sum, line) => sum
      + line.basicQuantity * line.basicUnitPrice
      + line.packagingQuantity * Number(line.packagingUnitPrice ?? 0), 0);
    const paid = input.lines.reduce((sum, line) => sum + line.amountPaid, 0);
    const balance = Math.max(0, total - paid);
    const paymentMethods = [...new Set(input.lines.map((line) => line.paymentMethod).filter(Boolean))].join(', ') || '—';
    const generatedAt = new Date().toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
    const rows = input.lines.map((line) => {
      const lineTotal = line.basicQuantity * line.basicUnitPrice
        + line.packagingQuantity * Number(line.packagingUnitPrice ?? 0);
      return `<div class="item-row">
        <span class="item-name">${escapeHtml(line.productName)}</span>
        <span class="item-qty">${escapeHtml(quantityText(line))}</span>
        <span class="item-amount">${escapeHtml(money(lineTotal).replace('GHS ', ''))}</span>
      </div>`;
    }).join('');

    invoiceWindow.document.open();
    invoiceWindow.document.write(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(input.invoiceNumber || `Invoice-${input.customerCode}`)}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #22272e; color: #102218; font-family: "Courier New", Courier, monospace; font-size: 11px; }
    .shell { min-height: 100vh; padding: 22px 12px 40px; }
    .toolbar { display: flex; justify-content: center; gap: 8px; margin: 0 auto 14px; }
    button { border: 1px solid #444c56; border-radius: 4px; background: #2d333b; color: #fff; padding: 8px 12px; cursor: pointer; font: 600 11px Inter, Arial, sans-serif; }
    button.primary { border-color: #087A2D; background: #087A2D; }
    .receipt { width: 80mm; max-width: 100%; min-height: 100mm; margin: 0 auto; overflow: hidden; background: #fff; padding: 5mm 4mm 7mm; box-shadow: 0 16px 45px rgba(0,0,0,.4); }
    .center { text-align: center; }
    .qr img { display: block; width: 25mm; height: 25mm; margin: 0 auto 2mm; }
    .brand { margin: 0; font-size: 15px; font-weight: 700; line-height: 1.25; }
    .vehicle, .date { margin: 1mm 0 0; font-size: 10px; line-height: 1.35; }
    .separator { margin: 3mm 0; border: 0; border-top: 1px dashed #102218; }
    .title { padding: 2mm 0; border-top: 1px dashed #102218; border-bottom: 1px dashed #102218; text-align: center; font-size: 12px; font-weight: 700; }
    .meta { padding: 2.5mm 0; line-height: 1.45; }
    .meta p { display: flex; justify-content: space-between; gap: 3mm; margin: .7mm 0; }
    .meta span:first-child { color: #5F6F64; }
    .meta strong { max-width: 65%; text-align: right; overflow-wrap: anywhere; }
    .item-head, .item-row { display: grid; grid-template-columns: minmax(0, 1fr) 23% 25%; column-gap: 2mm; }
    .item-head { padding: 2mm 0; border-bottom: 1px dashed #102218; font-weight: 700; }
    .item-row { align-items: start; padding: 2.2mm 0; border-bottom: 1px dotted #5F6F64; font-size: 10px; }
    .item-name { min-width: 0; overflow-wrap: anywhere; }
    .item-qty { text-align: center; overflow-wrap: anywhere; }
    .item-amount { text-align: right; white-space: nowrap; }
    .totals { padding: 2.5mm 0 1mm; }
    .totals div { display: flex; justify-content: space-between; gap: 4mm; padding: .7mm 0; }
    .totals .total { margin-top: 1mm; padding-top: 1.5mm; border-top: 1px dashed #102218; font-size: 13px; font-weight: 700; }
    .payment { padding: 2mm 0; border-top: 1px dashed #102218; line-height: 1.45; }
    .thanks { margin: 3mm 0 0; padding-top: 2.5mm; border-top: 1px dashed #102218; text-align: center; font-size: 10px; }
    .verify { margin-top: 1mm; color: #5F6F64; font-size: 8px; text-align: center; }
    @media print {
      body { background: #fff; }
      .shell { min-height: 0; padding: 0; }
      .toolbar { display: none; }
      .receipt { width: 72mm; max-width: none; min-height: 0; margin: 0; padding: 2mm; box-shadow: none; }
      @page { size: 80mm auto; margin: 2mm; }
    }
  </style>
</head>
<body>
  <main class="shell">
    <div class="toolbar"><button onclick="window.close()">Close</button><button class="primary" onclick="window.print()">Print / Save PDF</button></div>
    <article class="receipt">
      <header class="center">
        <div class="qr"><img src="${qrCode}" alt="Invoice QR code" /></div>
        <h1 class="brand">ProH Pharmacy</h1>
        <p class="vehicle">${escapeHtml(input.vehicleName)}</p>
        <p class="date">${escapeHtml(generatedAt)}</p>
      </header>
      <div class="title">SALES INVOICE${input.invoiceNumber ? `: ${escapeHtml(input.invoiceNumber)}` : ''}</div>
      <section class="meta">
        <p><span>Customer</span><strong>${escapeHtml(input.customerName)}</strong></p>
        <p><span>Trek</span><strong>${escapeHtml(input.trekNumber)}</strong></p>
        <p><span>Trek date</span><strong>${escapeHtml(input.scheduledDate)}</strong></p>
      </section>
      <div class="item-head"><span>Item</span><span class="item-qty">Qty</span><span class="item-amount">Amt</span></div>
      <section>${rows}</section>
      <section class="totals">
        <div><span>Sub total</span><strong>${escapeHtml(money(total))}</strong></div>
        <div><span>Paid</span><strong>${escapeHtml(money(paid))}</strong></div>
        <div class="total"><span>Balance</span><strong>${escapeHtml(money(balance))}</strong></div>
      </section>
      <div class="payment">Payment method: <strong>${escapeHtml(paymentMethods)}</strong></div>
      <p class="thanks">Thank you for your purchase!</p>
      <p class="verify">Scan the QR code to view this invoice.</p>
    </article>
  </main>
</body>
</html>`);
    invoiceWindow.document.close();
  } catch (error) {
    invoiceWindow.close();
    throw error;
  }
}
