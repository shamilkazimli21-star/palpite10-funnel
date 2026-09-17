const fs = require('fs');

const pixelId = process.env.META_PIXEL_ID || 'YOUR_PIXEL_ID';
const ga4Id = process.env.GA4_ID || 'G-XXXXXXXXXX';

let html = fs.readFileSync('index.html', 'utf8');
html = html.replace(/YOUR_PIXEL_ID/g, pixelId);
html = html.replace(/G-XXXXXXXXXX/g, ga4Id);

if (!fs.existsSync('dist')) fs.mkdirSync('dist');
fs.writeFileSync('dist/index.html', html);
fs.copyFileSync('styles.css', 'dist/styles.css');
fs.copyFileSync('app.js', 'dist/app.js');
