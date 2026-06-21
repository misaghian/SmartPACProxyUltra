
const STORAGE_KEY = "smartPacUltraSettingsV340"; // Stable key: do not change, so user profiles/lists survive updates.
const LEGACY_STORAGE_KEYS = ["smartPacUltraSettings", "smartPacUltraSettingsV300", "smartPacUltraSettingsV320", "smartPacUltraSettingsV340"];
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
  logs: [],
  updates: {
    autoCheck: true,
    autoDownload: false,
    lastCheck: 0,
    lastLatestVersion: "",
    lastReleaseUrl: "",
    lastDownloadedVersion: ""
  }
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

function cleanRuleValue(raw) {
  let value = String(raw || "").trim().toLowerCase();
  if (!value || value.startsWith("#") || value.startsWith("//")) return "";
  try {
    if (/^https?:\/\//i.test(value)) {
      const u = new URL(value);
      return normalizeHost(u.hostname);
    }
  } catch (e) {}
  value = value.replace(/^\[([^\]]+)\]$/, "$1").trim();
  const isIpv4Cidr = /^\d{1,3}(\.\d{1,3}){3}\/(\d{1,2}|\d{1,3}(\.\d{1,3}){3})$/.test(value);
  const isIpv4Range = /^\d{1,3}(\.\d{1,3}){3}\s*-\s*\d{1,3}(\.\d{1,3}){3}$/.test(value);
  if (!isIpv4Cidr && !isIpv4Range && value.indexOf("/") !== -1) {
    value = value.split("/")[0].trim();
  }
  if (!isIpv4Cidr && !isIpv4Range) {
    value = value.replace(/:\d+$/, "");
  }
  return normalizeHost(value);
}

