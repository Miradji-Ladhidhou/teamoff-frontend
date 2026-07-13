import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import AttestationTemplate from '../pages/Conges/AttestationTemplate';

export async function downloadAttestation(data) {
  // Conteneur hors écran
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;z-index:-1;background:#fff;';
  document.body.appendChild(container);

  const root = createRoot(container);

  try {
    // Rendu synchrone dans le conteneur hors écran
    flushSync(() => {
      root.render(createElement(AttestationTemplate, { data }));
    });

    // Laisser le navigateur finaliser le paint
    await new Promise(r => requestAnimationFrame(r));

    const canvas = await html2canvas(container.firstChild, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);

    // Ratio réel du rendu → hauteur PDF en mm
    const pxW = canvas.width;
    const pxH = canvas.height;
    const pdfW = 210; // mm A4
    const pdfH = (pxH / pxW) * pdfW;

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [pdfW, pdfH],
    });

    pdf.addImage(imgData, 'JPEG', 0, 0, pdfW, pdfH);
    pdf.save(`attestation-${data.reference}.pdf`);
  } finally {
    root.unmount();
    document.body.removeChild(container);
  }
}
