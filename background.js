/* globals webext */
'use strict';

var prefs = {
  'enabled': true,
  'smart': true,
  'invert': 90,
  'brightness': 0.9,
  'bg-color': '#010101',
  'hostnames': [],
  'custom-rules': {}
};
webext.storage.on('changed', ps => Object.keys(ps).forEach(k => prefs[k] = ps[k].newValue));

var cache = {};
webext.tabs.on('removed', id => delete cache[id]);

var onCommitted = d => {
  const {tabId, frameId, url} = d;
  const isTop = frameId === 0;

  if (isTop) {
    cache[tabId] = new URL(url).hostname;
  }

  if (prefs.hostnames.indexOf(cache[tabId]) !== -1) {
    return console.log('skipped');
  }

  webext.tabs.executeScript(tabId, {
    runAt: 'document_start',
    'matchAboutBlank': true,
    frameId,
    code: `
      var prefs = ${JSON.stringify(prefs)};
      var isTop = ${isTop};
      var styles = "${prefs['custom-rules'][cache[tabId]] || ''}";
    `
  }, () => webext.tabs.executeScript(tabId, {
    runAt: 'document_start',
    'matchAboutBlank': true,
    frameId,
    file: '/data/inject.js'
  }));
};

var install = () => {
  webext.webNavigation.on('committed', onCommitted)
    .if(({url}) => url.startsWith('http'));
  webext.browserAction.setIcon({
    path: {
      '16': '/data/icons/16.png',
      '32': '/data/icons/32.png',
      '48': '/data/icons/48.png',
      '64': '/data/icons/64.png'
    }
  });
  webext.browserAction.setTitle({
    title: 'Global Dark is enabled'
  });
};

var remove = () => {
  webext.webNavigation.off('committed', onCommitted);
  webext.browserAction.setIcon({
    path: {
      '16': '/data/icons/disabled/16.png',
      '32': '/data/icons/disabled/32.png',
      '48': '/data/icons/disabled/48.png',
      '64': '/data/icons/disabled/64.png'
    }
  });
  webext.browserAction.setTitle({
    title: 'Global Dark is disabled'
  });
};

webext.storage.get(prefs).then(ps => {
  Object.assign(prefs, ps);
  if (prefs.enabled) {
    install();
  }
  else {
    remove();
  }
});

webext.browserAction.on('clicked', () => webext.storage.get({
  enabled: true
}).then(({enabled}) => {
  if (enabled) {
    remove();
  }
  else {
    install();
  }
  webext.storage.set({
    enabled: !enabled
  });
}));

// context menu
webext.contextMenus.batch([{
  id: 'add-to-blacklist',
  title: 'Add to the blacklist',
  contexts: ['browser_action'],
  documentUrlPatterns: ['*://*/*']
}, {
  id: 'remove-from-blacklist',
  title: 'Remove from the blacklist',
  contexts: ['browser_action'],
  documentUrlPatterns: ['*://*/*']
}]);

webext.contextMenus.on('clicked', (info, tab) => {
  const {hostname} = new URL(tab.url);
  prefs.hostnames.push(hostname);
  prefs.hostnames = prefs.hostnames.filter((s, i, l) => s && l.indexOf(s) === i);

  webext.storage.set({
    hostnames: prefs.hostnames
  });

  webext.tabs.sendMessage(tab.id, {
    method: 'disabled'
  });

  webext.notifications.create({
    message: `"${hostname}" is added to the blacklist`
  });
}).if(({menuItemId}) => menuItemId === 'add-to-blacklist');

webext.contextMenus.on('clicked', (info, tab) => {
  const {hostname} = new URL(tab.url);
  const index = prefs.hostnames.indexOf(hostname);

  if (index !== -1) {
    prefs.hostnames.splice(index, 1);

    webext.storage.set({
      hostnames: prefs.hostnames
    });

    webext.tabs.sendMessage(tab.id, {
      method: 'enabled'
    });

    webext.notifications.create({
      message: `"${hostname}" is removed from the blacklist`
    });
  }
}).if(({menuItemId}) => menuItemId === 'remove-from-blacklist');

// FAQs and Feedback
webext.runtime.on('start-up', () => {
  const {name, version, homepage_url} = webext.runtime.getManifest();
  const page = homepage_url; // eslint-disable-line camelcase
  // FAQs
  webext.storage.get({
    'version': null,
    'faqs': navigator.userAgent.indexOf('Firefox') === -1,
    'last-update': 0,
  }).then(prefs => {
    if (prefs.version ? (prefs.faqs && prefs.version !== version) : true) {
      const now = Date.now();
      const doUpdate = (now - prefs['last-update']) / 1000 / 60 / 60 / 24 > 30;
      webext.storage.set({
        version,
        'last-update': doUpdate ? Date.now() : prefs['last-update']
      }).then(() => {
        // do not display the FAQs page if last-update occurred less than 30 days ago.
        if (doUpdate) {
          const p = Boolean(prefs.version);
          webext.tabs.create({
            url: page + '?version=' + version +
              '&type=' + (p ? ('upgrade&p=' + prefs.version) : 'install'),
            active: p === false
          });
        }
      });
    }
  });
  // Feedback
  webext.runtime.setUninstallURL(
    page + '?rd=feedback&name=' + name + '&version=' + version
  );
});
