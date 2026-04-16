#!/usr/bin/env node
/* eslint-disable no-console */
import http from 'node:http';
import net from 'node:net';
import crypto from 'node:crypto';

const DEVTOOLS_HOST = process.env.DEVTOOLS_HOST ?? '127.0.0.1';
const DEVTOOLS_PORT = Number(process.env.DEVTOOLS_PORT ?? '9222');
const TIMEOUT_MS = Number(process.env.TIMEOUT_MS ?? '30000');

const TARGET_URL_SUBSTR = process.env.TARGET_URL_SUBSTR ?? '/live_chat?';
const SETUP_URL_SUBSTR = process.env.SETUP_URL_SUBSTR ?? '/setup.html';

class BufferedSocket {
  /** @param {net.Socket} socket */
  constructor(socket) {
    this.socket = socket;
    this.buf = Buffer.alloc(0);
    this.closed = false;
    this.error = null;
    this.waiters = [];

    socket.on('data', (chunk) => {
      this.buf = Buffer.concat([this.buf, chunk]);
      this._notify();
    });
    socket.on('end', () => {
      this.closed = true;
      this._notify();
    });
    socket.on('error', (err) => {
      this.error = err;
      this.closed = true;
      this._notify();
    });
  }

  _notify() {
    const waiters = this.waiters;
    this.waiters = [];
    for (const w of waiters) w();
  }

  _waitFor(predicate) {
    if (predicate()) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const tick = () => {
        if (this.error) return reject(this.error);
        if (this.closed) return reject(new Error('socket closed'));
        if (predicate()) return resolve();
        if (Date.now() - start > TIMEOUT_MS) return reject(new Error('timeout waiting for socket data'));
        this.waiters.push(tick);
      };
      this.waiters.push(tick);
    });
  }

  async readN(n) {
    await this._waitFor(() => this.buf.length >= n);
    const out = this.buf.slice(0, n);
    this.buf = this.buf.slice(n);
    return out;
  }

  async readUntil(needle, maxBytes) {
    const needleBuf = Buffer.from(needle, 'utf8');
    await this._waitFor(() => this.buf.indexOf(needleBuf) !== -1 || this.buf.length > maxBytes);
    const idx = this.buf.indexOf(needleBuf);
    if (idx === -1) throw new Error('readUntil exceeded maxBytes');
    const out = this.buf.slice(0, idx + needleBuf.length).toString('utf8');
    this.buf = this.buf.slice(idx + needleBuf.length);
    return out;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const httpGetJson = (path) => {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: DEVTOOLS_HOST, port: DEVTOOLS_PORT, path, method: 'GET' },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
          } catch (err) {
            reject(err);
          }
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
};

const parseWsUrl = (wsUrl) => {
  const u = new URL(wsUrl);
  return { host: u.hostname, port: Number(u.port), path: u.pathname + u.search };
};

const wsHandshake = async (socketBuf, { host, path }) => {
  const key = crypto.randomBytes(16).toString('base64');
  const req =
    `GET ${path} HTTP/1.1\r\n` +
    `Host: ${host}\r\n` +
    'Upgrade: websocket\r\n' +
    'Connection: Upgrade\r\n' +
    `Sec-WebSocket-Key: ${key}\r\n` +
    'Sec-WebSocket-Version: 13\r\n' +
    '\r\n';
  socketBuf.socket.write(req);
  const header = await socketBuf.readUntil('\r\n\r\n', 32 * 1024);
  if (!header.includes(' 101 ')) {
    throw new Error(`WebSocket handshake failed: ${header.split('\r\n')[0] ?? header}`);
  }
};

const wsSendText = (socket, text) => {
  const payload = Buffer.from(text, 'utf8');
  const mask = crypto.randomBytes(4);

  let header;
  if (payload.length < 126) {
    header = Buffer.alloc(2);
    header[0] = 0x81;
    header[1] = 0x80 | payload.length;
  } else if (payload.length < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 0x80 | 126;
    header.writeUInt16BE(payload.length, 2);
  } else {
    throw new Error('payload too large');
  }

  const masked = Buffer.alloc(payload.length);
  for (let i = 0; i < payload.length; i++) masked[i] = payload[i] ^ mask[i % 4];
  socket.write(Buffer.concat([header, mask, masked]));
};

const wsReadFrame = async (socketBuf) => {
  const first2 = await socketBuf.readN(2);
  const opcode = first2[0] & 0x0f;
  const masked = (first2[1] & 0x80) !== 0;
  let len = first2[1] & 0x7f;

  if (len === 126) len = (await socketBuf.readN(2)).readUInt16BE(0);
  else if (len === 127) throw new Error('64-bit lengths not supported');

  const mask = masked ? await socketBuf.readN(4) : null;
  const payload = len ? await socketBuf.readN(len) : Buffer.alloc(0);
  const data = mask ? Buffer.from(payload.map((b, i) => b ^ mask[i % 4])) : payload;
  return { opcode, data };
};

