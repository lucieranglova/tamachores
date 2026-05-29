// Run with: node generate-icons.js
// Generates icons/icon-192.png and icons/icon-512.png
// Requires: npm install canvas
// Or just use an online SVG→PNG converter with the SVG below

const fs = require('fs')
const path = require('path')

const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#F5F0E8"/>
  <ellipse cx="256" cy="300" rx="190" ry="220" fill="#FFAAB5" stroke="#1A1209" stroke-width="12"/>
  <ellipse cx="230" cy="270" rx="100" ry="90" fill="#9BB33A" stroke="#1A1209" stroke-width="8"/>
  <!-- Eyes -->
  <rect x="200" y="240" width="20" height="20" fill="#0F380F"/>
  <rect x="250" y="240" width="20" height="20" fill="#0F380F"/>
  <!-- Smile -->
  <rect x="205" y="280" width="10" height="10" fill="#0F380F"/>
  <rect x="215" y="290" width="10" height="10" fill="#0F380F"/>
  <rect x="225" y="295" width="20" height="10" fill="#0F380F"/>
  <rect x="245" y="290" width="10" height="10" fill="#0F380F"/>
  <rect x="255" y="280" width="10" height="10" fill="#0F380F"/>
  <!-- TC text -->
  <text x="256" y="490" text-anchor="middle" font-family="monospace" font-size="60" fill="#1A1209" font-weight="bold">TC</text>
</svg>`

fs.mkdirSync(path.join(__dirname, 'public', 'icons'), { recursive: true })
fs.writeFileSync(path.join(__dirname, 'public', 'icons', 'icon.svg'), svgIcon)

console.log('SVG icon written to public/icons/icon.svg')
console.log('For PNG icons, either:')
console.log('  1. Use: npx sharp-cli resize 192 192 -i public/icons/icon.svg -o public/icons/icon-192.png')
console.log('  2. Convert SVG to PNG manually at sizes 192x192 and 512x512')
console.log('  3. Or use the placeholder PNGs from the project README')
