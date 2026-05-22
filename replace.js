const fs = require('fs');

const files = [
  'src/App.tsx',
  'src/components/DiscoverView.tsx',
  'src/components/GlobalSignalMap.tsx',
  'src/components/PlaylistViewer.tsx',
  'src/components/DownloadManager.tsx',
  'src/components/AntennaInterface.tsx'
];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  
  // Replacements for typical text colors
  content = content.replace(/text-white\/[0-9]+/g, 'text-on-surface-variant');
  content = content.replace(/text-white/g, 'text-on-surface');
  
  // Backgrounds
  content = content.replace(/bg-black\/[0-9]+/g, 'bg-surface-container');
  content = content.replace(/bg-black(?![a-zA-Z0-9_-])/g, 'bg-surface');
  content = content.replace(/bg-\[\#111111\]/g, 'bg-surface-container');
  content = content.replace(/bg-\[\#050505\]/g, 'bg-background');
  
  // Borders
  content = content.replace(/border-white\/[0-9]+/g, 'border-outline-variant');
  
  fs.writeFileSync(file, content);
  console.log(`Updated ${file}`);
});
