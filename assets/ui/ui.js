/* Smart PAC Ultra UI Kit Pro v3.4.0 */
const $root = document.getElementById('app');
const VIEW = ($root && $root.dataset.view) || (document.body.classList.contains('popup') ? 'popup' : 'app');
let state = null;
let activePopupTab = 'profile';
let lastTestResult = null;
let lastUpdateResult = null;

const MODES = [
  ['direct','مستقیم','send'],
  ['proxy','پروکسی','globe'],
  ['pac','PAC','file'],
  ['system','پروکسی سیستم','monitor'],
  ['smart','هوشمند','bot']
];
const PROXY_TYPES = ['HTTP','HTTPS','SOCKS4','SOCKS5','MTPROTO'];

function icon(name){
  const i = {
    logo:`<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="currentColor" opacity=".16" d="M24 3 42 13v22L24 45 6 35V13L24 3Z"/><path fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" d="M34 16 24 10 14 16v7l20 10v-7L14 16M14 32l10 6 10-6"/></svg>`,
    send:`<svg viewBox="0 0 24 24"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4 20-7Z"/></svg>`,
    globe:`<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>`,
    file:`<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h6"/></svg>`,
    monitor:`<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg>`,
    bot:`<svg viewBox="0 0 24 24"><rect x="5" y="7" width="14" height="12" rx="3"/><path d="M12 7V4M9 4h6M8.5 12h.01M15.5 12h.01M9 16h6"/></svg>`,
    user:`<svg viewBox="0 0 24 24"><path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/></svg>`,
    shield:`<svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>`,
    layers:`<svg viewBox="0 0 24 24"><path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 17l9 5 9-5"/></svg>`,
    list:`<svg viewBox="0 0 24 24"><path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/></svg>`,
    plus:`<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>`,
    copy:`<svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><rect x="2" y="2" width="13" height="13" rx="2"/></svg>`,
    trash:`<svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M6 6l1 16h10l1-16M10 11v6M14 11v6"/></svg>`,
    settings:`<svg viewBox="0 0 24 24"><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6V20a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-.6 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1H4a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 .6-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6c.34-.13.55-.35.6-.6V4a2 2 0 1 1 4 0v.1c.05.25.26.47.6.6a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.13.34.35.55.6.6h.1a2 2 0 1 1 0 4h-.1c-.25.05-.47.26-.6.6Z"/></svg>`,
    expand:`<svg viewBox="0 0 24 24"><path d="M15 3h6v6M21 3l-7 7M9 21H3v-6M3 21l7-7"/></svg>`,
    power:`<svg viewBox="0 0 24 24"><path d="M12 2v10"/><path d="M18.4 6.6a9 9 0 1 1-12.8 0"/></svg>`,
    warning:`<svg viewBox="0 0 24 24"><path d="M12 3 22 20H2L12 3Z"/><path d="M12 9v5M12 17h.01"/></svg>`,
    check:`<svg viewBox="0 0 24 24"><path d="m20 6-11 11-5-5"/></svg>`,
    import:`<svg viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 21h16"/></svg>`,
    export:`<svg viewBox="0 0 24 24"><path d="M12 15V3M7 8l5-5 5 5"/><path d="M4 21h16"/></svg>`,
    download:`<svg viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/></svg>`,
    rocket:`<svg viewBox="0 0 24 24"><path d="M5 14c-2 2-2 5-2 5s3 0 5-2"/><path d="M14 5c3-3 7-2 7-2s1 4-2 7l-8 8-5-5 8-8Z"/><path d="M15 9h.01"/></svg>`,
    reset:`<svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v6h6"/></svg>`,
    diag:`<svg viewBox="0 0 24 24"><path d="M8 3v5a4 4 0 0 0 8 0V3"/><path d="M12 12v3a4 4 0 0 1-8 0v-2M20 13v2a4 4 0 0 1-8 0"/><path d="M6 3v4M18 3v4"/></svg>`,
    info:`<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>`,
    pin:`<svg viewBox="0 0 24 24"><path d="m14 4 6 6-4 1-5 5-3-3 5-5 1-4Z"/><path d="m8 16-4 4"/></svg>`,
    chart:`<svg viewBox="0 0 24 24"><path d="M4 19V5M4 19h16"/><path d="M8 16v-5M12 16V8M16 16v-8"/></svg>`,
    close:`<svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>`
  };
  return i[name] || i.info;
}
function esc(s){return String(s ?? '').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}
function msg(payload){return chrome.runtime.sendMessage(payload);} 
function listToText(list){return (list||[]).join('\n');}
function textToList(text){return String(text||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);} 
function getSettings(){return state.settings || {};}
function getProfile(){return state.activeProfile || {};} 
function effective(){return state.effectiveLists || {};}
function currentSuggestion(){const s=getSettings();return s.suggestions && s.suggestions.length ? s.suggestions[0] : null;}
function modeLabel(mode){return ({direct:'مستقیم کامل',proxy:'پروکسی کامل',pac:'PAC',system:'پروکسی سیستم',smart:'هوشمند'}[mode]||'هوشمند');}
function currentVersion(){return (state && state.extensionVersion) || chrome.runtime.getManifest().version || '3.4.0';}
function renderTestResult(){
  if(!lastTestResult) return '<div id="testResult" class="popup-test-result stable"><div class="result-placeholder">نتیجه تست اتصال اینجا نمایش داده می‌شود.</div></div>';
  const r=lastTestResult;
  return `<div id="testResult" class="popup-test-result stable">${r.ok?`<div class="result-box compact success">${icon('check')} اتصال موفق بود · ${r.ms||0}ms</div>`:`<div class="result-box compact err">${icon('warning')} اتصال ناموفق بود: ${esc(r.error||'خطا')}</div>`}</div>`;
}
function renderUpdateResult(){
  if(!lastUpdateResult) return '<div id="updateResult" class="update-result muted">برای دریافت آخرین نسخه، بررسی آپدیت را بزنید.</div>';
  const r=lastUpdateResult;
  if(!r.ok) return `<div id="updateResult" class="update-result err">${icon('warning')} خطا در بررسی آپدیت: ${esc(r.error||'نامشخص')}</div>`;
  if(r.updateAvailable) return `<div id="updateResult" class="update-result warn">${icon('download')} نسخه ${esc(r.latestVersion)} آماده است. <a href="${esc(r.htmlUrl)}" target="_blank">مشاهده Release</a></div>`;
  return `<div id="updateResult" class="update-result ok">${icon('check')} نسخه فعلی به‌روز است. v${esc(r.currentVersion)}</div>`;
}

