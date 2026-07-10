/* ============================================================
   KNIPSMOMENT — interaktiver Gäste-Prototyp (Vanilla JS)
   Welcome → Sucher → Snap (Flash + Zähler) → Limit → Done
   ============================================================ */
(function () {
  const root = document.getElementById('proto');
  if (!root) return;

  const state = {
    limit: 10,
    taken: 0,
    screen: 'welcome', // welcome | cam | done
  };

  // erlaubt Tweaks, das Limit zu setzen
  window.__setProtoLimit = function (n) {
    state.limit = Math.max(1, n | 0);
    if (state.screen !== 'cam') render();
    else { state.taken = Math.min(state.taken, state.limit); updateCam(); }
  };

  function go(screen) { state.screen = screen; render(); }

  function reset() { state.taken = 0; state.screen = 'welcome'; render(); }

  function snap() {
    if (state.taken >= state.limit) return;
    state.taken++;
    const flash = root.querySelector('.vf-flash');
    flash.classList.remove('fire'); void flash.offsetWidth; flash.classList.add('fire');

    // film-strip frame
    const strip = root.querySelector('.vf-strip');
    const f = document.createElement('div');
    f.className = 'frame';
    strip.appendChild(f);
    while (strip.children.length > 7) strip.removeChild(strip.firstChild);

    // toast
    const toast = root.querySelector('.cam-toast');
    toast.textContent = `Bild ${state.taken} von ${state.limit} gesichert`;
    toast.classList.add('show');
    clearTimeout(snap._t);
    snap._t = setTimeout(() => toast.classList.remove('show'), 1300);

    updateCam();

    if (state.taken >= state.limit) {
      setTimeout(() => go('done'), 900);
    }
  }

  function updateCam() {
    const left = state.limit - state.taken;
    const c = root.querySelector('.vf-counter');
    if (c) c.innerHTML = `NOCH <b>${left}</b> ${left === 1 ? 'BILD' : 'BILDER'}`;
    const sh = root.querySelector('.shutter');
    if (sh) sh.disabled = left <= 0;
  }

  function couple() { return window.__coupleNames || 'Lena & Jonas'; }
  function eventDate() { return window.__eventDate || '12 · 07 · 25'; }

  function render() {
    const c = couple();
    const parts = c.split('&');
    const a = (parts[0] || '').trim();
    const b = (parts[1] || '').trim();

    root.innerHTML = `
      <div class="phone-notch"></div>
      <div class="statusbar ${state.screen === 'cam' ? 'on-dark' : ''}">
        <span>9:41</span>
        <span class="dots"><i></i><i></i><i></i> <span style="margin-left:4px">●</span></span>
      </div>

      <!-- WELCOME -->
      <div class="screen ${state.screen === 'welcome' ? 'active' : ''}">
        <div class="screen-body welcome">
          <div class="cam-illus">
            <div class="cam-body"></div>
            <div class="cam-lens"></div>
            <div class="cam-flash"></div>
            <div class="cam-wind"></div>
            <div class="cam-finder"></div>
          </div>
          <div class="kicker">Eure Einwegkamera</div>
          <h2>${a}<span class="amp"> &amp; </span>${b}</h2>
          <div class="date">${eventDate()}</div>
          <p class="blurb">Haltet den Tag fest, wie ihr ihn seht. ${state.limit} Bilder — mehr hat eure Filmrolle nicht. Also: gut zielen!</p>
          <div class="count-pill"><span>◉</span> ${state.limit} Bilder frei</div>
          <button class="btn btn-amber start-btn" data-act="start">Filmrolle einlegen →</button>
        </div>
      </div>

      <!-- KAMERA / SUCHER -->
      <div class="screen ${state.screen === 'cam' ? 'active' : ''} cam">
        <div class="screen-body">
          <div class="viewfinder">
            <div class="vf-scene vf-brackets"><i></i>[ euer moment ]</div>
            <div class="vf-cross"></div>
            <div class="vf-top">
              <span class="vf-counter">NOCH <b>${state.limit - state.taken}</b> BILDER</span>
              <span class="vf-rec"><i></i> AUTO</span>
            </div>
            <span class="vf-date datestamp">${eventDate().replace(/ /g,'')}</span>
            <div class="vf-strip"></div>
            <div class="vf-flash"></div>
            <div class="cam-toast"></div>
          </div>
          <div class="cam-controls">
            <div class="side left">
              <button class="upload-btn" data-act="upload">AUS<br>GALERIE</button>
            </div>
            <button class="shutter" data-act="snap" aria-label="Auslösen"></button>
            <div class="side right">
              <span class="cam-hint">TIPP<br>HALTEN &<br>RUHIG</span>
            </div>
          </div>
        </div>
      </div>

      <!-- DONE -->
      <div class="screen ${state.screen === 'done' ? 'active' : ''}">
        <div class="screen-body done">
          <div class="seal">✦</div>
          <h2>Deine Filmrolle<br>ist voll!</h2>
          <p>Danke, dass du mitgeknipst hast.<br>${a} &amp; ${b} entwickeln eure Bilder<br>nach der Feier.</p>
          <div class="roll">${Array.from({length: state.limit}).map((_,i)=>`<div class="frame"></div>`).join('')}</div>
          <button class="reset" data-act="reset">↺ Noch jemand? Neu starten</button>
        </div>
      </div>
    `;

    if (state.screen === 'cam') {
      // rebuild strip to match taken count
      const strip = root.querySelector('.vf-strip');
      const n = Math.min(state.taken, 7);
      for (let i = 0; i < n; i++) {
        const f = document.createElement('div'); f.className = 'frame';
        f.style.animation = 'none'; strip.appendChild(f);
      }
      updateCam();
    }
  }

  root.addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]');
    if (!act) return;
    switch (act.dataset.act) {
      case 'start': go('cam'); break;
      case 'snap': snap(); break;
      case 'upload': snap(); break; // im Prototyp identisch behandelt
      case 'reset': reset(); break;
    }
  });

  window.__protoRerender = render;
  render();
})();
