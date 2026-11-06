const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('apps-script/report-photo-helper/Code.gs', 'utf8');
const url = 'https://drive.google.com/file/d/publicPhotoId/view';

function backend() {
  const reads = [];
  const ctx = vm.createContext({
    DriveApp: { getFileById(id) {
      reads.push(id);
      return {
        getMimeType: () => 'image/jpeg', getSize: () => 3,
        getBlob: () => ({ getContentType: () => 'image/jpeg', getBytes: () => [1, 2, 3] })
      };
    } },
    Utilities: { base64Encode: bytes => Buffer.from(bytes).toString('base64') }
  });
  vm.runInContext(source, ctx);
  ctx.getSheetRecords_ = () => [
    { id: 'public', date: '2026-08-24', title: 'Public', imageurl: url, visible: '公開' },
    { id: 'hidden', date: '2026-08-25', title: 'Hidden', imageurl: 'https://drive.google.com/file/d/privatePhotoId/view', visible: '非公開' }
  ];
  return { ctx, reads };
}

test('only a public report can deliver a Drive image, without anonymous Drive access', () => {
  const { ctx, reads } = backend();
  assert.equal(ctx.getPublicReportPhoto_('public').dataUrl, 'data:image/jpeg;base64,AQID');
  assert.deepEqual(reads, ['publicPhotoId']);
  for (const id of ['hidden', 'privatePhotoId', '', 'missing']) {
    assert.throws(() => ctx.getPublicReportPhoto_(id), /公開対象/);
  }
  assert.deepEqual(reads, ['publicPhotoId']);
  ctx.getSheetRecords_ = () => [];
  assert.throws(() => ctx.getPublicReportPhoto_('public'), /公開対象/);
});

test('unreadable photos reject registration before any spreadsheet write', () => {
  const { ctx } = backend();
  ctx.DriveApp.getFileById = () => { throw new Error('denied'); };
  ctx.SpreadsheetApp = { getActiveSpreadsheet() { throw new Error('unexpected sheet access'); } };
  ctx.buildPostMessageHtml_ = payload => payload;
  const result = ctx.doPost({ parameter: { reportId: 'public', imageUrl: url } });
  assert.equal(result.ok, false);
  assert.match(result.message, /実行者/);
});

test('unsupported documents cannot be delivered as photos', () => {
  const { ctx } = backend();
  ctx.DriveApp.getFileById = () => ({ getMimeType: () => 'text/html' });
  assert.throws(() => ctx.getPublicReportPhoto_('public'), /JPEG/);
});

test('large photos use a bounded thumbnail and never load the original', () => {
  const { ctx } = backend();
  ctx.DriveApp.getFileById = () => ({
    getMimeType: () => 'image/jpeg', getSize: () => 9 * 1024 * 1024,
    getBlob: () => { throw new Error('original must not be loaded'); },
    getThumbnail: () => ({ getContentType: () => 'image/png', getBytes: () => [1, 2, 3] })
  });
  assert.equal(ctx.getPublicReportPhoto_('public').dataUrl, 'data:image/png;base64,AQID');
});

test('includeHidden cannot override photo endpoint publication checks', () => {
  const { ctx, reads } = backend();
  ctx.jsonResponse_ = payload => payload;
  const result = ctx.doGet({ parameter: { resource: 'report-photo', reportId: 'hidden', includeHidden: 'true', fileId: 'privatePhotoId' } });
  assert.equal(result.ok, false);
  assert.deepEqual(reads, []);
});

test('resource-key links work and unrelated external IDs are not treated as Drive', () => {
  const { ctx } = backend();
  ctx.DriveApp.getFileByIdAndResourceKey = (id, key) => {
    assert.equal(id, 'publicPhotoId'); assert.equal(key, 'abc-123');
    return ctx.DriveApp.getFileById(id);
  };
  assert.ok(ctx.getDrivePhotoBlob_(url + '?resourcekey=abc-123'));
  assert.equal(ctx.extractDriveFileId_('https://example.com/d/other?id=test'), '');
});

