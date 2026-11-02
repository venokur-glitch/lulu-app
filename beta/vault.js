/* Encrypts private data (cycle, journal notes) on the device before it syncs.
   The key comes from Lulu's password, so nobody else can read it: not the server, not the dashboard owner. */
(function (root) {
  'use strict';
  var enc = new TextEncoder(), dec = new TextDecoder();
  var cr = root.crypto, subtle = cr.subtle;
  function b64(buf) { var s = '', b = new Uint8Array(buf); for (var i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return btoa(s); }
  function unb64(s) { var b = atob(s), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
  function aes(raw) { return subtle.importKey('raw', unb64(raw), 'AES-GCM', false, ['encrypt', 'decrypt']); }
  root.LuluVault = {
    derive: function (password, salt) {
      return subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']).then(function (base) {
        return subtle.deriveBits({ name: 'PBKDF2', salt: enc.encode('flourish:' + salt), iterations: 210000, hash: 'SHA-256' }, base, 256);
      }).then(b64);
    },
    encrypt: function (raw, obj) {
      var iv = cr.getRandomValues(new Uint8Array(12));
      return aes(raw).then(function (k) { return subtle.encrypt({ name: 'AES-GCM', iv: iv }, k, enc.encode(JSON.stringify(obj))); })
        .then(function (ct) { return { v: 1, iv: b64(iv), ct: b64(ct) }; });
    },
    decrypt: function (raw, blob) {
      return aes(raw).then(function (k) { return subtle.decrypt({ name: 'AES-GCM', iv: unb64(blob.iv) }, k, unb64(blob.ct)); })
        .then(function (pt) { return JSON.parse(dec.decode(pt)); });
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