const cdpCall = async (socketBuf, id, method, params) => {
  wsSendText(socketBuf.socket, JSON.stringify({ id, method, params }));
  while (true) {
    const frame = await wsReadFrame(socketBuf);
    if (frame.opcode !== 1) continue;
    const msg = JSON.parse(frame.data.toString('utf8'));
    if (msg.id !== id) continue;
    if (msg.error) throw new Error(`CDP error: ${JSON.stringify(msg.error)}`);
    return msg.result;
  }
};

const cdpEval = async (socketBuf, id, expression, { awaitPromise = false } = {}) => {
  const result = await cdpCall(socketBuf, id, 'Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise
  });
  return result?.result?.value;
};

const cdpEvalRaw = async (socketBuf, id, expression, { awaitPromise = false } = {}) => {
  return cdpCall(socketBuf, id, 'Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise
  });
};

const connectToTarget = async (target) => {
  if (!target.webSocketDebuggerUrl) throw new Error('missing webSocketDebuggerUrl');
  const ws = parseWsUrl(target.webSocketDebuggerUrl);
  const socket = net.connect({ host: ws.host, port: ws.port });
  await new Promise((resolve, reject) => {
    socket.once('connect', resolve);
    socket.once('error', reject);
  });
  const socketBuf = new BufferedSocket(socket);
  await wsHandshake(socketBuf, ws);
  return socketBuf;
};

