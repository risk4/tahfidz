import QRCode from 'qrcode';

/**
 * Utilitas sertifikat: label juz, QR verifikasi, ekspor PDF, dan cetak.
 */

/** Label capaian berbasis urutan target (starting_juz mundur) — konsisten dengan backend. */
export function buildJuzLabel(juzCount: number, startingJuz?: number | null): string {
  if (!juzCount || juzCount <= 0) return 'Juz -';

  const start = startingJuz && startingJuz >= 1 && startingJuz <= 30 ? startingJuz : 30;

  const numbers: number[] = [];
  for (let i = 0; i < juzCount; i++) {
    let j = start - i;
    if (j < 1) j += 30;
    numbers.push(j);
  }
  numbers.sort((a, b) => a - b);

  const min = numbers[0];
  const max = numbers[numbers.length - 1];

  return min === max ? `Juz ${min}` : `Juz ${min} – ${max}`;
}

/** URL publik untuk verifikasi sertifikat. */
export function buildVerifyUrl(code: string): string {
  return `${window.location.origin}/sertifikat/verifikasi/${encodeURIComponent(code)}`;
}

/** Render URL menjadi data-URL PNG untuk QR code sertifikat. */
export async function generateQrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    width: 320,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: { dark: '#0A3D27', light: '#FFFFFF' },
  });
}

/**
 * Unduh elemen sertifikat sebagai PDF A4 landscape.
 * Elemen dirender pada ukuran asli 1123×794 (96 dpi) sehingga hasil
 * ekspor identik dengan pratinjau.
 */
export async function downloadCertificatePdf(rootEl: HTMLElement, fileName: string): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas-pro'),
    import('jspdf'),
  ]);

  // Pastikan webfont kaligrafis & arab selesai dimuat sebelum dirender.
  try {
    await document.fonts.ready;
  } catch {
    /* abaikan bila API tidak tersedia */
  }

  const canvas = await html2canvas(rootEl, {
    scale: 2,
    backgroundColor: '#FFFFFF',
    useCORS: true,
    logging: false,
  });

  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  pdf.addImage(canvas.toDataURL('image/jpeg', 0.94), 'JPEG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
  pdf.save(fileName);
}

/**
 * Cetak sertifikat: node #certificate-export-node (dirender halaman)
 * dijadikan satu-satunya konten tercetak melalui mode body khusus
 * yang dikontrol oleh print CSS pada app.css.
 */
export async function printCertificate(): Promise<void> {
  try {
    await document.fonts.ready;
  } catch {
    /* abaikan */
  }

  const cleanup = () => document.body.classList.remove('print-certificate-mode');

  window.addEventListener('afterprint', cleanup, { once: true });

  requestAnimationFrame(() => {
    document.body.classList.add('print-certificate-mode');
    window.print();

    // Fallback bila event afterprint tidak terpicu (mis. dialog dibatalkan).
    setTimeout(cleanup, 60_000);
  });
}
