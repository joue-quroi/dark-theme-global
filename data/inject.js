/* globals prefs, isTop, styles */
'use strict';

{
  const isBlack = (() => {
    const bg = window.getComputedStyle(document.documentElement)['background-color'];
    if (bg !== 'rgba(0, 0, 0, 0)') {
      const t = /(\d+), (\d+), (\d+)/.exec(bg);
      if (t) {
        return (Number(t[1]) + Number(t[2]) + Number(t[3])) / 3 < 125;
      }
    }
    return false;
  })();
  if (isBlack === false || prefs.smart === false) {
    const style = document.createElement('style');
    style.textContent = `
      html.darkme {
        background-color: ${prefs['bg-color']};
        filter: invert(${prefs.invert}%) ${isTop ? `brightness(${prefs.brightness})` : ''};
      }

      html.darkme em,
      html.darkme img,
      html.darkme svg,
      html.darkme image,
      html.darkme video,
      html.darkme audio,
      html.darkme embed,
      html.darkme iframe,
      html.darkme object,
      html.darkme button,
      html.darkme canvas {
        filter: invert(${200 - prefs.invert}%);
      }
      ${styles}
    `;
    document.documentElement.appendChild(style);
    if (prefs.enabled) {
      document.documentElement.classList.add('darkme');
    }
  }
}
chrome.storage.onChanged.addListener(prefs => {
  if (prefs.enabled) {
    document.documentElement.classList[prefs.enabled.newValue ? 'add' : 'remove']('darkme');
  }
});
chrome.runtime.onMessage.addListener(request => {
  if (request.method === 'disabled') {
    document.documentElement.classList.remove('darkme');
  }
  else if (request.method === 'enabled') {
    document.documentElement.classList.add('darkme');
  }
});

// clear invert for elements with background-image
document.addEventListener('DOMContentLoaded', () => {
  let selectors = [];
  [...document.styleSheets].forEach(sheet => {
    try {
      [...sheet.rules].filter(r => /background.*url/.test(r.cssText))
        .forEach(r => selectors.push(r.selectorText));
    }
    catch (e) {}
  });
  selectors = selectors.filter((s, i, l) => s && s !== 'body' && s.indexOf('body,') === -1 && l.indexOf(s) === i);
  if (selectors.length) {
    const style = document.createElement('style');
    style.textContent = selectors.map(s => 'html.darkme ' + s).join(',\n') + `{
      filter: invert(${200 - prefs.invert}%) !important;
    }`;
    document.documentElement.appendChild(style);
  }
});