async function load(){
  try{ state = await msg({type:'getState'}); if(!state || !state.ok) throw new Error(state && state.error || 'خطا در بارگذاری'); render(); }
  catch(e){ $root.innerHTML = `<div class="notice" style="margin:16px">خطا در اجرای افزونه: ${esc(e.message||e)}</div>`; }
}
function render(){ $root.innerHTML = VIEW==='popup' ? renderPopup() : renderApp(); bind(); }
function renderTopbar(){
  const s=getSettings();
  return `<div class="topbar fade-in">
    <div class="brand"><div class="brand-mark">${icon('logo')}</div><div class="brand-text"><h1>Smart PAC Ultra</h1><small>مدیریت ساده، سریع و هوشمند اتصال · v${esc(currentVersion())}</small></div></div>
    <div class="top-actions">
      ${VIEW==='popup'?`<button class="icon-btn" data-action="openApp" title="نمایش تمام‌صفحه">${icon('expand')}</button>`:''}
      <button class="icon-btn" data-action="toggleEnabled" title="${s.enabled?'خاموش کردن':'فعال کردن'}">${icon('power')}</button>
    </div>
  </div>`;
}
function renderModes(){const s=getSettings();return `<div class="modebar fade-in">${MODES.map(([k,l,ic])=>`<button class="mode-btn ${s.enabled&&s.connectionMode===k?'active':''}" data-mode="${k}">${icon(ic)}<span>${l}</span><span class="tick">${icon('check')}</span></button>`).join('')}</div>`;}
function renderPopup(){
  const s=getSettings(), p=getProfile(), l=effective(), sug=currentSuggestion();
  return `${renderTopbar()}${renderModes()}<section class="popup-stage fade-in">${renderPopupPane(activePopupTab,s,p,l,sug)}</section>${renderPopupNav()}`;
}
function renderPopupNav(){
  const tabs=[['profile','user','پروفایل'],['settings','settings','تنظیمات'],['report','chart','گزارش'],['quick','pin','سریع']];
  return `<nav class="bottom-nav">${tabs.map(([key,ic,label])=>`<button class="nav-btn ${activePopupTab===key?'active':''}" data-popup-tab="${key}" title="${label}">${icon(ic)} ${label}</button>`).join('')}</nav>`;
}
function renderPopupPane(tab,s,p,l,sug){
  if(tab==='settings') return renderPopupSettings(s,p,l);
  if(tab==='report') return renderPopupReport(s,p,l,sug);
  if(tab==='quick') return renderPopupQuick(s,p,l,sug);
  return renderPopupProfile(s,p,l,sug);
}
function renderPopupProfile(s,p,l,sug){
  return `<div class="hero-status ${s.enabled?'':'off'}"><div class="hero-ico">${icon(s.enabled?'shield':'power')}</div><div><b>${s.enabled?`اتصال ${modeLabel(s.connectionMode)} فعال است`:'افزونه خاموش است'} ${s.enabled?'<span class="dot"></span>':''}</b><small>${s.enabled?'اتصال شما پایدار و قابل کنترل است.':'برای فعال‌سازی، حالت اتصال را انتخاب کنید.'}</small></div></div>
    <div class="stat-row">
      <div class="mini-stat">${icon('user')}<b>پروفایل</b><small>${esc(p.name||'پیش‌فرض')}</small></div>
      <div class="mini-stat good">${icon('shield')}<b>وضعیت</b><small>${s.enabled?'فعال':'خاموش'}</small></div>
      <div class="mini-stat">${icon('layers')}<b>پروکسی</b><small>${(l.proxyDomains||[]).length} دامنه</small></div>
      <div class="mini-stat">${icon('list')}<b>مستقیم</b><small>${(l.directDomains||[]).length} دامنه</small></div>
    </div>
    ${sug?renderPopupSuggestion(sug):renderEmptySuggestion()}
    <div class="quick-card"><div><b>${esc(p.name||'پیش‌فرض')}</b><small>${esc(p.proxyType||'SOCKS5')} · ${p.listMode==='profile'?'لیست اختصاصی':'لیست مشترک'}</small></div><button class="soft-btn btn-sm" data-action="openApp">مدیریت پروفایل‌ها</button></div>
    <div class="compact-actions"><button class="soft-btn btn-block" data-action="addTabProxy">${icon('plus')} سایت فعلی با پروکسی</button><button class="soft-btn btn-block" data-action="addTabDirect">${icon('send')} سایت فعلی مستقیم</button></div>`;
}
function renderPopupSettings(s,p,l){
  const pt=String(p.proxyType||'SOCKS5').toUpperCase();
  return `<div class="popup-tab-head"><div>${icon('settings')}<b>تنظیمات سریع پروکسی</b></div><span class="badge blue">${esc(pt)}</span></div>
    <div class="popup-card compact-form settings-card-pro">
      <label>نوع پروکسی</label>
      <div class="chips popup-chips">${PROXY_TYPES.map(t=>`<button class="chip ${pt===t?'active':''}" data-proxy-type="${t}">${t==='MTPROTO'?'MTProto':t}</button>`).join('')}</div>
      <div class="form-grid popup-two"><div class="form-row compact"><label>آدرس سرور</label><input id="proxyHost" class="ltr" value="${esc(p.host||'')}" placeholder="127.0.0.1"></div><div class="form-row compact"><label>پورت</label><input id="proxyPort" class="ltr" type="number" min="1" max="65535" value="${esc(p.port||10808)}"></div></div>
      <div class="form-row compact"><label>نام پروفایل</label><input id="profileName" value="${esc(p.name||'')}" placeholder="پیش‌فرض"></div>
      <input id="proxyUser" type="hidden" value="${esc(p.username||'')}"><input id="proxyPass" type="hidden" value="${esc(p.password||'')}">
      <div class="popup-listmode"><label class="option-card ${p.listMode!=='profile'?'active':''}"><input type="radio" name="listMode" value="global" ${p.listMode!=='profile'?'checked':''}><span><b>لیست مشترک</b><small>ساده‌تر برای همه پروفایل‌ها</small></span></label><label class="option-card ${p.listMode==='profile'?'active':''}"><input type="radio" name="listMode" value="profile" ${p.listMode==='profile'?'checked':''}><span><b>لیست اختصاصی</b><small>قوانین جدا برای این پروفایل</small></span></label></div>
      ${renderTestResult()}
      <div class="compact-actions action-pin"><button class="soft-btn btn-block" data-action="testProxy">${icon('diag')} تست اتصال</button><button class="primary-btn btn-block" data-action="saveProfile">${icon('check')} ذخیره و اعمال</button></div>
    </div>`;
}
function renderPopupReport(s,p,l,sug){
  const logs=(s.logs||[]).slice(0,3);
  return `<div class="popup-tab-head"><div>${icon('chart')}<b>گزارش و وضعیت</b></div><button class="soft-btn btn-sm" data-action="clearLogs">پاکسازی</button></div>
    <div class="stat-row report-stats"><div class="mini-stat good">${icon('shield')}<b>حالت</b><small>${s.enabled?modeLabel(s.connectionMode):'خاموش'}</small></div><div class="mini-stat">${icon('layers')}<b>پروکسی</b><small>${(l.proxyDomains||[]).length}</small></div><div class="mini-stat">${icon('list')}<b>مستقیم</b><small>${(l.directDomains||[]).length}</small></div><div class="mini-stat">${icon('warning')}<b>پیشنهاد</b><small>${(s.suggestions||[]).length}</small></div></div>
    <div class="popup-card log-list">${logs.length?logs.map(log=>`<div class="log-item"><span class="badge ${log.type==='error'?'amber':'blue'}">${esc(log.type||'log')}</span><div><b>${esc(log.message||'رویداد')}</b><small>${log.extra&&log.extra.host?esc(log.extra.host):new Date(log.ts||Date.now()).toLocaleTimeString('fa-IR')}</small></div></div>`).join(''):`<div class="notice small-notice">${icon('info')} هنوز گزارشی ثبت نشده است.</div>`}</div>
    ${sug?renderPopupSuggestion(sug):`<div class="notice small-notice">${icon('bot')} پیشنهاد هوشمند آماده است.</div>`}`;
}
function renderPopupQuick(s,p,l,sug){
  return `<div class="popup-tab-head"><div>${icon('pin')}<b>اقدام‌های سریع</b></div><span class="badge blue">v${esc(currentVersion())}</span></div>
    ${sug?renderPopupSuggestion(sug):renderEmptySuggestion()}
    <div class="popup-card quick-grid">
      <button class="soft-btn btn-block" data-action="addTabProxy">${icon('plus')} سایت فعلی با پروکسی</button>
      <button class="soft-btn btn-block" data-action="addTabDirect">${icon('send')} سایت فعلی مستقیم</button>
      <button class="soft-btn btn-block" data-action="checkUpdate">${icon('download')} بررسی آپدیت</button>
      <button class="soft-btn btn-block" data-action="copyPac">${icon('file')} کپی PAC</button>
      <button class="soft-btn btn-block" data-action="exportSettings">${icon('export')} خروجی تنظیمات</button>
      <button class="soft-btn btn-block" data-action="importSettings">${icon('import')} ورود تنظیمات</button>
      <button class="danger-btn btn-block" data-action="resetAll">${icon('reset')} بازنشانی</button>
      <button class="soft-btn btn-block" data-action="openApp">${icon('expand')} پنل کامل</button>
    </div>
    ${renderUpdateResult()}`;
}
function renderPopupSuggestion(sug){return `<div class="suggestion-card"><div class="suggestion-title"><span>${icon('warning')} پیشنهاد هوشمند</span><span class="badge amber">تست سریع</span></div><div class="suggestion-text">این سایت باز نشده است. می‌توانید فقط با یک کلیک آن را با پروکسی تست کنید.</div><div class="domain-pill">${icon('globe')}<b dir="ltr">${esc(sug.host)}</b></div><div class="suggestion-actions"><button class="soft-btn btn-sm" data-action="ignoreSuggestion" data-host="${esc(sug.host)}">نه، فعلاً</button><button class="primary-btn btn-sm" data-action="acceptSuggestion" data-host="${esc(sug.host)}">با پروکسی تست شود</button></div></div>`;}
function renderEmptySuggestion(){return `<div class="empty-suggestion">${icon('bot')}<div><b>پیشنهاد هوشمند آماده است</b><br><small>اگر سایتی باز نشود، اینجا راه‌حل ساده نمایش داده می‌شود.</small></div></div>`;}
function renderApp(){
  const s=getSettings(), p=getProfile(), l=effective();
  return `${renderTopbar()}${renderModes()}${renderAppStats(s,p,l)}<div class="dashboard-grid fade-in">${renderProfilesPanel(s,p)}${renderProxyPanel(p)}${renderListsPanel(s,p)}</div>${renderTools()}${renderStateStrip()}`;
}
function renderAppStats(s,p,l){return `<div class="app-stats fade-in">
  <div class="stat-card"><div class="sico">${icon('user')}</div><div><b>پروفایل فعال</b><small>${esc(p.name||'پیش‌فرض')}</small></div></div>
  <div class="stat-card ${s.enabled?'good':''}"><div class="sico">${icon(s.enabled?'shield':'power')}</div><div><b>وضعیت اتصال</b><small>${s.enabled?modeLabel(s.connectionMode):'خاموش'}</small></div></div>
  <div class="stat-card"><div class="sico">${icon('layers')}</div><div><b>قواعد پروکسی</b><small>${(l.proxyDomains||[]).length} دامنه</small></div></div>
  <div class="stat-card"><div class="sico">${icon('list')}</div><div><b>قواعد مستقیم</b><small>${(l.directDomains||[]).length} دامنه</small></div></div>
</div>`;}
function renderProfilesPanel(s,p){return `<section class="panel profiles-panel"><div class="panel-head"><div class="panel-title">${icon('user')} پروفایل‌ها</div><button class="soft-btn btn-sm" data-action="addProfile">${icon('plus')} افزودن</button></div><div class="panel-body"><div class="profile-list">${(s.profiles||[]).map(item=>`<div class="profile-item ${item.id===p.id?'active':''}"><div><div class="profile-name">${esc(item.name)}</div><div class="profile-meta">${esc(item.proxyType||'SOCKS5')} · ${item.listMode==='profile'?'لیست اختصاصی':'لیست مشترک'}</div></div>${item.id===p.id?'<span class="badge">فعال</span>':`<button class="soft-btn btn-sm" data-select-profile="${esc(item.id)}">انتخاب</button>`}</div>`).join('')}</div><div class="actions-row" style="margin-top:10px"><button class="soft-btn btn-sm" data-action="copyProfile">${icon('copy')} کپی</button><button class="danger-btn btn-sm" data-action="deleteProfile">${icon('trash')} حذف</button></div></div></section>`;}
function renderProxyPanel(p){const pt=String(p.proxyType||'SOCKS5').toUpperCase();return `<section class="panel proxy-panel"><div class="panel-head"><div class="panel-title">${icon('globe')} تنظیمات پروکسی</div><span class="badge blue">${esc(pt)}</span></div><div class="panel-body"><div class="form-row"><label>نوع پروکسی</label><div class="chips">${PROXY_TYPES.map(t=>`<button class="chip ${pt===t?'active':''}" data-proxy-type="${t}">${t==='MTPROTO'?'MTProto Bridge':t}</button>`).join('')}</div></div><div class="form-row"><label>نام پروفایل</label><input id="profileName" value="${esc(p.name||'')}" placeholder="مثلاً سرور آلمان"></div><div class="form-grid"><div class="form-row"><label>آدرس سرور</label><input id="proxyHost" class="ltr" value="${esc(p.host||'')}" placeholder="127.0.0.1"></div><div class="form-row"><label>پورت</label><input id="proxyPort" class="ltr" type="number" min="1" max="65535" value="${esc(p.port||10808)}"></div></div><div class="form-grid two"><div class="form-row"><label>نام کاربری اختیاری</label><input id="proxyUser" class="ltr" value="${esc(p.username||'')}"></div><div class="form-row"><label>رمز عبور اختیاری</label><input id="proxyPass" class="ltr" type="password" value="${esc(p.password||'')}"></div></div><div class="form-row"><label>حالت لیست‌ها برای این پروفایل</label><div class="option-stack"><label class="option-card ${p.listMode!=='profile'?'active':''}"><input type="radio" name="listMode" value="global" ${p.listMode!=='profile'?'checked':''}><span><b>لیست مشترک عمومی</b><small>برای کاربران مبتدی؛ همه پروفایل‌ها از یک لیست استفاده می‌کنند.</small></span></label><label class="option-card ${p.listMode==='profile'?'active':''}"><input type="radio" name="listMode" value="profile" ${p.listMode==='profile'?'checked':''}><span><b>لیست اختصاصی هر پروفایل</b><small>برای کاربران حرفه‌ای؛ قوانین هر پروفایل جدا می‌شود.</small></span></label></div></div><div class="actions-row"><button class="primary-btn" data-action="saveProfile">${icon('check')} ذخیره و اعمال</button><button class="soft-btn" data-action="testProxy">${icon('diag')} تست اتصال</button></div><div id="testResult"></div></div></section>`;}
function renderListsPanel(s,p){const sug=currentSuggestion(); const proxyList=p.listMode==='profile'?(p.lists&&p.lists.proxyDomains||[]):(s.globalLists&&s.globalLists.proxyDomains||[]); const directList=p.listMode==='profile'?(p.lists&&p.lists.directDomains||[]):(s.globalLists&&s.globalLists.directDomains||[]);return `<section class="panel lists-panel"><div class="panel-head"><div class="panel-title">${icon('list')} لیست‌ها و پیشنهادها</div></div><div class="panel-body">${sug?`<div class="suggestion-panel"><div class="head"><span>${icon('warning')} پیشنهاد هوشمند</span><button class="icon-btn btn-sm" data-action="clearSuggestions">${icon('close')}</button></div><div>سایت زیر باز نشده است. می‌خواهید به لیست پروکسی اضافه شود؟</div><div class="domain-pill"><b dir="ltr">${esc(sug.host)}</b></div><div class="actions-row"><button class="primary-btn btn-sm" data-action="acceptSuggestion" data-host="${esc(sug.host)}">افزودن به پروکسی</button><button class="soft-btn btn-sm" data-action="ignoreSuggestion" data-host="${esc(sug.host)}">فعلاً نه</button></div></div>`:`<div class="notice">${icon('info')} اگر سایتی در حالت هوشمند باز نشود، پیشنهاد تست با پروکسی اینجا نمایش داده می‌شود.</div>`}<div class="hr"></div><div class="form-row"><label>لیست پروکسی ${p.listMode==='profile'?'این پروفایل':'مشترک'}</label><textarea id="proxyDomains" class="mono ltr" placeholder="example.com&#10;.example.org">${esc(listToText(proxyList))}</textarea></div><div class="form-row"><label>لیست مستقیم ${p.listMode==='profile'?'این پروفایل':'مشترک'}</label><textarea id="directDomains" class="mono ltr" placeholder="localhost&#10;127.0.0.1&#10;.ir">${esc(listToText(directList))}</textarea></div><div class="actions-row"><button class="primary-btn" data-action="saveLists">${icon('check')} ذخیره لیست‌ها</button><button class="soft-btn" data-action="addTabProxy">${icon('plus')} سایت فعلی با پروکسی</button><button class="soft-btn" data-action="addTabDirect">${icon('send')} سایت فعلی مستقیم</button></div></div></section>`;}
function renderTools(){return `<div class="tools-grid fade-in"><button class="tool-tile" data-action="exportSettings">${icon('export')}<span>برون‌بری تنظیمات<small>ذخیره فایل JSON</small></span></button><button class="tool-tile" data-action="importSettings">${icon('import')}<span>درون‌ریزی تنظیمات<small>از فایل JSON</small></span></button><button class="tool-tile" data-action="copyPac">${icon('file')}<span>کپی PAC<small>برای بررسی دستی</small></span></button><button class="tool-tile" data-action="resetAll">${icon('reset')}<span>بازنشانی<small>حالت پیش‌فرض</small></span></button><button class="tool-tile" data-action="checkUpdate">${icon('download')}<span>بررسی آپدیت<small>GitHub Releases</small></span></button></div>`;}
function renderStateStrip(){return `<div class="state-strip fade-in">${[['direct','send','مستقیم'],['proxy','globe','پروکسی'],['pac','file','PAC'],['system','monitor','سیستم'],['smart','bot','هوشمند'],['error','warning','خطا'],['off','power','خاموش']].map(([c,ic,l])=>`<div class="state-icon ${c}"><div class="circle">${icon(ic)}</div><small>${l}</small></div>`).join('')}</div>`;}

