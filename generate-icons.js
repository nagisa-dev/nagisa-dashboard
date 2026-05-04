// SVGをBase64にしてHTMLキャンバスで描画してPNG出力
// ブラウザ上で実行する想定のため、Node.jsではSVGをファイルとして保存するだけにする

const fs = require('fs');
const path = require('path');

// SVGアイコン（グリーンの "N" ロゴ）
function makeSvg(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.18}" fill="#16A34A"/>
  <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle"
    font-family="-apple-system, 'Hiragino Sans', sans-serif"
    font-size="${size * 0.55}" font-weight="700" fill="white">N</text>
</svg>`;
}

const dir = __dirname;
fs.writeFileSync(path.join(dir, 'icon-192.svg'), makeSvg(192));
fs.writeFileSync(path.join(dir, 'icon-512.svg'), makeSvg(512));
console.log('SVG icons generated: icon-192.svg, icon-512.svg');
console.log('');
console.log('PNG変換が必要な場合は以下のいずれかを使用してください:');
console.log('  - https://cloudconvert.com/svg-to-png');
console.log('  - macOS: qlmanage -t -s 192 -o . icon-192.svg');
