
const STORAGE_KEY = "smartPacUltraSettingsV340";
const GITHUB_REPO = "misaghian/SmartPACProxyUltra";
const GITHUB_RELEASE_API = "https://api.github.com/repos/" + GITHUB_REPO + "/releases/latest";

const DEFAULT_PROTECTED = [
  "challenges.cloudflare.com",
  "turnstile.cloudflare.com",
  "captcha.cloudflare.com",
  "recaptcha.net",
  "www.google.com",
  "www.gstatic.com",
  "hcaptcha.com",
  "newassets.hcaptcha.com"
];

const DEFAULT_IGNORE = [
  "doubleclick.net",
  "googlesyndication.com",
  "google-analytics.com",
  "googletagmanager.com",
  "facebook.net",
  "hotjar.com",
  "clarity.ms"
];

const MODE_ICONS = {
  direct: "direct",
  proxy: "proxy",
  pac: "pac",
  system: "system",
  smart: "smart",
  error: "error",
  test: "test",
  suggest: "suggest",
  off: "off"
};

const DEFAULT_SETTINGS = {
  enabled: true,
  connectionMode: "smart",
  activeProfileId: "default",
  globalLists: {
    directDomains: ["localhost", "127.0.0.1", ".ir"],
    proxyDomains: [],
    learnedDirectDomains: [],
    learnedProxyDomains: [],
    protectedDomains: DEFAULT_PROTECTED,
    ignoreDomains: DEFAULT_IGNORE
  },
  smart: {
    autoSuggest: true,
    learnByInitiator: true,
    learnByActiveTab: false,
    learnMode: "safe",
    minHits: 2,
    suggestionLimit: 25
  },
  profiles: [
    {
      id: "default",
      name: "پیش‌فرض",
      note: "پروفایل اصلی",
      enabled: true,
      proxyType: "SOCKS5",
      host: "127.0.0.1",
      port: 10808,
      username: "",
      password: "",
      authMode: "none",
      fallbackDirect: false,
      listMode: "global",
      lists: {
        directDomains: [],
        proxyDomains: [],
        learnedDirectDomains: [],
        learnedProxyDomains: []
      }
    }
  ],
  candidates: {},
  suggestions: [],
  logs: []
};

let settings = null;
let activeTabs = new Map();

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function now() {
  return Date.now();
}

function uid(prefix = "p") {
  return prefix + "_" + Math.random().toString(36).slice(2, 10) + "_" + Date.now().toString(36);
}

function normalizeHost(host) {
  if (!host) return "";
  host = String(host).trim().toLowerCase();
  if (host.startsWith("[")) host = host.slice(1);
  if (host.endsWith("]")) host = host.slice(0, -1);
  if (host.endsWith(".")) host = host.slice(0, -1);
  return host;
}

function getHostFromUrl(url) {
  try {
    return normalizeHost(new URL(url).hostname);
  } catch (e) {
    return "";
  }
}