test('display image is resized, cached, and still checked against current publication state', () => {
  const { ctx, reads } = backend();
  const values = new Map();
  let fetches = 0;
  ctx.CacheService = { getScriptCache: () => ({
    get: key => values.get(key) ?? null,
    getAll: keys => Object.fromEntries(keys.filter(key => values.has(key)).map(key => [key, values.get(key)])),
    put: (key, value, ttl) => { assert.equal(ttl, 300); values.set(key, value); },
    putAll: (entries, ttl) => {
      assert.equal(ttl, 300);
      for (const [key, value] of Object.entries(entries)) {
        assert.ok(value.length <= 90000); values.set(key, value);
      }
    }
  }) };
  ctx.ScriptApp = { getOAuthToken: () => 'server-only-token' };
  ctx.UrlFetchApp = { fetch(request, options) {
    fetches++;
    assert.equal(options.headers.Authorization, 'Bearer server-only-token');
    if (request.startsWith('https://www.googleapis.com/drive/v3/')) return {
      getResponseCode: () => 200,
      getContentText: () => JSON.stringify({ mimeType: 'image/jpeg', thumbnailLink: 'https://lh3.googleusercontent.com/example=s220' })
    };
    assert.equal(request, 'https://lh3.googleusercontent.com/example=s1600');
    return { getResponseCode: () => 200,
      getBlob: () => ({ getContentType: () => 'image/jpeg', getBytes: () => [4, 5, 6] })
    };
  } };
  assert.equal(ctx.getPublicReportPhoto_('public').dataUrl, 'data:image/jpeg;base64,BAUG');
  assert.equal(ctx.getPublicReportPhoto_('public').dataUrl, 'data:image/jpeg;base64,BAUG');
  assert.equal(fetches, 2);
  assert.deepEqual(reads, []); // Original was never downloaded.
  ctx.getSheetRecords_ = () => [];
  assert.throws(() => ctx.getPublicReportPhoto_('public'), /公開対象/);
});

test('broken display cache falls back to reading the original', () => {
  const { ctx } = backend();
  ctx.CacheService = { getScriptCache() { throw new Error('cache unavailable'); } };
  assert.equal(ctx.getPublicReportPhoto_('public').dataUrl, 'data:image/jpeg;base64,AQID');
});

test('preview requests use the thumbnail without loading original bytes', () => {
  const { ctx } = backend();
  ctx.DriveApp.getFileById = () => ({
    getMimeType: () => 'image/jpeg',
    getThumbnail: () => ({ getContentType: () => 'image/jpeg', getBytes: () => [4, 5, 6] }),
    getBlob() { throw new Error('original must not be read'); }
  });
  const photo = ctx.getPublicReportPhoto_('public', true);
  assert.equal(photo.preview, true);
  assert.equal(photo.dataUrl, 'data:image/jpeg;base64,BAUG');
});

test('missing thumbnail falls back to full image without claiming to be a preview', () => {
  const { ctx } = backend();
  const original = ctx.DriveApp.getFileById;
  ctx.DriveApp.getFileById = id => ({ ...original(id), getThumbnail: () => null });
  const photo = ctx.getPublicReportPhoto_('public', true);
  assert.equal(photo.preview, false);
  assert.equal(photo.dataUrl, 'data:image/jpeg;base64,AQID');
});

test('4.4MB payload remains cacheable when display resizing is unavailable', () => {
  const { ctx } = backend();
  let reads = 0;
  const values = new Map();
  ctx.CacheService = { getScriptCache: () => ({
    get: key => values.get(key) ?? null,
    getAll: keys => Object.fromEntries(keys.filter(key => values.has(key)).map(key => [key, values.get(key)])),
    put: (key, value) => values.set(key, value),
    putAll: entries => { for (const [key, value] of Object.entries(entries)) { assert.ok(value.length <= 90000); values.set(key, value); } }
  }) };
  ctx.getDrivePhotoBlob_ = () => {
    reads++;
    return { getContentType: () => 'image/jpeg', getBytes: () => Buffer.alloc(3336491) };
  };
  const first = ctx.getPublicReportPhoto_('public');
  const second = ctx.getPublicReportPhoto_('public');
  assert.ok(first.dataUrl.length > 4400000);
  assert.equal(second.dataUrl, first.dataUrl);
  assert.equal(reads, 1);
});

