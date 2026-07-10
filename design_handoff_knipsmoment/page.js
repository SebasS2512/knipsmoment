/* ============================================================
   KNIPSMOMENT — Seiten-Logik: Admin-Galerie + QR-Code
   ============================================================ */
(function () {

  /* ——— Admin-Galerie befüllen ——— */
  const grid = document.getElementById('adminGrid');
  if (grid) {
    const labels = ['erster tanz','torte','ringe','sektempfang','gäste','sonnenuntergang',
                    'kinder','blumen','rede','konfetti','tischdeko','lachen','kuss','band','auto'];
    const stamps = ['12·07·25','12·07·25','12·07·25'];
    // status-Muster: ein paar wartend, Rest freigegeben
    const pending = new Set([1, 4, 7, 12]);
    let html = '';
    for (let i = 0; i < 15; i++) {
      const isPend = pending.has(i);
      html += `
        <div class="shot">
          <div class="ph">${labels[i]}</div>
          <span class="badge ${isPend ? 'pend' : 'appr'}">${isPend ? 'wartet' : 'frei'}</span>
          <span class="stamp datestamp">${stamps[i % stamps.length]}</span>
          <div class="actions">
            <button class="act ok" title="Freigeben">✓</button>
            <button class="act no" title="Ablehnen">✕</button>
            <button class="act" title="Download">↧</button>
          </div>
        </div>`;
    }
    grid.innerHTML = html;
  }

  /* ——— Fake-QR-Code zeichnen (deterministisch) ——— */
  const qr = document.getElementById('qrSvg');
  if (qr) {
    const N = 25;
    const ns = 'http://www.w3.org/2000/svg';
    // pseudo-random aber stabil
    let seed = 1337;
    const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;

    const isFinder = (x, y) => {
      const inBox = (ox, oy) => x >= ox && x < ox + 7 && y >= oy && y < oy + 7;
      return inBox(0, 0) || inBox(N - 7, 0) || inBox(0, N - 7);
    };

    let cells = '';
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        if (isFinder(x, y)) continue;
        if (rnd() > 0.55) {
          cells += `<rect x="${x}" y="${y}" width="1" height="1" fill="#2A2822"/>`;
        }
      }
    }
    // Finder-Muster (3 Ecken)
    const finder = (ox, oy) => `
      <rect x="${ox}" y="${oy}" width="7" height="7" fill="#2A2822"/>
      <rect x="${ox + 1}" y="${oy + 1}" width="5" height="5" fill="#fff"/>
      <rect x="${ox + 2}" y="${oy + 2}" width="3" height="3" fill="#54664C"/>`;
    qr.innerHTML = cells + finder(0, 0) + finder(N - 7, 0) + finder(0, N - 7);
  }

})();
