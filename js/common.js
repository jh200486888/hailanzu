// ============ HAILANZU common.js ============
// 只包含：字体按需加载 + 营销模块
// 不包含 setLanguage / nav / scroll / 语言检测 / currentLang（由各页面自己管理）

// ============ 字体按需加载 ============
(function() {
  var _langFontLoaded = { ko: false, ja: false };
  
  function loadLanguageFont(lang) {
    var id = 'dyn-lang-font';
    var existing = document.getElementById(id);
    
    if (lang === 'ko' && !_langFontLoaded.ko) {
      if (existing) existing.remove();
      var link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;700&family=Noto+Sans+KR:wght@400;700&display=swap';
      document.head.appendChild(link);
      _langFontLoaded.ko = true;
    } else if (lang === 'ja' && !_langFontLoaded.ja) {
      if (existing) existing.remove();
      var link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@400;700&family=Noto+Sans+JP:wght@400;700&display=swap';
      document.head.appendChild(link);
      _langFontLoaded.ja = true;
    }
  }
  
  window.loadLanguageFont = loadLanguageFont;
})();

// ============ MARKETING MODULE (waits for DOM) ============
document.addEventListener('DOMContentLoaded', function(){

  var overlay = document.getElementById('qrOverlay');
  var popup = document.getElementById('qrPopup');
  var popupTitle = document.getElementById('qrPopupTitle');
  var popupHint = document.getElementById('qrPopupHint');
  var popupClose = document.getElementById('qrPopupClose');
  
  var pInfo = {
    'wechat-work': { t:{zh:'企业微信',ko:'기업 위챗',en:'WeChat Work',ja:'企業WeChat'}, h:{zh:'扫码加入海兰菹社群',ko:'스캔하여 해란저 커뮤니티 가입',en:'Scan to join HAILANZU community',ja:'スキャンして海蘭菹コミュ니ティに参加'} },
    'official': { t:{zh:'公众号',ko:'공식 계정',en:'Official Account',ja:'公式アカウント'}, h:{zh:'扫码关注海兰菹',ko:'스캔하여 해란저 팔로우',en:'Scan to follow HAILANZU',ja:'スキャンして海蘭菹をフォロー'} }
  };
  
  function getLang() {
    return window.currentLang || 'zh';
  }
  
  function openQR(platform) {
    var info = pInfo[platform];
    if (!info) return;
    var lang = getLang();
    if (popupTitle) popupTitle.textContent = info.t[lang] || info.t.zh;
    if (popupHint) popupHint.textContent = info.h[lang] || info.h.zh;
    if (overlay) { overlay.classList.add('open'); document.documentElement.style.overflow = 'hidden'; document.body.style.overflow = 'hidden'; }
  }
  window.openQR = openQR;
  
  function closeQR() {
    if (overlay) { overlay.classList.remove('open'); document.documentElement.style.overflow = ''; document.body.style.overflow = ''; document.body.style.touchAction = ''; }
  }
  
  // Footer social icons
  document.querySelectorAll('.footer-social-icon[data-platform]').forEach(function(icon) {
    icon.addEventListener('click', function() { openQR(this.dataset.platform); });
  });
  
  // Community cards
  document.querySelectorAll('.community-action-btn[data-platform]').forEach(function(card) {
    card.addEventListener('click', function() { openQR(this.dataset.platform); });
  });
  
  // Close handlers
  if (popupClose) popupClose.addEventListener('click', closeQR);
  if (overlay) overlay.addEventListener('click', function(e) { if (e.target === overlay) closeQR(); });
  document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeQR(); });
  
  // ============ Floating CTA ============
  var floatingCta = document.getElementById('floatingCta');
  if (floatingCta) {
    var ctaDismissed = localStorage.getItem('hailanzu_cta_dismissed');
    if (!ctaDismissed || Date.now() - parseInt(ctaDismissed) > 604800000) {
      setTimeout(function() { floatingCta.classList.add('visible'); }, 2000);
    }
    floatingCta.addEventListener('click', function() {
      if (typeof openQR === 'function') { openQR('wechat-work'); }
      else { var community = document.getElementById('community'); if (community) community.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    });
  }
  
  // ============ Footer wechat-cs link ============
  document.querySelectorAll('[data-pending="wechat-cs"]').forEach(function(el) {
    el.addEventListener('click', function() { openQR('wechat-work'); });
  });
});

// ============ Deep Link: Open App on Mobile ============
document.addEventListener('DOMContentLoaded', function() {
  function openAppOrWeb(scheme, webUrl, e) {
    var isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (!isMobile) return;

    if (e) e.preventDefault();

    var startTime = Date.now();
    var hidden = false;

    function onVis() {
      if (document.hidden || document.webkitHidden) hidden = true;
    }
    document.addEventListener('visibilitychange', onVis);
    document.addEventListener('webkitvisibilitychange', onVis);

    var iframe = document.createElement('iframe');
    iframe.style.cssText = 'display:none;width:0;height:0;border:none;';
    iframe.src = scheme;
    document.body.appendChild(iframe);

    setTimeout(function() {
      document.removeEventListener('visibilitychange', onVis);
      document.removeEventListener('webkitvisibilitychange', onVis);
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      if (!hidden) window.location.href = webUrl;
    }, 2000);
  }

  // Xiaohongshu
  document.querySelectorAll('[data-app="xhs"]').forEach(function(el) {
    el.addEventListener('click', function(e) {
      var webUrl = this.href;
      var scheme = 'xhsdiscover://search/result?keyword=' + encodeURIComponent('\u6D77\u5170\u83F9');
      openAppOrWeb(scheme, webUrl, e);
    });
  });

  // Douyin
  document.querySelectorAll('[data-pending="douyin"]').forEach(function(el) {
    el.addEventListener('click', function(e) {
      e.preventDefault();
      var isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (isMobile) {
        openAppOrWeb('snssdk1128://search/result?keyword=' + encodeURIComponent('\u6D77\u5170\u83F9'), 'https://www.douyin.com/search/%E6%B5%B7%E5%85%B0%E8%8F%B9', e);
      } else {
        window.open('https://www.douyin.com/search/%E6%B5%B7%E5%85%B0%E8%8F%B9', '_blank');
      }
    });
  });
});