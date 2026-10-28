// Small ZIP writer shared by the static builder and edited-post downloads.
// PNGs are already compressed, so entries use ZIP's lossless STORE method.
(() => {
  const encoder = new TextEncoder();
  const crcTable = Uint32Array.from({ length: 256 }, (_, n) => {
    for (let bit = 0; bit < 8; bit++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
    return n >>> 0;
  });
  function createZip(files) {
    const chunks = [], directory = [];
    let offset = 0, directorySize = 0;
    for (const { name, data } of files) {
      const filename = encoder.encode(name);
      let crc = 0xffffffff;
      for (const byte of data) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
      crc = (crc ^ 0xffffffff) >>> 0;
      const local = new Uint8Array(30 + filename.length);
      const header = new DataView(local.buffer);
      header.setUint32(0, 0x04034b50, true);
      header.setUint16(4, 20, true);
      header.setUint16(6, 0x0800, true); // UTF-8 names.
      header.setUint16(12, 0x5221, true); // Stable date: 2021-01-01.
      header.setUint32(14, crc, true);
      header.setUint32(18, data.length, true);
      header.setUint32(22, data.length, true);
      header.setUint16(26, filename.length, true);
      local.set(filename, 30);
      const central = new Uint8Array(46 + filename.length);
      const entry = new DataView(central.buffer);
      entry.setUint32(0, 0x02014b50, true);
      entry.setUint16(4, 20, true);
      central.set(local.subarray(4, 30), 6);
      entry.setUint32(42, offset, true);
      central.set(filename, 46);
      chunks.push(local, data);
      directory.push(central);
      offset += local.length + data.length;
      directorySize += central.length;
    }
    const end = new Uint8Array(22), footer = new DataView(end.buffer);
    footer.setUint32(0, 0x06054b50, true);
    footer.setUint16(8, files.length, true);
    footer.setUint16(10, files.length, true);
    footer.setUint32(12, directorySize, true);
    footer.setUint32(16, offset, true);
    const zip = new Uint8Array(offset + directorySize + end.length);
    let cursor = 0;
    for (const chunk of [...chunks, ...directory, end]) { zip.set(chunk, cursor); cursor += chunk.length; }
    return zip;
  }
  if (typeof module === 'object' && module.exports) module.exports = { createZip };
  else window.SarafanZip = { createZip };
})();