function cleanList(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const out = [];
  for (const raw of list) {
    const value = cleanRuleValue(raw);
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
  const directDomains = lists.directDomains;
  const proxyDomains = lists.proxyDomains;
  const protectedDomains = lists.protectedDomains;
  const ignoreDomains = lists.ignoreDomains;
  const defaultAction = mode === "smart" ? "DIRECT" : fallback;
  return String.raw`
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
function normalizeHost(host){if(!host)return "";host=String(host).toLowerCase();if(host.charAt(0)==="["&&host.charAt(host.length-1)==="]")host=host.substring(1,host.length-1);if(host.charAt(host.length-1)===".")host=host.substring(0,host.length-1);return host;}
function isIpAddress(host){if(!/^\d{1,3}(\.\d{1,3}){3}$/.test(host))return false;var p=host.split(".");for(var i=0;i<p.length;i++){var n=parseInt(p[i],10);if(isNaN(n)||n<0||n>255)return false;}return true;}
function ipToLong(ip){if(!isIpAddress(ip))return null;var p=ip.split(".");return (((parseInt(p[0],10)<<24)>>>0)+((parseInt(p[1],10)<<16)>>>0)+((parseInt(p[2],10)<<8)>>>0)+parseInt(p[3],10))>>>0;}
function maskFromBits(bits){bits=parseInt(bits,10);if(isNaN(bits)||bits<0||bits>32)return null;if(bits===0)return 0;return (0xFFFFFFFF << (32-bits))>>>0;}
function cidrMatch(ip,rule){var parts=rule.split("/");if(parts.length!==2)return false;var base=normalizeHost(parts[0]);var maskPart=normalizeHost(parts[1]);var ipLong=ipToLong(ip);var baseLong=ipToLong(base);if(ipLong===null||baseLong===null)return false;var mask=isIpAddress(maskPart)?ipToLong(maskPart):maskFromBits(maskPart);if(mask===null)return false;return (ipLong & mask)===(baseLong & mask);}
function wildcardToRegExp(rule){return "^"+rule.replace(/[.+?^$\{\}()|[\]\\]/g,"\\$&").replace(/\*/g,".*")+"$";}
function ipRuleMatch(ip,rule){rule=normalizeHost(rule);if(!isIpAddress(ip)||!rule)return false;if(rule.indexOf("-")>-1){var p=rule.split("-");if(p.length!==2)return false;var v=ipToLong(ip),a=ipToLong(normalizeHost(p[0])),b=ipToLong(normalizeHost(p[1]));if(v===null||a===null||b===null)return false;if(a>b){var t=a;a=b;b=t;}return v>=a&&v<=b;}if(rule.indexOf("/")>-1)return cidrMatch(ip,rule);if(rule.indexOf("*")>-1)return new RegExp(wildcardToRegExp(rule)).test(ip);return ip===rule;}
function domainMatch(host,rule){host=normalizeHost(host);rule=normalizeHost(rule);if(!host||!rule)return false;if(isIpAddress(host)&&ipRuleMatch(host,rule))return true;if(rule.charAt(0)==="*"){return new RegExp(wildcardToRegExp(rule)).test(host);}if(rule.charAt(0)===".")return dnsDomainIs(host,rule)||host===rule.substring(1);return host===rule||dnsDomainIs(host,"."+rule);}
function inList(host,list){for(var i=0;i<list.length;i++){if(domainMatch(host,list[i]))return true;}return false;}
function ipInRanges(ip,ranges){if(!ip||!isIpAddress(ip))return false;for(var i=0;i<ranges.length;i++){if(isInNet(ip,ranges[i][0],ranges[i][1]))return true;}return false;}
function isLocal(host){return isPlainHostName(host)||dnsDomainIs(host,".local")||dnsDomainIs(host,".lan")||dnsDomainIs(host,".internal")||dnsDomainIs(host,".intranet")||dnsDomainIs(host,".corp")||dnsDomainIs(host,".test");}
function FindProxyForURL(url,host){
  host=normalizeHost(host);
  if(host==="localhost"||host==="127.0.0.1"||host==="::1")return "DIRECT";
  if(isLocal(host))return "DIRECT";
  if(inList(host,PROXY_DOMAINS))return PROXY;
  if(inList(host,DIRECT_DOMAINS))return "DIRECT";
  if(isIpAddress(host))return ipInRanges(host,PRIVATE_RANGES)?"DIRECT":DEFAULT_ACTION;
  if(inList(host,PROTECTED_DOMAINS))return DEFAULT_ACTION;
  if(inList(host,IGNORE_DOMAINS))return DEFAULT_ACTION;
  return DEFAULT_ACTION;
}`.trim();
}

function addLog(type, message, extra = {}) {
  settings.logs = Array.isArray(settings.logs) ? settings.logs : [];
  settings.logs.unshift({ id: uid("log"), ts: now(), type, message, extra });
  settings.logs = settings.logs.slice(0, 80);
}

async function loadSettings() {
  const data = await chrome.storage.local.get(LEGACY_STORAGE_KEYS);
  let stored = data[STORAGE_KEY];
  if (!stored) {
    for (const key of LEGACY_STORAGE_KEYS) {
      if (data[key]) { stored = data[key]; break; }
    }
  }
  settings = Object.assign(clone(DEFAULT_SETTINGS), stored || {});
  settings.globalLists = Object.assign(clone(DEFAULT_SETTINGS.globalLists), settings.globalLists || {});
  settings.smart = Object.assign(clone(DEFAULT_SETTINGS.smart), settings.smart || {});
  settings.profiles = Array.isArray(settings.profiles) && settings.profiles.length ? settings.profiles : clone(DEFAULT_SETTINGS.profiles);
  settings.suggestions = Array.isArray(settings.suggestions) ? settings.suggestions : [];
  settings.logs = Array.isArray(settings.logs) ? settings.logs : [];
  settings.updates = Object.assign(clone(DEFAULT_SETTINGS.updates), settings.updates || {});
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
function pickReleaseAsset(release) {
  const assets = Array.isArray(release && release.assets) ? release.assets : [];
  return assets.find(a => /release\.zip$/i.test(a.name || "")) ||
         assets.find(a => /smart-pac-ultra.*\.zip$/i.test(a.name || "")) ||
         assets.find(a => /\.zip$/i.test(a.name || "")) || null;
}

async function fetchLatestRelease() {
  const res = await fetch(GITHUB_RELEASE_API, {
    cache: "no-store",
    headers: { "Accept": "application/vnd.github+json" }
  });
  if (!res.ok) throw new Error("GitHub API: " + res.status);
  return await res.json();
}

async function checkForUpdate() {
  const currentVersion = chrome.runtime.getManifest().version;
  try {
    const started = Date.now();
    const data = await fetchLatestRelease();
    const latestVersion = String(data.tag_name || data.name || "").replace(/^v/i, "");
    if (!latestVersion) throw new Error("Latest release version not found");
    const asset = pickReleaseAsset(data);
    const updateAvailable = compareVersions(latestVersion, currentVersion) > 0;
    settings.updates = Object.assign(clone(DEFAULT_SETTINGS.updates), settings.updates || {});
    settings.updates.lastCheck = now();
    settings.updates.lastLatestVersion = latestVersion;
    settings.updates.lastReleaseUrl = data.html_url || ("https://github.com/" + GITHUB_REPO + "/releases");
    addLog("update", updateAvailable ? "نسخه جدید در GitHub موجود است" : "بررسی آپدیت انجام شد؛ نسخه فعلی به‌روز است", { currentVersion, latestVersion, ms: Date.now() - started });
    await saveSettings(false);
    return {
      ok: true,
      currentVersion,
      latestVersion,
      updateAvailable,
      htmlUrl: settings.updates.lastReleaseUrl,
      assetName: asset ? asset.name : "",
      assetUrl: asset ? asset.browser_download_url : ""
    };
  } catch (e) {
    addLog("error", "خطا در بررسی آپدیت GitHub", { error: String(e && e.message || e) });
    await saveSettings(false);
    return { ok: false, currentVersion, error: String(e && e.message || e), htmlUrl: "https://github.com/" + GITHUB_REPO + "/releases" };
  }
}

async function downloadSettingsBackup(reason = "update") {
  const currentVersion = chrome.runtime.getManifest().version;
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const payload = {
    app: "Smart PAC Ultra",
    version: currentVersion,
    reason,
    createdAt: new Date().toISOString(),
    settings
  };
  const url = "data:application/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
  return await chrome.downloads.download({
    url,
    filename: `SmartPACProxyUltra/backups/settings-backup-v${currentVersion}-${stamp}.json`,
    saveAs: false,
    conflictAction: "uniquify"
  });
}

async function downloadUpdate() {
  const info = await checkForUpdate();
  if (!info.ok) return info;
  if (!info.updateAvailable) return Object.assign(info, { downloaded: false, message: "نسخه فعلی به‌روز است." });
  if (!info.assetUrl) return Object.assign(info, { ok: false, downloaded: false, error: "در Release فایل ZIP پیدا نشد." });
  const backupId = await downloadSettingsBackup("before-update-download").catch(() => null);
  const fileName = info.assetName || `smart-pac-ultra-v${info.latestVersion}-release.zip`;
  const downloadId = await chrome.downloads.download({
    url: info.assetUrl,
    filename: `SmartPACProxyUltra/releases/${fileName}`,
    saveAs: true,
    conflictAction: "uniquify"
  });
  settings.updates.lastDownloadedVersion = info.latestVersion;
  addLog("update", "فایل آپدیت از GitHub دانلود شد", { version: info.latestVersion, downloadId, backupId });
  await saveSettings(false);
  return Object.assign(info, { downloaded: true, downloadId, backupId, message: "فایل آپدیت دانلود شد. برای نصب، ZIP را Extract و در chrome://extensions بارگذاری/Reload کنید." });
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
  if (type === "downloadUpdate") {
    return await downloadUpdate();
  }
  if (type === "backupSettings") {
    const id = await downloadSettingsBackup("manual-backup");
    return { ok: true, downloadId: id };
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

chrome.runtime.onInstalled.addListener(async (details) => {
  await loadSettings();
  if (details && details.reason === "update") {
    addLog("update", "افزونه به نسخه جدید ارتقا یافت و تنظیمات حفظ شد", { version: chrome.runtime.getManifest().version });
    await saveSettings(false);
  }
  await applyProxy();
  try { await chrome.alarms.create("smartPacDailyUpdateCheck", { periodInMinutes: 24 * 60 }); } catch (e) {}
});

chrome.runtime.onStartup.addListener(async () => {
  await loadSettings();
  await applyProxy();
  if (settings.updates && settings.updates.autoCheck) {
    const last = settings.updates.lastCheck || 0;
    if (Date.now() - last > 12 * 60 * 60 * 1000) checkForUpdate().catch(()=>{});
  }
});

chrome.alarms.onAlarm.addListener(async alarm => {
  if (!alarm || alarm.name !== "smartPacDailyUpdateCheck") return;
  if (!settings) await loadSettings();
  if (settings.updates && settings.updates.autoCheck) {
    const info = await checkForUpdate().catch(() => null);
    if (info && info.ok && info.updateAvailable && settings.updates.autoDownload) {
      await downloadUpdate().catch(() => {});
    }
  }
});

loadSettings().then(applyProxy);
