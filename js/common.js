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
    if (overlay) { overlay.classList.add('open'); document.body.style.overflow = 'hidden'; }
  }
  window.openQR = openQR;
  
  function closeQR() {
    if (overlay) { overlay.classList.remove('open'); document.body.style.overflow = ''; }
  }
  
  // Nav social buttons
  document.querySelectorAll('.nav-social-btn[data-platform]').forEach(function(btn) {
    btn.addEventListener('click', function() { openQR(this.dataset.platform); });
  });
  
  // Footer social icons
  document.querySelectorAll('.footer-social-icon[data-platform]').forEach(function(icon) {
    icon.addEventListener('click', function() { openQR(this.dataset.platform); });
  });
  
  // Community cards
  document.querySelectorAll('.community-card[data-platform]').forEach(function(card) {
    card.addEventListener('click', function() { openQR(this.dataset.platform); });
  });
  
  // Close handlers
  if (popupClose) popupClose.addEventListener('click', closeQR);
  if (overlay) overlay.addEventListener('click', function(e) { if (e.target === overlay) closeQR(); });
  document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeQR(); });
  
  // ============ Floating CTA ============
  var floatingCta = document.getElementById('floatingCta');
  if (floatingCta) {
    var ctaDismissed = localStorage.getItem('hailanzu_cta_hidden');
    if (!ctaDismissed || Date.now() - parseInt(ctaDismissed) > 604800000) {
      setTimeout(function() { floatingCta.classList.add('visible'); }, 3000);
    }
    floatingCta.addEventListener('click', function() {
      var community = document.getElementById('community');
      if (community) community.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }
  
  // ============ Promo Bar ============
  var promoBar = document.getElementById('promoBar');
  if (promoBar) {
    var promoDismissed = localStorage.getItem('hailanzu_banner_dismissed');
    if (!promoDismissed || Date.now() - parseInt(promoDismissed) > 604800000) {
      setTimeout(function() { promoBar.classList.add('visible'); }, 5000);
    }
    var promoClose = document.getElementById('promoBarClose');
    if (promoClose) promoClose.addEventListener('click', function() {
      promoBar.classList.remove('visible');
      localStorage.setItem('hailanzu_banner_dismissed', Date.now().toString());
    });
    var promoBtn = document.getElementById('promoBarBtn');
    if (promoBtn) promoBtn.addEventListener('click', function() {
      var community = document.getElementById('community');
      if (community) community.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }
  
  // ============ Footer wechat-cs link ============
  document.querySelectorAll('[data-pending="wechat-cs"]').forEach(function(el) {
    el.addEventListener('click', function() { openQR('wechat-work'); });
  });
});