const main = async () => {
  let target = null;
  let setupTarget = null;
  const start = Date.now();
  while ((!target || !setupTarget) && Date.now() - start < TIMEOUT_MS) {
    const targets = await httpGetJson('/json/list');
    target = targets.find((t) => typeof t.url === 'string' && t.url.includes(TARGET_URL_SUBSTR));
    setupTarget = targets.find((t) => typeof t.url === 'string' && t.url.includes(SETUP_URL_SUBSTR));
    if (!target || !setupTarget) await sleep(500);
  }
  if (!target) {
    console.error(`No target URL containing ${JSON.stringify(TARGET_URL_SUBSTR)} found on DevTools port ${DEVTOOLS_PORT}.`);
    process.exit(2);
  }
  let seeded = null;
  if (setupTarget) {
    const setupSocket = await connectToTarget(setupTarget);
    // Force-complete setup from within the setup page itself, then navigate back to the referrer.
    // We write both sync and local to be robust against storage-area selection differences.
    seeded = await cdpEval(
      setupSocket,
      1,
      String.raw`(async () => {
        const params = new URLSearchParams(location.search);
        const referrer = params.get('referrer') || '';
        const setSync = (obj) => new Promise((resolve) => chrome.storage.sync.set(obj, resolve));
        const setLocal = (obj) => new Promise((resolve) => chrome.storage.local.set(obj, resolve));
        const payload = {
          'ytcf.initialSetupDone': true,
          'ytcf.autoOpenFilterPanel': true,
          'ytcf.currentStorageVersion': 'v3'
        };
        await setSync(payload);
        await setLocal(payload);

        // Best-effort: go back to the embed referrer.
        if (referrer) {
          location.href = referrer;
          return { ok: true, redirected: true, referrer };
        }
        return { ok: true, redirected: false };
      })()`,
      { awaitPromise: true }
    );
    setupSocket.socket.end();
  }

  // Now run the export from the live_chat page context by reaching into the (same-origin) embed iframe.
  const socketBuf = await connectToTarget(target);
  const expr = String.raw`(async () => {
    const out = { steps: [], errors: [], calls: [], state: {} };
    const log = (s) => out.steps.push(s);

    const waitFor = async (fn, label, timeoutMs = 20000) => {
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        try {
          const v = fn();
          if (v) return v;
        } catch {}
        await new Promise(r => setTimeout(r, 250));
      }
      throw new Error('timeout: ' + label);
    };

    const iframe = await waitFor(
      () => document.querySelector('.ytcf-iframe iframe'),
      'ytcf panel iframe'
    );
    log('found panel iframe');

    const win = await waitFor(() => iframe.contentWindow, 'iframe contentWindow');
    const doc = await waitFor(() => iframe.contentDocument, 'iframe contentDocument');
    await waitFor(() => doc.readyState === 'complete' || doc.readyState === 'interactive', 'iframe readyState');
    log('iframe dom ready');

    // Patch error capture inside the iframe.
    win.__ytcfPngDebug = { errors: [], calls: [] };
    win.addEventListener('error', (e) => win.__ytcfPngDebug.errors.push({ type: 'error', message: String(e?.message ?? e) }));
    win.addEventListener('unhandledrejection', (e) => win.__ytcfPngDebug.errors.push({ type: 'rejection', message: String(e?.reason ?? e) }));

    const patch = () => {
      const dbg = win.__ytcfPngDebug;
      const origClick = win.HTMLAnchorElement.prototype.click;
      win.HTMLAnchorElement.prototype.click = function() {
        try {
          dbg.calls.push({ type: 'a.click', href: String(this.href), download: String(this.download ?? '') });
        } catch {}
        return origClick.apply(this, arguments);
      };

      const origToBlob = win.HTMLCanvasElement.prototype.toBlob;
      win.HTMLCanvasElement.prototype.toBlob = function(cb, type, quality) {
        try { dbg.calls.push({ type: 'canvas.toBlob' }); } catch {}
        try {
          return origToBlob.call(this, cb, type, quality);
        } catch (err) {
          try { dbg.calls.push({ type: 'canvas.toBlob.throw', message: String(err?.message ?? err) }); } catch {}
          throw err;
        }
      };

      const origToDataURL = win.HTMLCanvasElement.prototype.toDataURL;
      win.HTMLCanvasElement.prototype.toDataURL = function() {
        try { dbg.calls.push({ type: 'canvas.toDataURL' }); } catch {}
        try {
          return origToDataURL.apply(this, arguments);
        } catch (err) {
          try { dbg.calls.push({ type: 'canvas.toDataURL.throw', message: String(err?.message ?? err) }); } catch {}
          throw err;
        }
      };
    };
    patch();
    log('patched click/toBlob/toDataURL');

    // Find the Save dropdown in the iframe UI and trigger PNG export.
    const select = await waitFor(() => {
      const sels = Array.from(doc.querySelectorAll('select'));
      return sels.find((s) => s.querySelector('option[value="screenshot"]'));
    }, 'export select with screenshot option');
    out.state.exportSelectDisabled = !!select.disabled;
    log('found export select');

    // Make sure panel isn't in a state where Save is disabled.
    if (select.disabled) {
      // Try waiting a bit for messages to load.
      await new Promise(r => setTimeout(r, 3000));
      out.state.exportSelectDisabledAfterWait = !!select.disabled;
    }

    // Trigger change.
    select.value = 'screenshot';
    select.dispatchEvent(new win.Event('change', { bubbles: true }));
    log('dispatched export change');

    // Give async html2canvas + download time.
    // If it hangs, the cloned #screenshot-element tends to stay in DOM.
    const startedAt = Date.now();
    while (Date.now() - startedAt < 120000) {
      const stillThere = !!doc.querySelector('#screenshot-element');
      if (!stillThere) break;
      await new Promise(r => setTimeout(r, 500));
    }

    out.errors = win.__ytcfPngDebug.errors;
    out.calls = win.__ytcfPngDebug.calls;
    out.state.location = String(win.location.href);
    out.state.hasScreenshotElement = !!doc.querySelector('#screenshot-element');
    out.state.screenshotStyleLen = String((doc.querySelector('#shift-screenshot')?.textContent ?? '')).length;
    const screenshotEl = doc.querySelector('#screenshot-element');
    out.state.screenshotClientWidth = Number(screenshotEl?.clientWidth ?? 0);
    out.state.screenshotScrollWidth = Number(screenshotEl?.scrollWidth ?? 0);
    const imgs = Array.from(doc.querySelectorAll('#screenshot-element img'));
    out.state.screenshotImgTotal = imgs.length;
    out.state.screenshotImgIncomplete = imgs.filter((img) => !img.complete).length;
    out.state.screenshotImgLazy = imgs.filter((img) => (img.getAttribute('loading') || '') === 'lazy').length;
    out.state.fontsStatus = String(doc.fonts?.status ?? '');
    out.state.fontsSize = Number(doc.fonts?.size ?? 0);
    out.state.canvasCount = Number(doc.querySelectorAll('canvas').length);
    out.state.ytcfPng = String(doc.documentElement?.dataset?.ytcfPng ?? '');
    out.state.ytcfPngErr = String(doc.documentElement?.dataset?.ytcfPngErr ?? '');
    out.state.numAnchors = doc.querySelectorAll('a').length;
    return out;
  })()`;

  const raw = await cdpEvalRaw(socketBuf, 1, expr, { awaitPromise: true });
  const result = raw?.result?.value;
  socketBuf.socket.end();

  console.log(JSON.stringify({
    targetUrl: target.url,
    eval: {
      hasValue: Object.prototype.hasOwnProperty.call(raw?.result ?? {}, 'value'),
      type: raw?.result?.type,
      subtype: raw?.result?.subtype,
      preview: raw?.result?.preview?.properties?.slice(0, 6) ?? null,
      exception: raw?.exceptionDetails ? {
        text: raw.exceptionDetails.text,
        url: raw.exceptionDetails.url,
        lineNumber: raw.exceptionDetails.lineNumber,
        columnNumber: raw.exceptionDetails.columnNumber
      } : null
    },
    result
  }, null, 2));
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