function cleanList(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const out = [];
  for (const raw of list) {
    const line = String(raw || "").trim().toLowerCase();
    if (!line || line.startsWith("#") || line.startsWith("//")) continue;
    const value = line.replace(/^https?:\/\//, "").split("/")[0].trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

function domainMatch(host, rule) {
  host = normalizeHost(host);
  rule = normalizeHost(rule);
  if (!host || !rule) return false;
  if (rule.startsWith("*")) {
    const pattern = rule.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
    return new RegExp("^" + pattern + "$").test(host);
  }
  if (rule.startsWith(".")) return host.endsWith(rule) || host === rule.slice(1);
  return host === rule || host.endsWith("." + rule);
}

function inList(host, list) {
  host = normalizeHost(host);
  return cleanList(list).some(rule => domainMatch(host, rule));
}

function currentProfile() {
  if (!settings) return DEFAULT_SETTINGS.profiles[0];
  return settings.profiles.find(p => p.id === settings.activeProfileId) || settings.profiles[0] || DEFAULT_SETTINGS.profiles[0];
}

function effectiveLists(profile = currentProfile()) {
  const global = settings.globalLists || clone(DEFAULT_SETTINGS.globalLists);
  const own = profile.lists || {};
  if (profile.listMode === "profile") {
    return {
      directDomains: cleanList([...(own.directDomains || []), ...(own.learnedDirectDomains || [])]),
      proxyDomains: cleanList([...(own.proxyDomains || []), ...(own.learnedProxyDomains || [])]),
      learnedDirectDomains: cleanList(own.learnedDirectDomains || []),
      learnedProxyDomains: cleanList(own.learnedProxyDomains || []),
      protectedDomains: cleanList(global.protectedDomains || DEFAULT_PROTECTED),
      ignoreDomains: cleanList(global.ignoreDomains || DEFAULT_IGNORE)
    };
  }
  return {
    directDomains: cleanList([...(global.directDomains || []), ...(global.learnedDirectDomains || [])]),
    proxyDomains: cleanList([...(global.proxyDomains || []), ...(global.learnedProxyDomains || [])]),
    learnedDirectDomains: cleanList(global.learnedDirectDomains || []),
    learnedProxyDomains: cleanList(global.learnedProxyDomains || []),
    protectedDomains: cleanList(global.protectedDomains || DEFAULT_PROTECTED),
    ignoreDomains: cleanList(global.ignoreDomains || DEFAULT_IGNORE)
  };
}

function proxyToken(profile = currentProfile()) {
  const type = String(profile.proxyType || "SOCKS5").toUpperCase();
  const host = normalizeHost(profile.host || "127.0.0.1");
  const port = parseInt(profile.port || 0, 10) || 10808;
  if (type === "HTTP") return `PROXY ${host}:${port}`;
  if (type === "HTTPS") return `HTTPS ${host}:${port}`;
  if (type === "SOCKS4") return `SOCKS4 ${host}:${port}`;
  if (type === "MTPROTO") return `SOCKS5 ${host}:${port}`;
  return `SOCKS5 ${host}:${port}`;
}

function fixedServerConfig(profile = currentProfile()) {
  const schemeMap = {
    HTTP: "http",
    HTTPS: "https",
    SOCKS4: "socks4",
    SOCKS5: "socks5",
    MTPROTO: "socks5"
  };
  return {
    mode: "fixed_servers",
    rules: {
      singleProxy: {
        scheme: schemeMap[String(profile.proxyType || "SOCKS5").toUpperCase()] || "socks5",
        host: normalizeHost(profile.host || "127.0.0.1"),
        port: parseInt(profile.port || 10808, 10)
      },
      bypassList: ["localhost", "127.0.0.1", "::1"]
    }
  };
}

function buildPac(mode, profile = currentProfile()) {
  const lists = effectiveLists(profile);
  const token = proxyToken(profile);
  const fallback = profile.fallbackDirect ? token + "; DIRECT" : token;
  const directDomains = mode === "smart" ? ["localhost", "127.0.0.1", "::1"] : lists.directDomains;
  const proxyDomains = lists.proxyDomains;
  const protectedDomains = lists.protectedDomains;
  const ignoreDomains = lists.ignoreDomains;
  const defaultAction = mode === "smart" ? "DIRECT" : fallback;
  return `
var PROXY = ${JSON.stringify(fallback)};
var DEFAULT_ACTION = ${JSON.stringify(defaultAction)};
var DIRECT_DOMAINS = ${JSON.stringify(directDomains)};
var PROXY_DOMAINS = ${JSON.stringify(proxyDomains)};
var PROTECTED_DOMAINS = ${JSON.stringify(protectedDomains)};
var IGNORE_DOMAINS = ${JSON.stringify(ignoreDomains)};
var PRIVATE_RANGES = [
  ["127.0.0.0","255.0.0.0"],["10.0.0.0","255.0.0.0"],
  ["172.16.0.0","255.240.0.0"],["192.168.0.0","255.255.0.0"],
  ["169.254.0.0","255.255.0.0"],["100.64.0.0","255.192.0.0"]
];
function normalizeHost(host){if(!host)return "";host=host.toLowerCase();if(host.charAt(0)==="["&&host.charAt(host.length-1)==="]")host=host.substring(1,host.length-1);if(host.charAt(host.length-1)===".")host=host.substring(0,host.length-1);return host;}
function isIpAddress(host){return /^\\d{1,3}(\\.\\d{1,3}){3}$/.test(host);}
function domainMatch(host,rule){host=normalizeHost(host);rule=normalizeHost(rule);if(!host||!rule)return false;if(rule.charAt(0)==="*"){var re="^"+rule.replace(/[.+?^$\\{\\}()|[\\]\\\\]/g,"\\\\$&").replace(/\\*/g,".*")+"$";return new RegExp(re).test(host);}if(rule.charAt(0)===".")return dnsDomainIs(host,rule)||host===rule.substring(1);return host===rule||dnsDomainIs(host,"."+rule);}
function inList(host,list){for(var i=0;i<list.length;i++){if(domainMatch(host,list[i]))return true;}return false;}
function ipInRanges(ip,ranges){if(!ip||!isIpAddress(ip))return false;for(var i=0;i<ranges.length;i++){if(isInNet(ip,ranges[i][0],ranges[i][1]))return true;}return false;}
function isLocal(host){return isPlainHostName(host)||dnsDomainIs(host,".local")||dnsDomainIs(host,".lan")||dnsDomainIs(host,".internal")||dnsDomainIs(host,".intranet")||dnsDomainIs(host,".corp")||dnsDomainIs(host,".test");}
function FindProxyForURL(url,host){
  host=normalizeHost(host);
  if(host==="localhost"||host==="127.0.0.1"||host==="::1")return "DIRECT";
  if(isLocal(host))return "DIRECT";
  if(isIpAddress(host))return ipInRanges(host,PRIVATE_RANGES)?"DIRECT":DEFAULT_ACTION;
  if(inList(host,PROTECTED_DOMAINS))return DEFAULT_ACTION;
  if(inList(host,IGNORE_DOMAINS))return DEFAULT_ACTION;
  if(inList(host,PROXY_DOMAINS))return PROXY;
  if(inList(host,DIRECT_DOMAINS))return "DIRECT";
  return DEFAULT_ACTION;
}`.trim();
}

function addLog(type, message, extra = {}) {
  settings.logs = Array.isArray(settings.logs) ? settings.logs : [];
  settings.logs.unshift({ id: uid("log"), ts: now(), type, message, extra });
  settings.logs = settings.logs.slice(0, 80);
}

async function loadSettings() {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  settings = Object.assign(clone(DEFAULT_SETTINGS), data[STORAGE_KEY] || {});
  settings.globalLists = Object.assign(clone(DEFAULT_SETTINGS.globalLists), settings.globalLists || {});
  settings.smart = Object.assign(clone(DEFAULT_SETTINGS.smart), settings.smart || {});
  settings.profiles = Array.isArray(settings.profiles) && settings.profiles.length ? settings.profiles : clone(DEFAULT_SETTINGS.profiles);
  settings.suggestions = Array.isArray(settings.suggestions) ? settings.suggestions : [];
  settings.logs = Array.isArray(settings.logs) ? settings.logs : [];
  normalizeSettings();
  await saveSettings(false);
}

function normalizeSettings() {
  settings.globalLists.directDomains = cleanList(settings.globalLists.directDomains);
  settings.globalLists.proxyDomains = cleanList(settings.globalLists.proxyDomains);
  settings.globalLists.learnedDirectDomains = cleanList(settings.globalLists.learnedDirectDomains);
  settings.globalLists.learnedProxyDomains = cleanList(settings.globalLists.learnedProxyDomains);
  settings.globalLists.protectedDomains = cleanList(settings.globalLists.protectedDomains);
  settings.globalLists.ignoreDomains = cleanList(settings.globalLists.ignoreDomains);
  for (const p of settings.profiles) {
    p.lists = p.lists || {};
    p.lists.directDomains = cleanList(p.lists.directDomains || []);
    p.lists.proxyDomains = cleanList(p.lists.proxyDomains || []);
    p.lists.learnedDirectDomains = cleanList(p.lists.learnedDirectDomains || []);
    p.lists.learnedProxyDomains = cleanList(p.lists.learnedProxyDomains || []);
    p.listMode = p.listMode || "global";
    p.proxyType = p.proxyType || "SOCKS5";
    p.host = normalizeHost(p.host || "127.0.0.1");
    p.port = parseInt(p.port || 10808, 10);
  }
}

async function saveSettings(apply = true) {
  normalizeSettings();
  await chrome.storage.local.set({ [STORAGE_KEY]: settings });
  if (apply) await applyProxy();
}

async function setIcon(state) {
  const iconState = MODE_ICONS[state] || "off";
  const path = {};
  for (const size of [16,32,48,128]) path[size] = `assets/icons/icon-${iconState}-${size}.png`;
  try {
    await chrome.action.setBadgeText({ text: "" });
    await chrome.action.setIcon({ path });
  } catch (e) {}
}

async function applyProxy() {
  if (!settings.enabled) {
    await chrome.proxy.settings.clear({ scope: "regular" });
    await setIcon("off");
    return;
  }
  const profile = currentProfile();
  const mode = settings.connectionMode || "smart";
  try {
    let value;
    if (mode === "direct") value = { mode: "direct" };
    else if (mode === "system") value = { mode: "system" };
    else if (mode === "proxy") value = fixedServerConfig(profile);
    else if (mode === "pac") value = { mode: "pac_script", pacScript: { data: buildPac("pac", profile), mandatory: false } };
    else value = { mode: "pac_script", pacScript: { data: buildPac("smart", profile), mandatory: false } };
    await chrome.proxy.settings.set({ value, scope: "regular" });
    await setIcon(mode);
  } catch (e) {
    addLog("error", "خطا در اعمال تنظیمات پروکسی", { error: String(e && e.message || e) });
    await saveSettings(false);
    await setIcon("error");
  }
}

function hostIsProtectedOrIgnored(host) {
  const lists = effectiveLists();
  return inList(host, lists.protectedDomains) || inList(host, lists.ignoreDomains);
}

async function addSuggestion(host, reason) {
  host = normalizeHost(host);
  if (!host || hostIsProtectedOrIgnored(host)) return;
  const lists = effectiveLists();
  if (inList(host, lists.proxyDomains) || inList(host, lists.directDomains)) return;
  settings.suggestions = Array.isArray(settings.suggestions) ? settings.suggestions : [];
  const existing = settings.suggestions.find(s => s.host === host);
  if (existing) {
    existing.count = (existing.count || 1) + 1;
    existing.reason = reason || existing.reason;
    existing.ts = now();
  } else {
    settings.suggestions.unshift({ id: uid("sg"), host, reason: reason || "site_failed", ts: now(), count: 1 });
  }
  settings.suggestions = settings.suggestions.slice(0, settings.smart.suggestionLimit || 25);
  addLog("suggest", "پیشنهاد هوشمند برای تست با پروکسی", { host, reason });
  await saveSettings(false);
  await setIcon("suggest");
}

function addDomainToTargetList(target, host) {
  host = normalizeHost(host);
  const profile = currentProfile();
  if (profile.listMode === "profile") {
    profile.lists[target] = cleanList([...(profile.lists[target] || []), host]);
  } else {
    settings.globalLists[target] = cleanList([...(settings.globalLists[target] || []), host]);
  }
}

function removeSuggestion(host) {
  settings.suggestions = (settings.suggestions || []).filter(s => s.host !== host);
}


function parseVersion(v) {
  return String(v || "0.0.0").replace(/^v/i, "").split(/[.-]/).map(x => parseInt(x, 10) || 0);
}
function compareVersions(a, b) {
  const aa = parseVersion(a), bb = parseVersion(b);
  const len = Math.max(aa.length, bb.length, 3);
  for (let i = 0; i < len; i++) {
    const d = (aa[i] || 0) - (bb[i] || 0);
    if (d > 0) return 1;
    if (d < 0) return -1;
  }
  return 0;
}
async function checkForUpdate() {
  const currentVersion = chrome.runtime.getManifest().version;
  try {
    const started = Date.now();
    const res = await fetch(GITHUB_RELEASE_API, { cache: "no-store", headers: { "Accept": "application/vnd.github+json" } });
    if (!res.ok) throw new Error("GitHub API: " + res.status);
    const data = await res.json();
    const latestVersion = String(data.tag_name || data.name || "").replace(/^v/i, "");
    if (!latestVersion) throw new Error("Latest release version not found");
    const updateAvailable = compareVersions(latestVersion, currentVersion) > 0;
    addLog("update", updateAvailable ? "نسخه جدید در GitHub موجود است" : "بررسی آپدیت انجام شد؛ نسخه فعلی به‌روز است", { currentVersion, latestVersion, ms: Date.now() - started });
    await saveSettings(false);
    return { ok: true, currentVersion, latestVersion, updateAvailable, htmlUrl: data.html_url || ("https://github.com/" + GITHUB_REPO + "/releases") };
  } catch (e) {
    addLog("error", "خطا در بررسی آپدیت GitHub", { error: String(e && e.message || e) });
    await saveSettings(false);
    return { ok: false, currentVersion, error: String(e && e.message || e), htmlUrl: "https://github.com/" + GITHUB_REPO + "/releases" };
  }
}

async function handleMessage(msg, sender) {
  if (!settings) await loadSettings();
  const type = msg && msg.type;
  if (type === "getState") {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true }).catch(() => []);
    const tab = tabs && tabs[0] ? tabs[0] : null;
    const host = tab && tab.url ? getHostFromUrl(tab.url) : "";
    return {
      ok: true,
      settings: clone(settings),
      activeProfile: clone(currentProfile()),
      effectiveLists: effectiveLists(),
      currentTab: { host, url: tab && tab.url || "" },
      extensionVersion: chrome.runtime.getManifest().version,
      repositoryUrl: "https://github.com/" + GITHUB_REPO
    };
  }
  if (type === "setSettings") {
    settings = Object.assign(clone(DEFAULT_SETTINGS), msg.settings || {});
    await saveSettings(true);
    return { ok: true };
  }
  if (type === "setMode") {
    settings.connectionMode = msg.mode || "smart";
    settings.enabled = true;
    addLog("mode", "تغییر حالت اتصال", { mode: settings.connectionMode });
    await saveSettings(true);
    return { ok: true };
  }
  if (type === "toggleEnabled") {
    settings.enabled = !!msg.enabled;
    await saveSettings(true);
    return { ok: true };
  }
  if (type === "setActiveProfile") {
    if (settings.profiles.some(p => p.id === msg.id)) settings.activeProfileId = msg.id;
    await saveSettings(true);
    return { ok: true };
  }
  if (type === "addProfile") {
    const p = clone(DEFAULT_SETTINGS.profiles[0]);
    p.id = uid("profile");
    p.name = msg.name || "پروفایل جدید";
    p.note = "";
    p.host = "127.0.0.1";
    p.port = 10808;
    settings.profiles.push(p);
    settings.activeProfileId = p.id;
    await saveSettings(true);
    return { ok: true, profile: p };
  }
  if (type === "copyProfile") {
    const src = currentProfile();
    const p = clone(src);
    p.id = uid("profile");
    p.name = (src.name || "پروفایل") + " - کپی";
    settings.profiles.push(p);
    settings.activeProfileId = p.id;
    await saveSettings(true);
    return { ok: true, profile: p };
  }
  if (type === "deleteProfile") {
    if (settings.profiles.length > 1) {
      settings.profiles = settings.profiles.filter(p => p.id !== msg.id);
      if (!settings.profiles.some(p => p.id === settings.activeProfileId)) settings.activeProfileId = settings.profiles[0].id;
    }
    await saveSettings(true);
    return { ok: true };
  }
  if (type === "updateProfile") {
    const p = settings.profiles.find(x => x.id === msg.profile.id);
    if (p) Object.assign(p, msg.profile);
    await saveSettings(true);
    return { ok: true };
  }
  if (type === "addCurrentSiteToProxy") {
    const host = normalizeHost(msg.host);
    addDomainToTargetList("proxyDomains", host);
    removeSuggestion(host);
    addLog("rule", "دامنه به لیست پروکسی اضافه شد", { host });
    await saveSettings(true);
    return { ok: true };
  }
  if (type === "addCurrentSiteToDirect") {
    const host = normalizeHost(msg.host);
    addDomainToTargetList("directDomains", host);
    removeSuggestion(host);
    addLog("rule", "دامنه به لیست مستقیم اضافه شد", { host });
    await saveSettings(true);
    return { ok: true };
  }
  if (type === "ignoreSuggestion") {
    removeSuggestion(msg.host);
    await saveSettings(false);
    await applyProxy();
    return { ok: true };
  }
  if (type === "clearSuggestions") {
    settings.suggestions = [];
    await saveSettings(false);
    await applyProxy();
    return { ok: true };
  }
  if (type === "clearLogs") {
    settings.logs = [];
    await saveSettings(false);
    return { ok: true };
  }
  if (type === "testProxy") {
    return await testProxy(msg.url || "https://www.gstatic.com/generate_204");
  }
  if (type === "checkUpdate") {
    return await checkForUpdate();
  }
  if (type === "copyPac") {
    return { ok: true, pac: buildPac(settings.connectionMode === "smart" ? "smart" : "pac", currentProfile()) };
  }
  if (type === "resetAll") {
    settings = clone(DEFAULT_SETTINGS);
    await saveSettings(true);
    return { ok: true };
  }
  return { ok: false, error: "Unknown message" };
}

async function testProxy(testUrl) {
  await setIcon("test");
  const previousMode = settings.connectionMode;
  const previousEnabled = settings.enabled;
  try {
    await chrome.proxy.settings.set({ value: fixedServerConfig(currentProfile()), scope: "regular" });
    const started = Date.now();
    const res = await fetch(testUrl, { method: "GET", cache: "no-store" });
    const ms = Date.now() - started;
    settings.enabled = previousEnabled;
    settings.connectionMode = previousMode;
    await applyProxy();
    addLog("test", "تست اتصال پروکسی موفق بود", { status: res.status, ms });
    await saveSettings(false);
    return { ok: true, status: res.status, ms };
  } catch (e) {
    settings.enabled = previousEnabled;
    settings.connectionMode = previousMode;
    await applyProxy();
    addLog("error", "تست اتصال پروکسی ناموفق بود", { error: String(e && e.message || e) });
    await saveSettings(false);
    return { ok: false, error: String(e && e.message || e) };
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  handleMessage(msg, sender).then(sendResponse).catch(err => sendResponse({ ok:false, error: String(err && err.message || err) }));
  return true;
});

chrome.webNavigation.onErrorOccurred.addListener(async details => {
  if (!settings) await loadSettings();
  if (!settings.enabled || settings.connectionMode !== "smart" || !settings.smart.autoSuggest) return;
  if (details.frameId !== 0) return;
  const host = getHostFromUrl(details.url);
  if (!host) return;
  await addSuggestion(host, details.error || "navigation_error");
}, { url: [{ schemes: ["http", "https"] }] });

chrome.webRequest.onBeforeRequest.addListener(details => {
  if (!settings || !settings.enabled) return;
  const host = getHostFromUrl(details.url);
  if (!host) return;
  if (details.type === "main_frame" && details.tabId >= 0) {
    activeTabs.set(details.tabId, host);
  }
}, { urls: ["<all_urls>"] });

chrome.tabs.onRemoved.addListener(tabId => activeTabs.delete(tabId));

chrome.proxy.onProxyError.addListener(async details => {
  if (!settings) await loadSettings();
  addLog("error", "خطای پروکسی مرورگر", details || {});
  await saveSettings(false);
  await setIcon("error");
});

chrome.runtime.onInstalled.addListener(async () => {
  await loadSettings();
  await applyProxy();
});

chrome.runtime.onStartup.addListener(async () => {
  await loadSettings();
  await applyProxy();
});

loadSettings().then(applyProxy);