test('browser replaces Drive URL with API image and sends no login credentials', async () => {
  const handlers = {};
  const img = {
    dataset: { reportId: 'public', fallbacks: 'https://drive.google.com/uc?id=example' },
    isConnected: true, src: 'https://drive.google.com/thumbnail?id=example',
    addEventListener: (name, fn) => { handlers[name] = fn; }
  };
  const window = {};
  const ctx = vm.createContext({ window, URL, AbortController, setTimeout, clearTimeout, console,
    fetch: async (request, options) => {
      const url = new URL(request);
      assert.equal(url.searchParams.get('resource'), 'report-photo');
      assert.equal(url.searchParams.get('reportId'), 'public');
      assert.equal(url.searchParams.has('includeHidden'), false);
      assert.equal(options.credentials, 'omit');
      return { ok: true, json: async () => ({ ok: true, dataUrl: 'data:image/jpeg;base64,AQID' }) };
    }
  });
  vm.runInContext(fs.readFileSync('js/report-photos.js', 'utf8'), ctx);
  await window.ReportPhotos.attach(img, 'https://script.google.com/macros/s/example/exec');
  assert.equal(img.src, 'data:image/jpeg;base64,AQID');
});

test('browser keeps existing direct-image fallbacks when the photo API fails', async () => {
  const img = {
    dataset: { reportId: 'public', fallbacks: 'https://drive.google.com/uc?id=example' },
    complete: true, naturalWidth: 0,
    addEventListener() {}
  };
  const window = {};
  const ctx = vm.createContext({ window, URL, AbortController, setTimeout, clearTimeout,
    console: { warn() {} }, fetch: async () => { throw new Error('network'); }
  });
  vm.runInContext(fs.readFileSync('js/report-photos.js', 'utf8'), ctx);
  await window.ReportPhotos.attach(img, 'https://script.google.com/macros/s/example/exec');
  assert.equal(img.src, 'https://drive.google.com/uc?id=example');
});

test('page reload reuses a recent photo; a changed photo URL fetches again', async () => {
  const values = new Map();
  let calls = 0;
  const window = { sessionStorage: {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key)
  } };
  const ctx = vm.createContext({ window, URL, AbortController, setTimeout, clearTimeout, console,
    fetch: async () => {
      calls++;
      return { ok: true, json: async () => ({ ok: true, dataUrl: 'data:image/jpeg;base64,AQID' }) };
    }
  });
  const helper = fs.readFileSync('js/report-photos.js', 'utf8');
  const image = source => ({
    src: source, dataset: { reportId: 'public', fallbacks: 'https://drive.google.com/uc?id=example' },
    isConnected: true, addEventListener() {}
  });
  const api = 'https://script.google.com/macros/s/example/exec';
  vm.runInContext(helper, ctx);
  await window.ReportPhotos.attach(image('https://drive.google.com/thumbnail?id=example'), api);
  vm.runInContext(helper, ctx); // Simulate a page reload, keeping only sessionStorage.
  await window.ReportPhotos.attach(image('https://drive.google.com/thumbnail?id=example'), api);
  assert.equal(calls, 1);
  await window.ReportPhotos.attach(image('https://drive.google.com/thumbnail?id=new-photo'), api);
  assert.equal(calls, 2);
  for (const [key, value] of values) {
    values.set(key, JSON.stringify({ ...JSON.parse(value), expires: 0 }));
  }
  await window.ReportPhotos.attach(image('https://drive.google.com/thumbnail?id=example'), api);
  assert.equal(calls, 3);
});

test('preview is displayed before full image resolves and full-image failure keeps it visible', async () => {
  for (const failFull of [false, true]) {
    const window = {};
    const img = { src: 'https://drive.google.com/thumbnail?id=example', isConnected: true,
      dataset: { reportId: 'public', fallbacks: 'https://drive.google.com/uc?id=example' }, addEventListener() {} };
    const ctx = vm.createContext({ window, URL, AbortController, setTimeout, clearTimeout, console: { warn() {} },
      fetch: async request => {
        const preview = new URL(request).searchParams.get('preview') === 'true';
        if (!preview) {
          assert.equal(img.src, 'data:image/jpeg;base64,AQID');
          if (failFull) throw new Error('network');
        }
        return { ok: true, json: async () => ({ ok: true, preview, dataUrl: preview ? 'data:image/jpeg;base64,AQID' : 'data:image/jpeg;base64,BAUG' }) };
      }
    });
    vm.runInContext(fs.readFileSync('js/report-photos.js', 'utf8'), ctx);
    await window.ReportPhotos.attach(img, 'https://script.google.com/macros/s/example/exec');
    assert.equal(img.src, failFull ? 'data:image/jpeg;base64,AQID' : 'data:image/jpeg;base64,BAUG');
  }
});
