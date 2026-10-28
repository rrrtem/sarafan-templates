const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname, '../photo-crop.js'), 'utf8'), context);
const { normalize, geometry } = context.window.SarafanCrop;
const slot = { x: 34, y: 260, width: 1012, height: 476 };
for (const [width, height] of [[2000, 3000], [4000, 800], [1012, 476]]) {
  for (const state of [{ x: 0, y: 0, zoom: 1 }, { x: 1, y: 1, zoom: 3 }, { x: .5, y: .2, zoom: 1.7 }]) {
    const g = geometry(width, height, slot, state);
    assert(g.x <= slot.x + .001 && g.y <= slot.y + .001);
    assert(g.x + g.width >= slot.x + slot.width - .001);
    assert(g.y + g.height >= slot.y + slot.height - .001);
    assert(Math.abs(g.width / g.height - width / height) < .0001, 'Source proportions stay intact');
  }
}
assert.equal(normalize({ x: NaN, y: Infinity, zoom: -2 }).x, .5);
assert.equal(normalize({ x: NaN, y: Infinity, zoom: -2 }).y, .5);
assert.equal(normalize({ zoom: 99 }).zoom, 3);
assert.equal(normalize(null).zoom, 1);
for (const [width,height] of [[2000,3000],[4000,800],[700,700]]) {
  const g=geometry(width,height,slot,{x:.5,y:.5,zoom:1,fit:'contain'});
  const corner=((g.width/2)/(slot.width/2))**2+((g.height/2)/(slot.height/2))**2;
  assert(corner<=1.00001,'Whole-image mode fits all corners inside the ellipse');
}
console.log('Crop geometry: portrait, landscape, zoom, edge coverage and invalid saved values pass.');
