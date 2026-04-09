// ==UserScript==
// @name         禅道表格-已确认高亮
// @namespace    https://github.com/21888/zentao-highlight
// @version      1.3.0
// @description  高亮 confirmed=已确认 的整行，自动等待 iframe 和异步表格加载
// @author       21888
// @match        http://zentao.example.com/index.php?*
// @match        https://zentao.example.com/index.php?*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  const IFRAME_SELECTOR = '#appIframe-qa';
  const ROW_CLASS = 'tm-confirmed-row';
  const ID_CLASS = 'tm-confirmed-row-id';

  let currentDoc = null;
  let innerObserver = null;
  let outerObserver = null;
  let pollingTimer = null;

  function log(...args) {
    console.log('[tm-confirmed]', ...args);
  }

  function injectStyle(doc) {
    if (!doc || !doc.head) return;
    if (doc.getElementById('tm-confirmed-style')) return;

    const style = doc.createElement('style');
    style.id = 'tm-confirmed-style';
    style.textContent = `
      .${ROW_CLASS} {
        background: #fff7cc !important;
      }
      .${ID_CLASS} {
        border-left: 4px solid #f5c542 !important;
        box-sizing: border-box !important;
      }
    `;
    doc.head.appendChild(style);
  }

  function highlightRows(doc) {
    if (!doc) return;

    const confirmedCells = doc.querySelectorAll('.dtable-cell[data-col="confirmed"][data-row]');
    if (!confirmedCells.length) return;

    doc.querySelectorAll('.dtable-cell[data-row]').forEach(cell => {
      cell.classList.remove(ROW_CLASS, ID_CLASS);
    });

    confirmedCells.forEach(cell => {
      const rowId = cell.getAttribute('data-row');
      const text = (cell.textContent || '').replace(/\s+/g, '').trim();

      if (!text.includes('已确认')) return;

      doc.querySelectorAll(`.dtable-cell[data-row="${rowId}"]`).forEach(rowCell => {
        rowCell.classList.add(ROW_CLASS);
        if (rowCell.getAttribute('data-col') === 'id') {
          rowCell.classList.add(ID_CLASS);
        }
      });
    });
  }

  function bindInnerObserver(doc) {
    if (!doc || !doc.body) return;

    if (innerObserver) {
      innerObserver.disconnect();
      innerObserver = null;
    }

    innerObserver = new MutationObserver(() => {
      highlightRows(doc);
    });

    innerObserver.observe(doc.body, {
      childList: true,
      subtree: true
    });

    injectStyle(doc);
    highlightRows(doc);

    setTimeout(() => highlightRows(doc), 300);
    setTimeout(() => highlightRows(doc), 1000);
    setTimeout(() => highlightRows(doc), 2000);
  }

  function tryBindIframeContent() {
    const iframe = document.querySelector(IFRAME_SELECTOR);
    if (!iframe) return false;

    let doc;
    try {
      doc = iframe.contentDocument || iframe.contentWindow?.document;
    } catch (e) {
      log('iframe 内容暂不可访问', e);
      return false;
    }

    if (!doc || !doc.documentElement) return false;
    if (!doc.body) return false;

    if (currentDoc !== doc) {
      currentDoc = doc;
      log('绑定新的 iframe 文档');
      bindInnerObserver(doc);
    } else {
      injectStyle(doc);
      highlightRows(doc);
    }

    return true;
  }

  function bindIframeLoadEvent() {
    const iframe = document.querySelector(IFRAME_SELECTOR);
    if (!iframe) return false;

    if (iframe.__tm_confirmed_bound__) return true;
    iframe.__tm_confirmed_bound__ = true;

    iframe.addEventListener('load', () => {
      log('iframe load 触发');
      setTimeout(tryBindIframeContent, 0);
      setTimeout(tryBindIframeContent, 300);
      setTimeout(tryBindIframeContent, 1000);
    });

    return true;
  }

  function startOuterObserver() {
    if (outerObserver) return;

    outerObserver = new MutationObserver(() => {
      bindIframeLoadEvent();
      tryBindIframeContent();
    });

    const target = document.body || document.documentElement;
    if (!target) return;

    outerObserver.observe(target, {
      childList: true,
      subtree: true
    });
  }

  function startPolling() {
    if (pollingTimer) clearInterval(pollingTimer);

    pollingTimer = setInterval(() => {
      bindIframeLoadEvent();
      tryBindIframeContent();
    }, 1000);

    setTimeout(() => {
      if (pollingTimer) {
        clearInterval(pollingTimer);
        pollingTimer = null;
      }
    }, 30000);
  }

  function init() {
    bindIframeLoadEvent();
    tryBindIframeContent();
    startOuterObserver();
    startPolling();

    setTimeout(tryBindIframeContent, 500);
    setTimeout(tryBindIframeContent, 1500);
    setTimeout(tryBindIframeContent, 3000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
