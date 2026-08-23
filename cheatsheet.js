/* =====================================================================
   QUICK REFERENCE / PRINT PAGE — mounts cube-engine.js's shared FACE_INFO,
   PALETTE, and STAGES data into cheatsheet.html. No new content lives here:
   every stage name, formula, and reminder is pulled straight from the same
   STAGES array the main tutorial and finger trainer use, so this page can
   never drift out of sync with the verified algorithms, and any future
   translation only has to touch STAGES once.
   ===================================================================== */

// Notation glossary — reuses the same face legend as the main tutorial's
// "Cube Basics" section (FACE_INFO + PALETTE), so the two pages always
// agree on which example color stands for which face letter.
const csNotationGrid = document.getElementById('csNotationGrid');
FACE_INFO.forEach(f => {
  const div = document.createElement('div');
  div.className = 'cs-notation-item';
  div.innerHTML = `<div class="cs-sw" style="background:${PALETTE[f.color]}"></div><b>${f.k}</b><span>${f.sub}</span>`;
  csNotationGrid.appendChild(div);
});

// Seven-stage table — title, formula, and a one-line reminder pulled
// directly from STAGES (the same `desc` shown at the top of each stage
// card on the main tutorial), so nothing here is authored twice.
const csStageBody = document.getElementById('csStageBody');
STAGES.forEach((data, i) => {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td class="cs-num">${i + 1}</td>
    <td class="cs-title">${data.title}</td>
    <td class="cs-alg">${data.alg}</td>
    <td class="cs-desc">${data.desc}</td>`;
  csStageBody.appendChild(tr);
});

// Print button — same content either way; window.print() just opens the
// browser's normal print/Save-as-PDF dialog. Wrapped in a real button
// (not a bare link) so it works with no server round-trip and is keyboard
// operable like every other control on this site.
const printBtn = document.getElementById('printBtn');
if (printBtn) printBtn.addEventListener('click', () => window.print());
