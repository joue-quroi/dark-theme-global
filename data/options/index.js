/* globals webext */
'use strict';

var init = () => webext.storage.get({
  'smart': true,
  'brightness': 0.9,
  'hostnames': [],
  'custom-rules': {}
}).then(prefs => {
  document.getElementById('smart').checked = prefs.smart;
  document.getElementById('brightness').value = parseInt(prefs.brightness * 100);
  document.getElementById('hostnames').value = prefs.hostnames.join(', ');
  document.getElementById('custom-rules').value = JSON.stringify(prefs['custom-rules'], null, '  ');
});
init();

document.getElementById('save').addEventListener('click', () => {
  const info = document.getElementById('info');
  try {
    const json = JSON.parse(document.getElementById('custom-rules').value);

    webext.storage.set({
      smart: document.getElementById('smart').checked,
      brightness: Math.min(100, Math.max(10, Number(document.getElementById('brightness').value))) / 100,
      hostnames: document.getElementById('hostnames').value.split(/\s*,\s*/)
        .map(s => s.replace('http://', '')
        .replace('https://', '').split('/')[0].trim())
        .filter((h, i, l) => h && l.indexOf(h) === i),
      'custom-rules': json
    }).then(() => {
      init();
      info.textContent = 'Options saved';
    });
  }
  catch (e) {
    console.error(e);
    info.textContent = e.message;
  }
  window.setTimeout(() => info.textContent = '', 2000);
});

document.getElementById('support').addEventListener('click', () => webext.tabs.create({
  url: chrome.runtime.getManifest().homepage_url + '?rd=donate'
}));
