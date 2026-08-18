// Generates simple placeholder PWA icons (gold squares) so manifest.json
// and the apple-touch-icon no longer point to missing files.
// Run: node scripts/generate-icons.js
// Replace assets/icons/*.png later with the real store logo.
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const OUT_DIR = path.join(__dirname, '..', 'assets', 'icons');
// الرايق لبيع الانتيكات والتحف gold palette
const GOLD = [200, 164, 92];
const DARK = [28, 26, 34];

function crc32(buf) {
    let table = crc32.table;
    if (!table) {
        table = crc32.table = [];
        for (let n = 0; n < 256; n++) {
            let c = n;
            for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
            table[n] = c >>> 0;
        }
    }
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
}

// Solid gold background with a dark gold ring border (simple, scalable placeholder)
function makePng(size) {
    const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(size, 0);
    ihdr.writeUInt32BE(size, 4);
    ihdr[8] = 8;  // bit depth
    ihdr[9] = 2;  // color type: truecolor RGB

    const ring = Math.max(2, Math.round(size * 0.08));
    const row = Buffer.alloc(1 + size * 3);
    const rows = [];
    for (let y = 0; y < size; y++) {
        row[0] = 0; // filter: none
        for (let x = 0; x < size; x++) {
            const inRing =
                x < ring || y < ring || x >= size - ring || y >= size - ring;
            const [r, g, b] = inRing ? DARK : GOLD;
            row[1 + x * 3] = r;
            row[2 + x * 3] = g;
            row[3 + x * 3] = b;
        }
        rows.push(Buffer.from(row));
    }
    const idat = zlib.deflateSync(Buffer.concat(rows));
    return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
for (const size of SIZES) {
    const file = path.join(OUT_DIR, `icon-${size}.png`);
    fs.writeFileSync(file, makePng(size));
    console.log(`Generated ${file} (${size}x${size})`);
}
