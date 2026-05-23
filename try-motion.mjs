import fs from 'fs';
let app = fs.readFileSync('src/App.tsx', 'utf8');

app = app.replace(/<aside className="col-span-12([^>]+)>/g, '<motion.aside layout initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} exit={{opacity:0, y:20}} transition={{ duration: 0.3 }} className="col-span-12$1>');
app = app.replace(/<\/aside>/g, '</motion.aside>');

app = app.replace(/<main className="col-span-12([^>]+)>/g, '<motion.main layout initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} exit={{opacity:0, y:20}} transition={{ duration: 0.3, delay: 0.1 }} className="col-span-12$1>');
app = app.replace(/<\/main>/g, '</motion.main>');

app = app.replace(/<div className="col-span-12([^>]+)(flex flex-col|grid)([^>]+)>/g, '<motion.div layout initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} exit={{opacity:0, y:20}} transition={{ duration: 0.3, delay: 0.2 }} className="col-span-12$1$2$3>');
app = app.replace(/<\/div>\s*<\/div>\s*<PlaylistViewer/g, '</motion.div>\n      </div>\n      <PlaylistViewer');

fs.writeFileSync('src/App.tsx', app);
console.log('Added AnimatePresence/motion layout tags to panels.');
