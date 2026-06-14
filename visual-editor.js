// ============================================
// HAILANZU Visual Editor v2.1
// Inline contenteditable editor for all pages
// Supports: regular text, SVG text, marquee, placeholders
// ============================================
(function() {
  'use strict';

  // ===== CONFIG =====
  var STORAGE_KEY = 'hailanzu-ve-changes';
  var ORIGINALS_KEY = 'hailanzu-ve-originals';
  var LANGS = ['zh', 'ko', 'en', 'ja'];
  var LANG_NAMES = { zh: '中文', ko: '한국어', en: 'English', ja: '日本語' };

  // ===== STATE =====
  var editMode = false;
  var changes = {};
  var originals = {};
  var currentPage = '';
  var currentLang = 'zh';
  var i18nType = '';
  var i18nObj = null;
  var keytipEl = null;
  var svgEditOverlay = null;
  var saveTimer = null;
  var hasUnsaved = false;

  // ===== INIT =====
  function init() {
    currentPage = detectPage();
    i18nType = detectI18nType();
    i18nObj = getI18nObj();
    currentLang = localStorage.getItem('hailanzu-lang') || 'zh';

    loadChanges();
    snapshotOriginals();
    applySavedChanges();

    createUI();
    hookSetLanguage();

    // Re-render DOM with saved changes applied to i18n/translations objects
    // (page's own setLanguage already ran before our script loaded)
    if (typeof window.setLanguage === 'function') {
      window.setLanguage(currentLang);
    } else {
      applyChangesToDOM();
    }
  }

  function detectPage() {
    var name = location.pathname.split('/').pop().replace('.html', '') || 'index';
    return name;
  }

  function detectI18nType() {
    if (typeof window.i18n !== 'undefined' && window.i18n !== null && !Array.isArray(window.i18n)) return 'i18n';
    if (typeof window.translations !== 'undefined' && window.translations !== null) return 'translations';
    return 'unknown';
  }

  function getI18nObj() {
    if (i18nType === 'i18n') return window.i18n;
    if (i18nType === 'translations') return window.translations;
    return null;
  }

  // ===== ORIGINALS SNAPSHOT =====
  function snapshotOriginals() {
    if (!i18nObj) return;
    try {
      var saved = localStorage.getItem(ORIGINALS_KEY);
      if (saved) {
        originals = JSON.parse(saved);
        var needsResnapshot = false;
        var sampleKey = currentPage + '::nav.seasons::zh';
        if (originals[sampleKey] === undefined && i18nObj) {
          var testVal = getI18nValueDirect('nav.seasons', 'zh');
          if (testVal !== null && testVal !== undefined) {
            needsResnapshot = true;
          }
        }
        if (!needsResnapshot) return;
      }
    } catch(e) {}

    originals = {};
    if (i18nType === 'i18n') {
      Object.keys(i18nObj).forEach(function(key) {
        LANGS.forEach(function(lang) {
          if (i18nObj[key] && i18nObj[key][lang] !== undefined) {
            originals[currentPage + '::' + key + '::' + lang] = String(i18nObj[key][lang]);
          }
        });
      });
    } else if (i18nType === 'translations') {
      LANGS.forEach(function(lang) {
        if (i18nObj[lang]) {
          Object.keys(i18nObj[lang]).forEach(function(key) {
            originals[currentPage + '::' + key + '::' + lang] = String(i18nObj[lang][key]);
          });
        }
      });
    }
    try {
      localStorage.setItem(ORIGINALS_KEY, JSON.stringify(originals));
    } catch(e) {}
  }

  function getI18nValueDirect(i18nKey, lang) {
    if (i18nType === 'i18n') {
      return i18nObj && i18nObj[i18nKey] ? i18nObj[i18nKey][lang] : null;
    } else if (i18nType === 'translations') {
      return i18nObj && i18nObj[lang] ? i18nObj[lang][i18nKey] : null;
    }
    return null;
  }

  // ===== CHANGE MANAGEMENT =====
  function loadChanges() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved) changes = JSON.parse(saved);
    } catch(e) { changes = {}; }
  }

  function saveChanges() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(changes));
    } catch(e) {
      showToast('保存失败，本地存储空间不足', 'error');
      return;
    }
    hasUnsaved = false;
  }

  function getOriginalValue(i18nKey, lang) {
    var key = currentPage + '::' + i18nKey + '::' + lang;
    return originals[key] !== undefined ? originals[key] : null;
  }

  function setI18nValue(i18nKey, lang, value) {
    if (i18nType === 'i18n') {
      if (i18nObj && i18nObj[i18nKey]) i18nObj[i18nKey][lang] = value;
    } else if (i18nType === 'translations') {
      if (i18nObj && i18nObj[lang]) i18nObj[lang][i18nKey] = value;
    }
  }

  function applySavedChanges() {
    if (!i18nObj) return;
    var pageChanges = Object.keys(changes).filter(function(k) {
      return k.indexOf(currentPage + '::') === 0;
    });
    if (pageChanges.length === 0) return;
    pageChanges.forEach(function(key) {
      var parts = key.split('::');
      var i18nKey = parts[1];
      var lang = parts[2];
      setI18nValue(i18nKey, lang, changes[key]);
    });
  }

  // Directly apply saved changes to DOM elements (fallback when setLanguage not available)
  function applyChangesToDOM() {
    var pageChanges = Object.keys(changes).filter(function(k) {
      return k.indexOf(currentPage + '::') === 0;
    });
    if (pageChanges.length === 0) return;
    pageChanges.forEach(function(key) {
      var parts = key.split('::');
      var i18nKey = parts[1];
      var lang = parts[2];
      if (lang !== currentLang) return;
      var el = document.querySelector('[data-i18n="' + i18nKey + '"]');
      if (!el) return;
      var tag = el.tagName.toLowerCase();
      if (tag === 'text') {
        el.textContent = changes[key];
      } else if (tag === 'title') {
        document.title = changes[key];
      } else {
        var origVal = getOriginalValue(i18nKey, currentLang);
        var useHtml = origVal && typeof origVal === 'string' && (origVal.indexOf('<br') >= 0 || origVal.indexOf('<em') >= 0 || origVal.indexOf('<strong') >= 0 || origVal.indexOf('<span') >= 0);
        if (useHtml) {
          el.innerHTML = changes[key];
        } else {
          el.textContent = changes[key];
        }
      }
    });
  }

  // ===== HOOK setLanguage =====
  var origSetLang = null;
  function hookSetLanguage() {
    if (typeof window.setLanguage !== 'function') return;
    origSetLang = window.setLanguage;
    window.setLanguage = function(lang) {
      currentLang = lang;
      applySavedChanges();
      origSetLang.call(window, lang);
      if (editMode) {
        setTimeout(function() { makeEditable(); }, 100);
      }
    };
  }

  // ===== EDIT MODE =====
  function toggleEditMode() {
    editMode = !editMode;
    var toggle = document.querySelector('.ve-toggle');
    var toolbar = document.querySelector('.ve-toolbar');

    if (editMode) {
      toggle.classList.add('active');
      toggle.textContent = '\u2715';
      toggle.title = '关闭编辑模式';
      toolbar.classList.add('visible');
      document.body.classList.add('ve-toolbar-active', 've-editing');
      makeEditable();
      updateChangesCount();
      showToast('已进入编辑模式，点击文字即可修改', 'success');
    } else {
      toggle.classList.remove('active');
      toggle.textContent = '\u270E';
      toggle.title = '开启编辑模式';
      toolbar.classList.remove('visible');
      document.body.classList.remove('ve-toolbar-active', 've-editing');
      removeEditable();
      hideKeytip();
      closeSvgEditor();
      showToast('已退出编辑模式', 'success');
    }
  }

  function makeEditable() {
    document.querySelectorAll('[data-i18n]').forEach(function(el) {
      var tag = el.tagName.toLowerCase();
      if (tag === 'title') return;
      if (tag === 'text') {
        setupSvgTextEdit(el);
        return;
      }

      el.setAttribute('contenteditable', 'true');
      el.setAttribute('spellcheck', 'false');
      el.addEventListener('input', handleInput);
      el.addEventListener('blur', handleBlur);
      el.addEventListener('mouseenter', showKeytip);
      el.addEventListener('mouseleave', hideKeytip);

      var key = el.getAttribute('data-i18n');
      var changeKey = currentPage + '::' + key + '::' + currentLang;
      if (changes[changeKey]) {
        el.classList.add('ve-changed');
      }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el) {
      el.addEventListener('mouseenter', showKeytipPlaceholder);
      el.addEventListener('mouseleave', hideKeytip);
      el.addEventListener('dblclick', editPlaceholder);
    });
  }

  function removeEditable() {
    document.querySelectorAll('[data-i18n]').forEach(function(el) {
      el.removeAttribute('contenteditable');
      el.removeAttribute('spellcheck');
      el.removeEventListener('input', handleInput);
      el.removeEventListener('blur', handleBlur);
      el.removeEventListener('mouseenter', showKeytip);
      el.removeEventListener('mouseleave', hideKeytip);
      el.classList.remove('ve-changed');
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el) {
      el.removeEventListener('mouseenter', showKeytipPlaceholder);
      el.removeEventListener('mouseleave', hideKeytip);
      el.removeEventListener('dblclick', editPlaceholder);
    });
    document.querySelectorAll('svg text[data-i18n]').forEach(function(el) {
      el.style.cursor = '';
      el.style.fill = '';
      el.onclick = null;
    });
  }

  function handleInput(e) {
    var el = e.target;
    var key = el.getAttribute('data-i18n');
    if (!key) return;

    var origVal = getOriginalValue(key, currentLang);
    var useHtml = origVal && typeof origVal === 'string' && (origVal.indexOf('<br') >= 0 || origVal.indexOf('<em') >= 0 || origVal.indexOf('<strong') >= 0 || origVal.indexOf('<span') >= 0);
    var current = useHtml ? el.innerHTML : el.textContent;

    var changeKey = currentPage + '::' + key + '::' + currentLang;
    if (current !== origVal) {
      changes[changeKey] = current;
      setI18nValue(key, currentLang, current);
      el.classList.add('ve-changed');
    } else {
      delete changes[changeKey];
      el.classList.remove('ve-changed');
    }

    saveChanges();
    updateChangesCount();
    hasUnsaved = true;

    // Debounced save toast
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function() {
      if (hasUnsaved) {
        showToast('已自动保存', 'success');
        hasUnsaved = false;
      }
    }, 800);
  }

  function handleBlur(e) {
    // Ensure final save
    handleInput(e);
    clearTimeout(saveTimer);
    if (hasUnsaved) {
      showToast('已保存', 'success');
      hasUnsaved = false;
    }
  }

  // ===== SVG TEXT EDITING =====
  function setupSvgTextEdit(el) {
    el.style.cursor = 'pointer';
    el.style.fill = '#B8860B';
    el.addEventListener('click', function(e) {
      e.stopPropagation();
      openSvgEditor(el);
    });

    var key = el.getAttribute('data-i18n');
    var changeKey = currentPage + '::' + key + '::' + currentLang;
    if (changes[changeKey]) {
      el.style.fill = '#D4A84B';
    }
  }

  function openSvgEditor(svgTextEl) {
    var key = svgTextEl.getAttribute('data-i18n');
    if (!key) return;

    closeSvgEditor();

    var rect = svgTextEl.getBoundingClientRect();
    var origVal = getOriginalValue(key, currentLang) || svgTextEl.textContent;

    svgEditOverlay = document.createElement('div');
    svgEditOverlay.className = 've-svg-editor';
    svgEditOverlay.style.cssText = 'position:fixed;z-index:100005;background:#1A3C34;border:2px solid #B8860B;border-radius:8px;padding:8px;box-shadow:0 4px 16px rgba(0,0,0,0.4);font-family:sans-serif;';

    var top = rect.bottom + 8;
    var left = rect.left;
    if (top + 100 > window.innerHeight) top = rect.top - 80;
    if (left + 250 > window.innerWidth) left = window.innerWidth - 260;
    svgEditOverlay.style.top = top + 'px';
    svgEditOverlay.style.left = left + 'px';

    var label = document.createElement('div');
    label.style.cssText = 'color:#B8860B;font-size:11px;margin-bottom:4px;font-family:monospace;';
    label.textContent = key;
    svgEditOverlay.appendChild(label);

    var input = document.createElement('input');
    input.type = 'text';
    input.value = svgTextEl.textContent;
    input.style.cssText = 'width:220px;padding:6px 8px;border:1px solid rgba(184,134,11,0.5);border-radius:4px;background:#0D1F1A;color:#F5F0E8;font-size:14px;outline:none;';
    svgEditOverlay.appendChild(input);

    var btnRow = document.createElement('div');
    btnRow.style.cssText = 'margin-top:6px;display:flex;gap:6px;';

    var saveBtn = document.createElement('button');
    saveBtn.textContent = '\u4FDD\u5B58';
    saveBtn.style.cssText = 'padding:3px 12px;border-radius:4px;background:#B8860B;color:#fff;border:none;cursor:pointer;font-size:12px;';
    saveBtn.addEventListener('click', function() {
      var newVal = input.value;
      svgTextEl.textContent = newVal;
      var changeKey = currentPage + '::' + key + '::' + currentLang;
      if (newVal !== origVal) {
        changes[changeKey] = newVal;
        setI18nValue(key, currentLang, newVal);
        svgTextEl.style.fill = '#D4A84B';
      } else {
        delete changes[changeKey];
        svgTextEl.style.fill = '#B8860B';
      }
      saveChanges();
      updateChangesCount();
      closeSvgEditor();
      showToast('已保存', 'success');
    });

    var cancelBtn = document.createElement('button');
    cancelBtn.textContent = '\u53D6\u6D88';
    cancelBtn.style.cssText = 'padding:3px 12px;border-radius:4px;background:transparent;color:#F5F0E8;border:1px solid rgba(245,240,232,0.2);cursor:pointer;font-size:12px;';
    cancelBtn.addEventListener('click', closeSvgEditor);

    btnRow.appendChild(saveBtn);
    btnRow.appendChild(cancelBtn);
    svgEditOverlay.appendChild(btnRow);

    document.body.appendChild(svgEditOverlay);
    input.focus();
    input.select();

    setTimeout(function() {
      document.addEventListener('click', closeSvgEditorOutside);
    }, 100);
  }

  function closeSvgEditor() {
    if (svgEditOverlay) {
      svgEditOverlay.remove();
      svgEditOverlay = null;
    }
    document.removeEventListener('click', closeSvgEditorOutside);
  }

  function closeSvgEditorOutside(e) {
    if (svgEditOverlay && !svgEditOverlay.contains(e.target)) {
      closeSvgEditor();
    }
  }

  // ===== PLACEHOLDER EDITING =====
  function editPlaceholder(e) {
    var el = e.target;
    var key = el.getAttribute('data-i18n-placeholder');
    if (!key) return;

    var origVal = getOriginalValue(key, currentLang) || el.placeholder;
    var newVal = prompt('\u7F16\u8F91\u5360\u4F4D\u6587\u5B57 (' + key + '):', el.placeholder);
    if (newVal === null) return;

    el.placeholder = newVal;
    var changeKey = currentPage + '::' + key + '::' + currentLang;
    if (newVal !== origVal) {
      changes[changeKey] = newVal;
      setI18nValue(key, currentLang, newVal);
    } else {
      delete changes[changeKey];
    }
    saveChanges();
    updateChangesCount();
    showToast('已保存', 'success');
  }

  // ===== KEY TOOLTIP =====
  function showKeytip(e) {
    var el = e.target;
    var key = el.getAttribute('data-i18n');
    if (!key) return;

    if (!keytipEl) {
      keytipEl = document.createElement('div');
      keytipEl.className = 've-keytip';
      document.body.appendChild(keytipEl);
    }

    keytipEl.textContent = key;
    var rect = el.getBoundingClientRect();
    keytipEl.style.left = rect.left + 'px';
    keytipEl.style.top = (rect.top - 22) + 'px';
    keytipEl.style.display = 'block';
  }

  function showKeytipPlaceholder(e) {
    var el = e.target;
    var key = el.getAttribute('data-i18n-placeholder');
    if (!key) return;

    if (!keytipEl) {
      keytipEl = document.createElement('div');
      keytipEl.className = 've-keytip';
      document.body.appendChild(keytipEl);
    }

    keytipEl.textContent = key + ' (placeholder)';
    var rect = el.getBoundingClientRect();
    keytipEl.style.left = rect.left + 'px';
    keytipEl.style.top = (rect.top - 22) + 'px';
    keytipEl.style.display = 'block';
  }

  function hideKeytip() {
    if (keytipEl) keytipEl.style.display = 'none';
  }

  // ===== UI =====
  function createUI() {
    var toggle = document.createElement('button');
    toggle.className = 've-toggle';
    toggle.textContent = '\u270E';
    toggle.title = '\u5F00\u542F\u7F16\u8F91\u6A21\u5F0F';
    toggle.addEventListener('click', toggleEditMode);
    document.body.appendChild(toggle);

    var toolbar = document.createElement('div');
    toolbar.className = 've-toolbar';
    toolbar.innerHTML =
      '<span class="ve-brand">\u270E \u53EF\u89C6\u5316\u7F16\u8F91</span>' +
      '<div class="ve-sep"></div>' +
      '<label style="color:#F5F0E8;font-size:12px;white-space:nowrap">\u8BED\u8A00:</label>' +
      '<select class="ve-lang-sel">' +
        LANGS.map(function(l) {
          return '<option value="' + l + '"' + (l === currentLang ? ' selected' : '') + '>' + LANG_NAMES[l] + '</option>';
        }).join('') +
      '</select>' +
      '<div class="ve-sep"></div>' +
      '<span class="ve-count" style="white-space:nowrap">\u4FEE\u6539: <span class="ve-badge">0</span></span>' +
      '<div class="ve-sep ve-hide-mobile"></div>' +
      '<button class="ve-btn-gold" id="ve-export">\u5BFC\u51FA JSON</button>' +
      '<button class="ve-btn-red" id="ve-reset">\u91CD\u7F6E</button>';
    document.body.appendChild(toolbar);

    toolbar.querySelector('.ve-lang-sel').addEventListener('change', function(e) {
      if (typeof window.setLanguage === 'function') {
        window.setLanguage(e.target.value);
      }
    });
    document.getElementById('ve-export').addEventListener('click', exportJSON);
    document.getElementById('ve-reset').addEventListener('click', resetChanges);
  }

  function updateChangesCount() {
    var count = Object.keys(changes).filter(function(k) {
      return k.indexOf(currentPage + '::') === 0;
    }).length;
    var badge = document.querySelector('.ve-count .ve-badge');
    if (badge) badge.textContent = count;
  }

  // ===== EXPORT =====
  function exportJSON() {
    var grouped = {};
    Object.keys(changes).forEach(function(key) {
      var parts = key.split('::');
      var page = parts[0];
      var i18nKey = parts[1];
      var lang = parts[2];
      if (!grouped[page]) grouped[page] = {};
      if (!grouped[page][i18nKey]) grouped[page][i18nKey] = {};
      grouped[page][i18nKey][lang] = changes[key];
    });

    var json = JSON.stringify(grouped, null, 2);
    var blob = new Blob([json], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'hailanzu-edits-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('\u4FEE\u6539\u5DF2\u5BFC\u51FA\u4E3A JSON', 'success');
  }

  // ===== RESET =====
  function resetChanges() {
    var pageChanges = Object.keys(changes).filter(function(k) {
      return k.indexOf(currentPage + '::') === 0;
    });
    if (pageChanges.length === 0) {
      showToast('\u6CA1\u6709\u4FEE\u6539\u53EF\u91CD\u7F6E', 'error');
      return;
    }
    if (!confirm('\u786E\u5B9A\u91CD\u7F6E\u672C\u9875\u6240\u6709\u4FEE\u6539\uFF1F\u6B64\u64CD\u4F5C\u4E0D\u53EF\u64A4\u9500\u3002')) return;

    pageChanges.forEach(function(k) { delete changes[k]; });
    saveChanges();
    localStorage.removeItem(ORIGINALS_KEY);
    location.reload();
  }

  // ===== TOAST =====
  function showToast(msg, type) {
    // Remove existing toasts first
    document.querySelectorAll('.ve-toast').forEach(function(t) { t.remove(); });

    var toast = document.createElement('div');
    toast.className = 've-toast' + (type ? ' ve-' + type : '');
    toast.textContent = msg;
    document.body.appendChild(toast);
    requestAnimationFrame(function() { toast.classList.add('visible'); });
    setTimeout(function() {
      toast.classList.remove('visible');
      setTimeout(function() { toast.remove(); }, 300);
    }, 2000);
  }

  // ===== KEYBOARD SHORTCUTS =====
  document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.shiftKey && e.key === 'E') {
      e.preventDefault();
      toggleEditMode();
    }
    if (e.key === 'Escape' && editMode) {
      if (svgEditOverlay) {
        closeSvgEditor();
      } else {
        toggleEditMode();
      }
    }
  });

  // ===== PUBLIC API =====
  window.VE = {
    toggle: toggleEditMode,
    exportJSON: exportJSON,
    reset: resetChanges,
    getChanges: function() { return JSON.parse(JSON.stringify(changes)); },
    getOriginals: function() { return JSON.parse(JSON.stringify(originals)); }
  };

  // ===== BOOT =====
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
