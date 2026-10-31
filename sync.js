/* Optional sync with Supabase. Off when config.js has no keys: then data stays on the device. */
(function () {
  'use strict';
  var cfg = window.LULU_CONFIG || {};
  if (!cfg.supabaseUrl || !cfg.supabaseKey) return;

  var client = null, user = null, timer = null, pending = null, lastSync = null, ready = false;
  var TABLE = 'lulu_state';

  window.LuluSync = {
    push: function (state) {
      pending = state;
      if (!ready) return;
      clearTimeout(timer);
      timer = setTimeout(flush, 1200);
    },
    renderAccount: function (el) {
      if (!user) { el.textContent = 'Not signed in.'; return; }
      el.innerHTML = '';
      var t = document.createElement('div');
      t.textContent = 'Signed in as ' + user.email + '. ' + (lastSync ? 'Synced ' + ago(lastSync) + '.' : 'Syncing…') + ' Your phone, iPad and computer stay in step.';
      var b = document.createElement('button');
      b.className = 'pill small'; b.style.marginTop = '10px'; b.textContent = 'Sign out';
      b.onclick = function () { client.auth.signOut().then(function () { location.reload(); }); };
      el.appendChild(t); el.appendChild(b);
    }
  };

  function ago(t) { var s = Math.round((Date.now() - t) / 1000); return s < 60 ? 'just now' : s < 3600 ? Math.round(s / 60) + ' min ago' : 'a while ago'; }

  function flush() {
    if (!user || !pending) return;
    var s = pending; pending = null;
    client.from(TABLE).upsert({ user_id: user.id, data: s, updated_at: new Date(s.updatedAt).toISOString() })
      .then(function (r) { if (!r.error) lastSync = Date.now(); else pending = pending || s; });
  }

  function pull() {
    if (!user) return Promise.resolve();
    return client.from(TABLE).select('data, updated_at').eq('user_id', user.id).maybeSingle().then(function (r) {
      if (r.error) return;
      var local = window.LuluApp.getState();
      var remote = r.data && r.data.data;
      if (remote && (!local.updatedAt || remote.updatedAt > local.updatedAt || local.__fresh)) {
        window.LuluApp.replaceState(remote);
      } else {
        pending = local; flush();
      }
      lastSync = Date.now();
    });
  }

  function gate(mode, msg) {
    var o = document.getElementById('overlay');
    var signup = mode === 'signup';
    o.innerHTML = '<div style="position:fixed;inset:0;z-index:80;background:#F5DDE1;display:flex;align-items:center;justify-content:center;padding:32px">' +
      '<form id="authf" style="width:100%;max-width:380px;text-align:center;display:flex;flex-direction:column;gap:14px">' +
      '<span class="label">Lulu</span><h1 class="big serif">' + (signup ? 'Make your account.' : 'Welcome back.') + '</h1>' +
      '<p style="margin:0 0 6px;font-size:15px;line-height:1.5">' + (msg || (signup ? 'Your plan saves to your account, so it follows you to every device.' : 'Sign in to pick up where you left off.')) + '</p>' +
      '<label class="field" style="text-align:left">Email<input id="ae" type="email" autocomplete="email" required></label>' +
      '<label class="field" style="text-align:left">Password<input id="ap" type="password" autocomplete="' + (signup ? 'new-password' : 'current-password') + '" minlength="8" required></label>' +
      '<button class="pill solid block" type="submit">' + (signup ? 'Create Account' : 'Sign In') + '</button>' +
      '<button class="pill block" type="button" id="aswap" style="border:0">' + (signup ? 'I already have an account' : 'First time? Create an account') + '</button>' +
      '<p id="aerr" role="alert" style="margin:0;font-size:14px;color:#8E1A45"></p></form></div>';
    document.getElementById('aswap').onclick = function () { gate(signup ? 'signin' : 'signup'); };
    document.getElementById('authf').onsubmit = function (e) {
      e.preventDefault();
      var em = document.getElementById('ae').value.trim(), pw = document.getElementById('ap').value;
      var err = document.getElementById('aerr'); err.textContent = '';
      var p = signup ? client.auth.signUp({ email: em, password: pw }) : client.auth.signInWithPassword({ email: em, password: pw });
      p.then(function (r) {
        if (r.error) { err.textContent = r.error.message; return; }
        if (signup && !r.data.session) { gate('signin', 'Almost there. Check your email and tap the confirm link, then come back here and sign in.'); return; }
        start(r.data.session.user);
      }).catch(function () { err.textContent = 'Couldn’t reach the server. Check your connection.'; });
    };
  }

  function start(u) {
    user = u; ready = true;
    document.getElementById('overlay').innerHTML = '';
    pull().then(function () { window.LuluApp.render(); });
  }

  function boot() {
    client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
    client.auth.getSession().then(function (r) {
      var s = r.data && r.data.session;
      if (s) start(s.user); else gate('signin');
    });
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') pull(); else { clearTimeout(timer); flush(); }
    });
  }

  var sc = document.createElement('script');
  sc.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
  sc.onload = boot;
  sc.onerror = function () { /* offline: keep working locally */ };
  document.head.appendChild(sc);
})();