function currentProfilePatch(){const p=getProfile();return {...p,name:document.getElementById('profileName')?.value||p.name,host:document.getElementById('proxyHost')?.value||p.host,port:parseInt(document.getElementById('proxyPort')?.value||p.port||10808,10),username:document.getElementById('proxyUser')?.value||'',password:document.getElementById('proxyPass')?.value||'',listMode:document.querySelector('input[name="listMode"]:checked')?.value||p.listMode||'global'};}
async function saveProfile(){const profile=currentProfilePatch(); await msg({type:'updateProfile',profile}); await load();}
async function saveLists(){const s=getSettings(); const p={...currentProfilePatch()}; const proxy=textToList(document.getElementById('proxyDomains')?.value); const direct=textToList(document.getElementById('directDomains')?.value); if(p.listMode==='profile'){p.lists={...(p.lists||{}),proxyDomains:proxy,directDomains:direct}; await msg({type:'updateProfile',profile:p});}else{const settings=structuredClone(s); settings.globalLists=settings.globalLists||{}; settings.globalLists.proxyDomains=proxy; settings.globalLists.directDomains=direct; await msg({type:'setSettings',settings});} await load();}
function bind(){
  document.querySelectorAll('[data-popup-tab]').forEach(b=>b.addEventListener('click',()=>{activePopupTab=b.dataset.popupTab||'profile'; render();}));
  document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',async()=>{await msg({type:'setMode',mode:b.dataset.mode});await load();}));
  document.querySelectorAll('[data-proxy-type]').forEach(b=>b.addEventListener('click',async()=>{const p=currentProfilePatch(); p.proxyType=b.dataset.proxyType; await msg({type:'updateProfile',profile:p}); await load();}));
  document.querySelectorAll('[data-select-profile]').forEach(b=>b.addEventListener('click',async()=>{await msg({type:'setActiveProfile',id:b.dataset.selectProfile});await load();}));
  document.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('click',async()=>{
    const a=b.dataset.action; const s=getSettings(); const p=getProfile(); const host=b.dataset.host || (state.currentTab&&state.currentTab.host) || '';
    try{
      if(a==='openApp') await chrome.tabs.create({url:chrome.runtime.getURL('app.html')});
      if(a==='toggleEnabled'){await msg({type:'toggleEnabled',enabled:!s.enabled});await load();}
      if(a==='saveProfile') await saveProfile();
      if(a==='saveLists') await saveLists();
      if(a==='addProfile'){await msg({type:'addProfile',name:'پروفایل جدید'});await load();}
      if(a==='copyProfile'){await msg({type:'copyProfile'});await load();}
      if(a==='deleteProfile'){if(confirm('این پروفایل حذف شود؟')){await msg({type:'deleteProfile',id:p.id});await load();}}
      if(a==='addTabProxy' && host){await msg({type:'addCurrentSiteToProxy',host});await load();}
      if(a==='addTabDirect' && host){await msg({type:'addCurrentSiteToDirect',host});await load();}
      if(a==='acceptSuggestion' && host){await msg({type:'addCurrentSiteToProxy',host});await load();}
      if(a==='ignoreSuggestion' && host){await msg({type:'ignoreSuggestion',host});await load();}
      if(a==='clearSuggestions'){await msg({type:'clearSuggestions'});await load();}
      if(a==='clearLogs'){await msg({type:'clearLogs'});await load();}
      if(a==='testProxy') await testProxyUI();
      if(a==='checkUpdate') await checkUpdateUI();
      if(a==='copyPac') await copyPac();
      if(a==='exportSettings') exportSettings();
      if(a==='importSettings') importSettings();
      if(a==='resetAll'){if(confirm('همه تنظیمات به حالت پیش‌فرض برگردد؟')){await msg({type:'resetAll'});await load();}}
    }catch(e){alert('خطا: '+(e.message||e));}
  }));
}
async function testProxyUI(){
  const box=document.getElementById('testResult');
  if(box) box.innerHTML='<div class="result-box compact">در حال تست اتصال...</div>';
  try{ await saveProfileNoReload(); }catch(e){}
  const res=await msg({type:'testProxy'});
  lastTestResult=res;
  const html=res.ok?`<div class="result-box compact success">${icon('check')} اتصال موفق بود · ${res.ms}ms</div>`:`<div class="result-box compact err">${icon('warning')} اتصال ناموفق بود: ${esc(res.error||'خطا')}</div>`;
  const target=document.getElementById('testResult');
  if(target){ target.innerHTML=html; target.classList.add('visible'); target.scrollIntoView({block:'nearest'}); }
}
async function saveProfileNoReload(){const profile=currentProfilePatch(); await msg({type:'updateProfile',profile});}
async function checkUpdateUI(){
  const el=document.getElementById('updateResult');
  if(el) el.innerHTML='در حال بررسی آخرین Release از GitHub...';
  const res=await msg({type:'checkUpdate'});
  lastUpdateResult=res;
  const html=renderUpdateResult();
  const tmp=document.createElement('div'); tmp.innerHTML=html;
  const node=tmp.firstElementChild;
  const target=document.getElementById('updateResult');
  if(target && node) target.replaceWith(node); else alert(res.ok ? (res.updateAvailable?'نسخه جدید موجود است.':'نسخه فعلی به‌روز است.') : ('خطا: '+(res.error||'')));
}
async function copyPac(){const r=await msg({type:'copyPac'}); if(r.ok && navigator.clipboard){await navigator.clipboard.writeText(r.pac); alert('PAC کپی شد.');}}
function exportSettings(){const blob=new Blob([JSON.stringify(getSettings(),null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='smart-pac-ultra-settings.json'; a.click(); URL.revokeObjectURL(a.href);}
function importSettings(){const inp=document.createElement('input');inp.type='file';inp.accept='.json,application/json';inp.onchange=async()=>{const file=inp.files[0]; if(!file)return; const txt=await file.text(); const settings=JSON.parse(txt); await msg({type:'setSettings',settings}); await load();};inp.click();}

load();
