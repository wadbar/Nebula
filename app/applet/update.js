import fs from 'fs';
let app = fs.readFileSync('src/App.tsx', 'utf8');

app = app.replace(/bg-white\/5/g, 'bg-[var(--md-sys-color-surface-container)]');
app = app.replace(/border-white\/10/g, 'border-[var(--md-sys-color-outline-variant)]');
app = app.replace(/border-white\/5/g, 'border-[var(--md-sys-color-outline-variant)]');
app = app.replace(/bg-black\/90/g, 'bg-[var(--md-sys-color-surface-container)]');
app = app.replace(/bg-\[\#050505\]\/95/g, 'bg-[var(--md-sys-color-surface-container-high)]');
app = app.replace(/rounded-2xl/g, 'rounded-3xl');

fs.writeFileSync('src/App.tsx', app);
console.log('Update complete');
