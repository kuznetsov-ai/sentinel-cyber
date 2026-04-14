/**
 * Sentinel Cyber — Global Interactivity
 * All tabs, toggles, modals, toasts, notifications, profile
 */
(function () {
  'use strict';

  // ── TOAST ─────────────────────────────────────────────────────
  window.showToastGlobal = function showToast(msg, type) {
    type = type || 'success';
    var c = { success: '#4ae183', error: '#ff5352', info: '#b0c6ff', warning: '#f59e0b' };
    var t = document.createElement('div');
    t.setAttribute('data-toast', '1');
    t.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:999999;background:#1e2024;' +
      'border:1px solid ' + c[type] + '33;color:#e2e2e8;padding:11px 18px;border-radius:10px;' +
      'font-family:Inter,sans-serif;font-size:13px;font-weight:500;display:flex;align-items:center;' +
      'gap:9px;box-shadow:0 4px 24px rgba(0,0,0,0.5);transform:translateY(60px);opacity:0;' +
      'transition:all 0.25s cubic-bezier(0.34,1.56,0.64,1);max-width:340px';
    var dot = document.createElement('span');
    dot.style.cssText = 'width:7px;height:7px;border-radius:50%;flex-shrink:0;background:' + c[type];
    t.appendChild(dot);
    t.appendChild(document.createTextNode(msg));
    document.body.appendChild(t);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { t.style.transform = 'translateY(0)'; t.style.opacity = '1'; });
    });
    setTimeout(function () {
      t.style.transform = 'translateY(60px)'; t.style.opacity = '0';
      setTimeout(function () { t.remove(); }, 300);
    }, 2800);
  };

  // ── MODAL ─────────────────────────────────────────────────────
  window.showModalGlobal = function showModal(title, bodyHtml) {
    var old = document.getElementById('sc-modal-overlay');
    if (old) old.remove();
    var ov = document.createElement('div');
    ov.id = 'sc-modal-overlay';
    ov.style.cssText = 'position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,0.72);' +
      'backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center';
    var box = document.createElement('div');
    box.style.cssText = 'background:#1e2024;border:1px solid rgba(66,70,85,0.4);border-radius:16px;' +
      'padding:28px;width:520px;max-width:92vw;max-height:82vh;overflow-y:auto;' +
      'box-shadow:0 20px 60px rgba(0,0,0,0.5);animation:scSU 0.22s cubic-bezier(0.34,1.56,0.64,1)';
    box.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px">' +
      '<h3 style="font-family:Manrope,sans-serif;font-size:15px;font-weight:700;color:#e2e2e8">' + title + '</h3>' +
      '<button id="sc-close" style="background:none;border:none;color:#6b7080;cursor:pointer;font-size:18px;padding:4px 6px;line-height:1;border-radius:4px" title="Close">✕</button>' +
      '</div><div style="font-family:Inter,sans-serif;font-size:13px;color:#c2c6d8;line-height:1.65">' + bodyHtml + '</div>';
    ov.appendChild(box);
    document.body.appendChild(ov);
    function close() { ov.remove(); }
    document.getElementById('sc-close').onclick = close;
    ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
    document.addEventListener('keydown', function k(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', k); } });
  };

  // inject keyframe
  var ks = document.createElement('style');
  ks.textContent = '@keyframes scSU{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}}';
  document.head.appendChild(ks);

  window.profileHTML =
    '<div style="display:flex;flex-direction:column;gap:14px">' +
    '<div style="display:grid;grid-template-columns:100px 1fr;gap:10px;align-items:center">' +
    '<label style="font-size:11px;color:#6b7080;text-transform:uppercase;letter-spacing:.08em">Full name</label>' +
    '<input value="Alex P." style="background:#1a1c20;border:1px solid rgba(66,70,85,0.4);border-radius:7px;padding:7px 10px;color:#e2e2e8;font-family:Inter,sans-serif;font-size:13px;outline:none">' +
    '<label style="font-size:11px;color:#6b7080;text-transform:uppercase;letter-spacing:.08em">Email</label>' +
    '<input value="alex.p@sentinel.cyber" style="background:#1a1c20;border:1px solid rgba(66,70,85,0.4);border-radius:7px;padding:7px 10px;color:#e2e2e8;font-family:Inter,sans-serif;font-size:13px;outline:none">' +
    '<label style="font-size:11px;color:#6b7080;text-transform:uppercase;letter-spacing:.08em">Role</label>' +
    '<span style="font-size:12px;font-weight:600;color:#b0c6ff">Admin</span>' +
    '</div>' +
    '<button onclick="showToastGlobal(\'Profile saved\',\'success\');document.getElementById(\'sc-modal-overlay\').remove()" ' +
    'style="background:rgba(0,112,255,0.1);border:1px solid rgba(176,198,255,0.2);color:#b0c6ff;padding:8px;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer;font-family:Inter,sans-serif">Save profile</button>' +
    '</div>';

  window.prefsHTML =
    '<div style="display:flex;flex-direction:column;gap:12px">' +
    ['Dark mode','Compact tables','Show risk scores','Real-time notifications','Email on Critical'].map(function(p, i) {
      var active = [true, false, true, true, false][i];
      return '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(66,70,85,0.12)">' +
        '<span style="font-size:13px;color:#c2c6d8">' + p + '</span>' +
        '<div class="sc-toggle" data-active="' + active + '" onclick="var a=this.getAttribute(\'data-active\')!==\'true\';this.setAttribute(\'data-active\',a);this.style.background=a?\'#4ae183\':\'#374151\'" ' +
        'style="width:38px;height:21px;border-radius:999px;cursor:pointer;position:relative;background:' + (active?'#4ae183':'#374151') + ';transition:background .2s">' +
        '<div style="position:absolute;top:2.5px;' + (active?'left:calc(100% - 19px)':'left:2px') + ';width:16px;height:16px;background:#fff;border-radius:50%;transition:left .18s"></div>' +
        '</div></div>';
    }).join('') +
    '<button onclick="showToastGlobal(\'Preferences saved\',\'success\');document.getElementById(\'sc-modal-overlay\').remove()" ' +
    'style="margin-top:4px;background:rgba(0,112,255,0.1);border:1px solid rgba(176,198,255,0.2);color:#b0c6ff;padding:8px;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer;font-family:Inter,sans-serif">Save preferences</button>' +
    '</div>';

  window.apiKeysHTML = '<p style="margin-bottom:14px;color:#8c90a1">Manage your API access tokens:</p>' +
    '<div style="background:#111317;border-radius:8px;padding:11px 14px;font-family:monospace;font-size:11px;color:#4ae183;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">' +
    'sk-taf-••••••••••PROD1 <span style="color:#6b7080;font-size:10px">Production</span></div>' +
    '<div style="background:#111317;border-radius:8px;padding:11px 14px;font-family:monospace;font-size:11px;color:#f59e0b;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center">' +
    'sk-taf-••••••••••DEV2 <span style="color:#6b7080;font-size:10px">Development</span></div>' +
    '<button onclick="showToastGlobal(\'New API key generated\',\'success\');document.getElementById(\'sc-modal-overlay\').remove()" ' +
    'style="background:rgba(0,112,255,0.1);border:1px solid rgba(176,198,255,0.2);color:#b0c6ff;padding:8px 16px;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer;font-family:Inter,sans-serif">Generate new key</button>';

  // ── SIDEBAR LINKS ─────────────────────────────────────────────
  var ROUTES = { 'dashboard': '/', 'alerts': '/alerts', 'cases': '/cases', 'rules engine': '/rules', 'reports': '/reports', 'settings': '/settings' };
  function fixSidebarLinks() {
    var nav = document.querySelector('aside nav, nav:first-of-type');
    if (!nav) nav = document.querySelector('nav');
    if (!nav) return;
    nav.querySelectorAll('a').forEach(function (a) {
      var t = a.textContent.trim().toLowerCase();
      for (var k in ROUTES) { if (t.includes(k)) { a.href = ROUTES[k]; break; } }
    });
  }

  // ── NOTIFICATIONS BELL ────────────────────────────────────────
  var NOTIF_DATA = [
    { icon: '🔴', text: 'Critical: Velocity spike on #9021', time: '2 min ago' },
    { icon: '🟠', text: 'High risk: IP Geofencing triggered', time: '8 min ago' },
    { icon: '🟡', text: 'Auto-block applied to UUID 7106…', time: '14 min ago' },
    { icon: '🟢', text: 'Case #CS-8812 resolved by Mike T.', time: '31 min ago' },
    { icon: '🔵', text: 'Rules Engine: 3 rules updated', time: '1 hr ago' },
  ];
  function initNotifications() {
    document.querySelectorAll('button').forEach(function (btn) {
      var icon = btn.querySelector('.material-symbols-outlined');
      if (!icon) return;
      var nm = icon.textContent.trim();
      if (nm !== 'notifications' && nm !== 'notification') return;
      if (btn.getAttribute('data-sc-notif-init')) return;
      btn.setAttribute('data-sc-notif-init', '1');
      btn.style.cursor = 'pointer';
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var existing = document.getElementById('sc-notif-panel');
        if (existing) { existing.remove(); return; }
        var rect = btn.getBoundingClientRect();
        var panel = document.createElement('div');
        panel.id = 'sc-notif-panel';
        panel.style.cssText = 'position:fixed;top:' + (rect.bottom + 8) + 'px;right:16px;' +
          'width:320px;background:#1a1c20;border:1px solid rgba(66,70,85,0.35);border-radius:12px;' +
          'z-index:99990;box-shadow:0 12px 40px rgba(0,0,0,0.5);overflow:hidden;' +
          'animation:scSU 0.18s ease';
        var header = '<div style="padding:14px 16px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid rgba(66,70,85,0.2)">' +
          '<span style="font-family:Manrope,sans-serif;font-weight:700;font-size:13px;color:#e2e2e8">Notifications</span>' +
          '<button onclick="showToastGlobal(\'All marked as read\',\'info\');this.closest(\'#sc-notif-panel\').remove()" ' +
          'style="background:none;border:none;color:#b0c6ff;font-size:11px;font-weight:600;cursor:pointer;font-family:Inter,sans-serif">Mark all read</button></div>';
        var items = NOTIF_DATA.map(function (n) {
          return '<div style="padding:11px 16px;display:flex;gap:11px;align-items:flex-start;border-bottom:1px solid rgba(66,70,85,0.1);cursor:pointer" ' +
            'onmouseenter="this.style.background=\'rgba(176,198,255,0.05)\'" ' +
            'onmouseleave="this.style.background=\'\'">' +
            '<span style="font-size:16px;flex-shrink:0;margin-top:1px">' + n.icon + '</span>' +
            '<div><p style="font-family:Inter,sans-serif;font-size:12px;color:#c2c6d8;margin-bottom:3px">' + n.text + '</p>' +
            '<p style="font-size:10px;color:#5a6070">' + n.time + '</p></div></div>';
        }).join('');
        panel.innerHTML = header + items;
        document.body.appendChild(panel);
        document.addEventListener('click', function rm(e) {
          if (!panel.contains(e.target) && e.target !== btn) { panel.remove(); document.removeEventListener('click', rm); }
        }, { once: false });
        document.addEventListener('click', function rmOnce() {
          setTimeout(function () {
            document.addEventListener('click', function rm2(e) {
              if (!panel.contains(e.target)) { panel.remove(); document.removeEventListener('click', rm2); }
            });
          }, 100);
          document.removeEventListener('click', rmOnce);
        });
      });
    });
  }

  // ── PROFILE / ACCOUNT ─────────────────────────────────────────
  function initProfile() {
    document.querySelectorAll('button').forEach(function (btn) {
      var icon = btn.querySelector('.material-symbols-outlined');
      if (!icon) return;
      if (icon.textContent.trim() !== 'account_circle') return;
      if (btn.getAttribute('data-sc-profile-init')) return;
      btn.setAttribute('data-sc-profile-init', '1');
      btn.style.cursor = 'pointer';
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var existing = document.getElementById('sc-profile-panel');
        if (existing) { existing.remove(); return; }
        var rect = btn.getBoundingClientRect();
        var panel = document.createElement('div');
        panel.id = 'sc-profile-panel';
        panel.style.cssText = 'position:fixed;top:' + (rect.bottom + 8) + 'px;right:16px;' +
          'width:220px;background:#1a1c20;border:1px solid rgba(66,70,85,0.35);border-radius:12px;' +
          'z-index:99990;box-shadow:0 12px 40px rgba(0,0,0,0.5);overflow:hidden;animation:scSU 0.18s ease';
        panel.innerHTML = '<div style="padding:14px 16px;border-bottom:1px solid rgba(66,70,85,0.2)">' +
          '<p style="font-family:Manrope,sans-serif;font-weight:700;font-size:13px;color:#e2e2e8">Alex P.</p>' +
          '<p style="font-size:11px;color:#5a6070;margin-top:2px">alex.p@sentinel.cyber</p>' +
          '<span style="display:inline-block;margin-top:6px;font-size:10px;font-weight:600;color:#b0c6ff;background:rgba(0,112,255,0.12);border-radius:999px;padding:2px 8px">Admin</span>' +
          '</div>' +
          '<div style="padding:6px">' +
          [
            { label: 'Profile settings', action: 'showModalGlobal(\'Profile\',profileHTML)' },
            { label: 'Preferences',      action: 'showModalGlobal(\'Preferences\',prefsHTML)' },
            { label: 'API Keys',         action: 'showModalGlobal(\'API Keys\',apiKeysHTML)'  },
          ].map(function (item) {
            return '<button onclick="' + item.action + ';document.getElementById(\'sc-profile-panel\').remove()" ' +
              'style="display:block;width:100%;text-align:left;background:none;border:none;color:#c2c6d8;font-family:Inter,sans-serif;font-size:12.5px;padding:8px 10px;border-radius:7px;cursor:pointer" ' +
              'onmouseenter="this.style.background=\'rgba(176,198,255,0.06)\'" onmouseleave="this.style.background=\'none\'">' + item.label + '</button>';
          }).join('') +
          '<hr style="border:none;border-top:1px solid rgba(66,70,85,0.2);margin:4px 0">' +
          '<button onclick="showToastGlobal(\'Logging out...\',\'warning\');document.getElementById(\'sc-profile-panel\').remove()" ' +
          'style="display:block;width:100%;text-align:left;background:none;border:none;color:#ff5352;font-family:Inter,sans-serif;font-size:12.5px;padding:8px 10px;border-radius:7px;cursor:pointer" ' +
          'onmouseenter="this.style.background=\'rgba(255,83,82,0.06)\'" onmouseleave="this.style.background=\'none\'">Logout</button>' +
          '</div>';
        document.body.appendChild(panel);
        setTimeout(function () {
          document.addEventListener('click', function rm(e) {
            if (!panel.contains(e.target)) { panel.remove(); document.removeEventListener('click', rm); }
          });
        }, 50);
      });
    });
  }

  // ── SETTINGS TABS (CSS show/hide approach) ────────────────────
  var INTEGRATIONS_HTML = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">' +
    makeIntCard('hub', '#b0c6ff', 'Slack', 'Webhook alerts', true, "showToastGlobal('Slack settings opened','info')") +
    makeIntCard('mark_email_read', '#ff5352', 'PagerDuty', 'On-call escalation', false, "showToastGlobal('PagerDuty setup opened','info')") +
    makeIntCard('storage', '#4ae183', 'ClickHouse', 'Data source', true, "showToastGlobal('ClickHouse: connection OK','success')") +
    makeIntCard('api', '#b0c6ff', 'REST API', 'External access', true, "showModalGlobal('API Keys',apiKeysHTML)") +
    '</div>';

  function makeIntCard(icon, color, name, desc, connected, action) {
    var statusBg = connected ? 'rgba(74,225,131,0.12)' : 'rgba(255,83,82,0.12)';
    var statusColor = connected ? '#4ae183' : '#ff5352';
    var statusText = connected ? 'Connected' : 'Not connected';
    var btnText = connected ? 'Configure' : 'Connect';
    return '<div style="background:rgba(30,32,36,0.95);border:1px solid rgba(66,70,85,0.25);border-radius:12px;padding:18px">' +
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">' +
      '<span style="background:rgba(176,198,255,0.08);border-radius:8px;padding:7px;display:flex">' +
      '<span class="material-symbols-outlined" style="color:' + color + ';font-size:18px">' + icon + '</span></span>' +
      '<div style="flex:1"><p style="font-weight:700;font-size:13px;font-family:Manrope,sans-serif">' + name + '</p>' +
      '<p style="color:#6b7080;font-size:11px">' + desc + '</p></div>' +
      '<span style="background:' + statusBg + ';color:' + statusColor + ';padding:2px 8px;border-radius:999px;font-size:10px;font-weight:600">' + statusText + '</span></div>' +
      '<button onclick="' + action + '" style="background:rgba(0,112,255,0.08);border:1px solid rgba(176,198,255,0.18);color:#b0c6ff;padding:6px 13px;border-radius:7px;font-size:11px;font-weight:600;cursor:pointer;font-family:Inter,sans-serif">' + btnText + '</button></div>';
  }

  var SECURITY_HTML = '<div style="display:flex;flex-direction:column;gap:14px">' +
    '<div style="background:rgba(30,32,36,0.95);border:1px solid rgba(66,70,85,0.25);border-radius:12px;padding:20px">' +
    '<h3 style="font-family:Manrope,sans-serif;font-weight:700;font-size:14px;margin-bottom:4px">Two-Factor Authentication</h3>' +
    '<p style="color:#8c90a1;font-size:12px;margin-bottom:14px">Require 2FA for all platform users.</p>' +
    '<div style="display:flex;align-items:center;justify-content:space-between">' +
    '<span style="font-size:13px">Enforce 2FA for all users</span>' +
    '<div class="sc-toggle" data-active="true" style="width:42px;height:23px;background:#4ae183;border-radius:999px;cursor:pointer;position:relative;transition:background 0.2s;flex-shrink:0">' +
    '<div style="position:absolute;right:3px;top:2.5px;width:18px;height:18px;background:#fff;border-radius:50%;transition:all 0.2s;box-shadow:0 1px 3px rgba(0,0,0,0.3)"></div></div></div></div>' +

    '<div style="background:rgba(30,32,36,0.95);border:1px solid rgba(66,70,85,0.25);border-radius:12px;padding:20px">' +
    '<h3 style="font-family:Manrope,sans-serif;font-weight:700;font-size:14px;margin-bottom:4px">Session Policy</h3>' +
    '<p style="color:#8c90a1;font-size:12px;margin-bottom:14px">Control session duration and concurrency.</p>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">' +
    '<div><label style="display:block;font-size:10px;color:#6b7080;margin-bottom:5px;text-transform:uppercase;letter-spacing:0.08em">Session timeout</label>' +
    '<select style="width:100%;background:#282a2e;border:1px solid rgba(66,70,85,0.3);border-radius:7px;padding:7px 11px;color:#e2e2e8;font-family:Inter,sans-serif;font-size:12px"><option>8 hours</option><option>4 hours</option><option>24 hours</option></select></div>' +
    '<div><label style="display:block;font-size:10px;color:#6b7080;margin-bottom:5px;text-transform:uppercase;letter-spacing:0.08em">Max sessions</label>' +
    '<select style="width:100%;background:#282a2e;border:1px solid rgba(66,70,85,0.3);border-radius:7px;padding:7px 11px;color:#e2e2e8;font-family:Inter,sans-serif;font-size:12px"><option>1 per user</option><option>3 per user</option><option>Unlimited</option></select></div></div>' +
    '<button onclick="showToastGlobal(\'Session policy saved\',\'success\')" style="background:rgba(0,112,255,0.08);border:1px solid rgba(176,198,255,0.18);color:#b0c6ff;padding:7px 14px;border-radius:7px;font-size:11px;font-weight:600;cursor:pointer;font-family:Inter,sans-serif">Save policy</button></div>' +

    '<div style="background:rgba(30,32,36,0.95);border:1px solid rgba(66,70,85,0.25);border-radius:12px;padding:20px">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">' +
    '<div><h3 style="font-family:Manrope,sans-serif;font-weight:700;font-size:14px">Audit Log</h3>' +
    '<p style="color:#8c90a1;font-size:11px">Recent auth &amp; config events</p></div>' +
    '<button onclick="showToastGlobal(\'Audit log exported\',\'success\')" style="background:rgba(30,32,36,0.8);border:1px solid rgba(66,70,85,0.3);color:#e2e2e8;padding:5px 11px;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;font-family:Inter,sans-serif">Export CSV</button></div>' +
    [['alex.p','Login','20:14','#4ae183'],['elena.k','Rule updated','19:52','#b0c6ff'],['mike.t','Alert dismissed','19:41','#b0c6ff'],['SYSTEM','Auto-block fired','19:03','#f59e0b'],['sarah.j','Login','18:57','#4ae183']].map(function (r) {
      return '<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid rgba(66,70,85,0.12);font-family:Inter,sans-serif">' +
        '<span style="background:rgba(176,198,255,0.07);border-radius:5px;padding:2px 7px;font-size:10px;font-weight:700;color:#b0c6ff;min-width:60px;text-align:center">' + r[0] + '</span>' +
        '<span style="flex:1;font-size:12px;color:#c2c6d8">' + r[1] + '</span>' +
        '<span style="font-size:10px;color:#5a6070">' + r[2] + '</span>' +
        '<span style="width:6px;height:6px;border-radius:50%;background:' + r[3] + ';flex-shrink:0"></span></div>';
    }).join('') + '</div></div>';

  var TAB_SECTION_MAP = {
    'General':       ['System Settings', 'Alert Thresholds'],
    'Notifications': ['Notifications'],
    'Team':          ['Team Members'],
  };

  function initSettingsTabs() {
    // Find tab links inside header nav
    var tabLinks = Array.from(document.querySelectorAll('header nav a'));
    if (!tabLinks.length) return;
    var names = tabLinks.map(function (a) { return a.textContent.trim(); });
    if (names.indexOf('General') === -1) return; // not settings page

    // Find all sections by their h2 text
    var allSections = Array.from(document.querySelectorAll('main section'));
    var sectionMap = {};
    allSections.forEach(function (s) {
      var h2 = s.querySelector('h2');
      if (h2) sectionMap[h2.textContent.trim()] = s;
    });

    // Create a wrapper div for the Integrations and Security tabs
    var mainGrid = document.querySelector('main .grid.grid-cols-12, main [class*="grid-cols-12"]');
    var contentParent = mainGrid ? mainGrid.parentElement : (allSections[0] ? allSections[0].parentElement : null);
    if (!contentParent) return;

    // Create generated tab panels
    function makePanel(id, html) {
      var d = document.createElement('div');
      d.setAttribute('data-tab-panel', id);
      d.style.cssText = 'display:none;padding:0';
      d.innerHTML = html;
      contentParent.appendChild(d);
      return d;
    }

    var intPanel = makePanel('Integrations', INTEGRATIONS_HTML);
    var secPanel = makePanel('Security', SECURITY_HTML);

    // Give each original section a data-tab-section attribute
    Object.keys(TAB_SECTION_MAP).forEach(function (tabName) {
      TAB_SECTION_MAP[tabName].forEach(function (sectionTitle) {
        var s = sectionMap[sectionTitle];
        if (s) s.setAttribute('data-tab-section', tabName);
      });
    });

    // Set initial state: show only General
    allSections.forEach(function (s) {
      var tab = s.getAttribute('data-tab-section');
      if (!tab || tab === 'General') {
        s.style.display = '';
      } else {
        s.style.display = 'none';
      }
    });

    function activateTab(tabName) {
      // Update tab link styles
      tabLinks.forEach(function (a) {
        var n = a.textContent.trim();
        if (n === tabName) {
          a.style.color = '#b0c6ff';
          a.style.borderBottom = '2px solid #b0c6ff';
          a.style.paddingBottom = '';
        } else {
          a.style.color = '#424655';
          a.style.borderBottom = 'none';
        }
      });

      // Show/hide original sections
      allSections.forEach(function (s) {
        var tab = s.getAttribute('data-tab-section') || 'General';
        s.style.display = (tab === tabName) ? '' : 'none';
      });

      // Show/hide generated panels
      intPanel.style.display = (tabName === 'Integrations') ? '' : 'none';
      secPanel.style.display = (tabName === 'Security') ? '' : 'none';

      // Re-init toggles in newly shown panel
      initToggles();
      initFormSaves();
    }

    // Wire up tab clicks
    tabLinks.forEach(function (a) {
      a.href = '#';
      a.addEventListener('click', function (e) {
        e.preventDefault();
        activateTab(a.textContent.trim());
      });
    });
  }

  // ── TOGGLES ───────────────────────────────────────────────────
  function initToggles() {
    // Pattern 1: toggle track directly has cursor-pointer (Settings page)
    var direct = document.querySelectorAll('[class*="rounded-full"][class*="cursor-pointer"]:not([data-sc-t])');
    direct.forEach(function (el) {
      var inner = el.querySelector('div');
      if (!inner) return;
      el.setAttribute('data-sc-t', '1');
      var active = (el.getAttribute('class') || '').includes('bg-secondary');
      el.setAttribute('data-active', active ? 'true' : 'false');
      applyToggle(el, active);
      el.addEventListener('click', function () {
        var now = el.getAttribute('data-active') !== 'true';
        el.setAttribute('data-active', String(now));
        applyToggle(el, now);
        showToastGlobal(now ? 'Enabled' : 'Disabled', now ? 'success' : 'info');
      });
    });

    // Pattern 2: cursor-pointer parent wraps the rounded-full track (Rules page)
    var parents = document.querySelectorAll('[class*="cursor-pointer"]:not([data-sc-t])');
    parents.forEach(function (el) {
      var track = el.querySelector('[class*="rounded-full"]');
      if (!track) return;
      var inner = track.querySelector('div');
      if (!inner) return;
      if (el.tagName === 'BUTTON' || el.tagName === 'A') return; // skip buttons/links
      el.setAttribute('data-sc-t', '1');
      var active = (track.getAttribute('class') || '').includes('bg-secondary');
      el.setAttribute('data-active', active ? 'true' : 'false');
      applyToggle(track, active);
      el.addEventListener('click', function () {
        var now = el.getAttribute('data-active') !== 'true';
        el.setAttribute('data-active', String(now));
        applyToggle(track, now);
        showToastGlobal(now ? 'Enabled' : 'Disabled', now ? 'success' : 'info');
      });
    });

    // .sc-toggle (injected HTML)
    document.querySelectorAll('.sc-toggle:not([data-sc-t])').forEach(function (el) {
      el.setAttribute('data-sc-t', '1');
      var active = el.getAttribute('data-active') === 'true';
      applyToggle(el, active);
      el.addEventListener('click', function () {
        var now = el.getAttribute('data-active') !== 'true';
        el.setAttribute('data-active', String(now));
        applyToggle(el, now);
        showToastGlobal(now ? 'Enabled' : 'Disabled', now ? 'success' : 'info');
      });
    });
  }

  function applyToggle(el, active) {
    var inner = el.querySelector('div');
    if (!inner) return;
    el.style.background = active ? '#4ae183' : '#374151';
    el.style.transition = 'background 0.2s';
    inner.style.cssText = 'position:absolute;top:2.5px;width:18px;height:18px;background:#fff;' +
      'border-radius:50%;transition:left 0.18s;left:' + (active ? 'calc(100% - 21px)' : '2px') + ';box-shadow:0 1px 3px rgba(0,0,0,0.25)';
  }

  // ── ALERTS TABLE ──────────────────────────────────────────────
  function initAlertsTable() {
    document.querySelectorAll('tbody tr:not([data-sc-row])').forEach(function (row) {
      row.setAttribute('data-sc-row', '1');
      var cells = row.querySelectorAll('td');
      var id  = cells[0] ? cells[0].textContent.trim() : '?';
      var acc = cells[2] ? cells[2].textContent.trim() : '?';
      var typ = cells[3] ? cells[3].textContent.trim() : '?';
      var sev = cells[4] ? cells[4].textContent.trim() : '?';

      row.querySelectorAll('button').forEach(function (btn) {
        var icon = (btn.querySelector('.material-symbols-outlined') || {}).textContent || '';
        icon = icon.trim();
        if (icon === 'visibility') {
          btn.title = 'View';
          btn.addEventListener('click', function () {
            showModalGlobal('Alert ' + id,
              '<div style="display:grid;grid-template-columns:110px 1fr;gap:7px;margin-bottom:14px">' +
              det('Alert ID', id) + det('Account', acc) + det('Type', typ) + det('Severity', sev) + det('Status', row.getAttribute('data-status') || 'New') +
              '</div><div style="background:#111317;border-radius:8px;padding:12px;font-family:monospace;font-size:11px;color:#4ae183">' +
              '// Detection trace\nrule: ' + typ + '\nconfidence: ' + (78 + Math.floor(Math.random() * 18)) + '%\ngeo_flag: true</div>');
          });
        }
        if (icon === 'check_circle') {
          btn.title = 'Acknowledge';
          btn.addEventListener('click', function () {
            if (row.getAttribute('data-acked')) return;
            row.setAttribute('data-acked', '1');
            row.setAttribute('data-status', 'Acknowledged');
            var badge = row.querySelector('[class*="rounded"]');
            if (badge) { badge.textContent = 'Acknowledged'; badge.style.background = 'rgba(176,198,255,0.1)'; badge.style.color = '#b0c6ff'; }
            row.style.opacity = '0.65';
            showToastGlobal('Alert ' + id + ' acknowledged', 'info');
          });
        }
        if (icon === 'cancel') {
          btn.title = 'Dismiss';
          btn.addEventListener('click', function () {
            row.style.transition = 'opacity 0.3s, transform 0.3s';
            row.style.opacity = '0'; row.style.transform = 'translateX(16px)';
            setTimeout(function () { row.remove(); }, 320);
            showToastGlobal('Alert dismissed', 'warning');
          });
        }
      });
    });
  }

  function det(l, v) {
    return '<span style="color:#6b7080;font-size:12px">' + l + '</span><span style="font-weight:500">' + v + '</span>';
  }

  // ── CASES TABLE ───────────────────────────────────────────────
  function initCasesTable() {
    document.querySelectorAll('button:not([data-sc-case])').forEach(function (btn) {
      if (!btn.textContent.includes('Open Case')) return;
      btn.setAttribute('data-sc-case', '1');
      btn.addEventListener('click', function () {
        var row = btn.closest('tr');
        var cells = row ? row.querySelectorAll('td') : [];
        var cid = cells[0] ? cells[0].textContent.trim() : 'CS-?';
        var acc = cells[2] ? cells[2].textContent.trim() : '';
        var risk = cells[3] ? cells[3].textContent.trim() : '';
        var meth = cells[4] ? cells[4].textContent.trim() : '';
        showModalGlobal('Case ' + cid,
          '<div style="display:grid;grid-template-columns:110px 1fr;gap:7px;margin-bottom:16px">' +
          det('Case ID', cid) + det('Account', acc) + det('Risk', risk) + det('Method', meth) +
          '</div><div style="display:flex;gap:8px">' +
          '<button onclick="showToastGlobal(\'Case ' + cid + ' assigned\',\'info\');document.getElementById(\'sc-modal-overlay\').remove()" ' +
          'style="flex:1;background:rgba(0,112,255,0.1);border:1px solid rgba(176,198,255,0.2);color:#b0c6ff;padding:8px;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer;font-family:Inter,sans-serif">Take ownership</button>' +
          '<button onclick="showToastGlobal(\'Case escalated\',\'warning\');document.getElementById(\'sc-modal-overlay\').remove()" ' +
          'style="flex:1;background:rgba(255,83,82,0.08);border:1px solid rgba(255,83,82,0.2);color:#ff5352;padding:8px;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer;font-family:Inter,sans-serif">Escalate</button>' +
          '</div>');
      });
    });
  }

  // ── RULES ENGINE ──────────────────────────────────────────────
  function initRulesEngine() {
    document.querySelectorAll('.material-symbols-outlined:not([data-sc-ri])').forEach(function (icon) {
      var nm = icon.textContent.trim();
      if (!['edit', 'content_copy', 'delete'].includes(nm)) return;
      if (!icon.classList.contains('cursor-pointer')) return;
      icon.setAttribute('data-sc-ri', '1');
      var card = icon.closest('[class*="glass-card"], [class*="glass_card"]') ||
                 icon.closest('[class*="rounded-xl"]');
      var name = card ? (card.querySelector('h3,p.font-bold,[class*="font-bold"]') || {}).textContent || 'Rule' : 'Rule';
      name = name.trim().split('\n')[0].trim();
      if (nm === 'edit') {
        icon.addEventListener('click', function () {
          showModalGlobal('Edit: ' + name,
            '<div style="display:flex;flex-direction:column;gap:12px">' +
            '<div><label style="font-size:10px;color:#6b7080;display:block;margin-bottom:5px;text-transform:uppercase;letter-spacing:.08em">Rule name</label>' +
            '<input value="' + name + '" style="width:100%;background:#282a2e;border:1px solid rgba(66,70,85,0.4);border-radius:7px;padding:8px 11px;color:#e2e2e8;font-family:Inter,sans-serif;font-size:13px;box-sizing:border-box"></div>' +
            '<div><label style="font-size:10px;color:#6b7080;display:block;margin-bottom:5px;text-transform:uppercase;letter-spacing:.08em">Priority</label>' +
            '<input type="range" min="1" max="10" value="7" style="width:100%;cursor:pointer"></div>' +
            '<button onclick="showToastGlobal(\'Rule saved\',\'success\');document.getElementById(\'sc-modal-overlay\').remove()" ' +
            'style="background:rgba(0,112,255,0.1);border:1px solid rgba(176,198,255,0.2);color:#b0c6ff;padding:8px;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer;font-family:Inter,sans-serif">Save changes</button></div>');
        });
      }
      if (nm === 'content_copy') { icon.addEventListener('click', function () { showToastGlobal('"' + name + '" duplicated', 'info'); }); }
      if (nm === 'delete') {
        icon.addEventListener('click', function () {
          if (card) { card.style.transition = 'opacity .3s,transform .3s'; card.style.opacity = '0'; card.style.transform = 'scale(.94)'; setTimeout(function () { card.remove(); }, 320); }
          showToastGlobal('"' + name + '" deleted', 'warning');
        });
      }
    });

    document.querySelectorAll('button:not([data-sc-cr])').forEach(function (btn) {
      var t = btn.textContent.trim();
      if (!t.includes('Create Rule') && !t.includes('Deploy New Rule')) return;
      btn.setAttribute('data-sc-cr', '1');
      btn.addEventListener('click', function () {
        showModalGlobal('Create detection rule',
          '<div style="display:flex;flex-direction:column;gap:12px">' +
          '<div><label style="font-size:10px;color:#6b7080;display:block;margin-bottom:5px;text-transform:uppercase;letter-spacing:.08em">Rule name</label>' +
          '<input placeholder="e.g. Rapid Withdrawal Pattern" style="width:100%;background:#282a2e;border:1px solid rgba(66,70,85,0.4);border-radius:7px;padding:8px 11px;color:#e2e2e8;font-family:Inter,sans-serif;font-size:13px;box-sizing:border-box"></div>' +
          '<div><label style="font-size:10px;color:#6b7080;display:block;margin-bottom:5px;text-transform:uppercase;letter-spacing:.08em">Type</label>' +
          '<select style="width:100%;background:#282a2e;border:1px solid rgba(66,70,85,0.4);border-radius:7px;padding:8px 11px;color:#e2e2e8;font-family:Inter,sans-serif;font-size:13px"><option>Velocity</option><option>ML Model</option><option>Pattern</option><option>Threshold</option></select></div>' +
          '<div><label style="font-size:10px;color:#6b7080;display:block;margin-bottom:5px;text-transform:uppercase;letter-spacing:.08em">Priority (1–10)</label>' +
          '<input type="range" min="1" max="10" value="5" style="width:100%;cursor:pointer"></div>' +
          '<button onclick="showToastGlobal(\'Rule created\',\'success\');document.getElementById(\'sc-modal-overlay\').remove()" ' +
          'style="background:rgba(0,112,255,0.1);border:1px solid rgba(176,198,255,0.2);color:#b0c6ff;padding:8px;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer;font-family:Inter,sans-serif">Create rule</button></div>');
      });
    });
  }

  // ── FORM SAVES ────────────────────────────────────────────────
  function initFormSaves() {
    document.querySelectorAll('button:not([data-sc-fs])').forEach(function (btn) {
      var t = btn.textContent.trim();
      if (t.includes('Save Changes') || t.includes('Update Parameters') || t.includes('Save policy')) {
        btn.setAttribute('data-sc-fs', '1');
        btn.addEventListener('click', function (e) { e.preventDefault(); showToastGlobal('Changes saved', 'success'); });
      }
      if (t.includes('Invite Member')) {
        btn.setAttribute('data-sc-fs', '1');
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          showModalGlobal('Invite team member',
            '<div style="display:flex;flex-direction:column;gap:12px">' +
            '<div><label style="font-size:10px;color:#6b7080;display:block;margin-bottom:5px;text-transform:uppercase;letter-spacing:.08em">Email</label>' +
            '<input type="email" placeholder="name@sentinel.cyber" style="width:100%;background:#282a2e;border:1px solid rgba(66,70,85,0.4);border-radius:7px;padding:8px 11px;color:#e2e2e8;font-family:Inter,sans-serif;font-size:13px;box-sizing:border-box"></div>' +
            '<div><label style="font-size:10px;color:#6b7080;display:block;margin-bottom:5px;text-transform:uppercase;letter-spacing:.08em">Role</label>' +
            '<select style="width:100%;background:#282a2e;border:1px solid rgba(66,70,85,0.4);border-radius:7px;padding:8px 11px;color:#e2e2e8;font-family:Inter,sans-serif;font-size:13px"><option>Analyst</option><option>Admin</option><option>Viewer</option></select></div>' +
            '<button onclick="showToastGlobal(\'Invitation sent!\',\'success\');document.getElementById(\'sc-modal-overlay\').remove()" ' +
            'style="background:rgba(0,112,255,0.1);border:1px solid rgba(176,198,255,0.2);color:#b0c6ff;padding:8px;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer;font-family:Inter,sans-serif">Send invitation</button></div>');
        });
      }
      if (t.includes('Export') && !btn.getAttribute('data-sc-fs')) {
        btn.setAttribute('data-sc-fs', '1');
        btn.addEventListener('click', function () {
          showToastGlobal('Preparing export…', 'info');
          setTimeout(function () { showToastGlobal('export_14Apr2026.csv ready', 'success'); }, 1500);
        });
      }
    });
  }

  // ── INIT ──────────────────────────────────────────────────────
  function init() {
    fixSidebarLinks();
    initSettingsTabs();
    initToggles();
    initAlertsTable();
    initCasesTable();
    initRulesEngine();
    initFormSaves();
    initNotifications();
    initProfile();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
