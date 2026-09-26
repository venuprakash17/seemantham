/* GitHub Pages config — edit pdfUrl if the PDF is hosted outside the repo. */
window.SITE_CONFIG = {
  // Local / same-repo file (works if seemanttham.pdf is uploaded).
  // If GitHub rejects the 234MB PDF, host it on Drive/Dropbox and paste that link here.
  pdfUrl: 'seemanttham.pdf',
  pdfDownloadName: 'Lavanya-Seemantham.pdf'
};

(function applyPdfLinks() {
  const cfg = window.SITE_CONFIG || {};
  const url = cfg.pdfUrl || 'seemanttham.pdf';
  const name = cfg.pdfDownloadName || 'Lavanya-Seemantham.pdf';
  document.querySelectorAll('[data-pdf-download]').forEach((el) => {
    el.setAttribute('href', url);
    el.setAttribute('download', name);
  });
})();
