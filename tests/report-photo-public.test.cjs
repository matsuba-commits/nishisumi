const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('apps-script/report-photo-helper/Code.gs', 'utf8');
const driveUrl = 'https://drive.google.com/file/d/examplePhotoFileId123456789/view';

function context(status, headers, fail = false) {
  return vm.createContext({
    UrlFetchApp: { fetch(url, options) {
      assert.match(url, /^https:\/\/drive\.google\.com\/thumbnail\?id=/);
      assert.equal(options.headers, undefined);
      if (fail) throw new Error('network');
      return { getResponseCode: () => status, getHeaders: () => headers };
    } },
    SpreadsheetApp: { getActiveSpreadsheet() { throw new Error('unexpected sheet access'); } }
  });
}

test('anonymous image response is accepted', () => {
  const ctx = context(200, { 'Content-Type': 'image/jpeg' });
  vm.runInContext(source, ctx);
  ctx.assertPublicDriveImage_(driveUrl);
});

for (const [name, status, headers, fail] of [
  ['Google login HTML with HTTP 200', 200, { 'Content-Type': 'text/html' }],
  ['missing image', 404, { 'content-type': 'image/png' }],
  ['network failure', 0, {}, true]
]) {
  test(`${name} is rejected by the legacy anonymous-access validator`, () => {
    const ctx = context(status, headers, fail);
    vm.runInContext(source, ctx);
    assert.throws(() => ctx.assertPublicDriveImage_(driveUrl), /写真/);
  });
}
