# راهنمای آپدیت و Release برای Smart PAC Ultra

## حالت انتشار پیشنهادی

### 1) Chrome Web Store
برای کاربران عمومی بهترین مسیر است. Chrome خودش آپدیت‌ها را نصب می‌کند. چون تنظیمات افزونه در `chrome.storage.local` با کلید پایدار ذخیره شده‌اند، با آپدیت نسخه، پروفایل‌ها و لیست‌ها پاک نمی‌شوند.

### 2) GitHub Release
افزونه از داخل Popup می‌تواند آخرین Release مخزن زیر را بررسی کند:

`https://github.com/misaghian/SmartPACProxyUltra`

اگر نسخه جدید وجود داشته باشد، دکمه دانلود، فایل ZIP آخرین Release را از GitHub دانلود می‌کند و قبل از آن یک Backup از تنظیمات در Downloads ذخیره می‌کند.

## محدودیت مهم

خود افزونه نمی‌تواند فایل ZIP دانلودشده را به‌صورت خودکار جایگزین و نصب کند. این محدودیت امنیتی مرورگر است. برای نصب خودکار واقعی باید یکی از این مسیرها استفاده شود:

- انتشار در Chrome Web Store
- نصب سازمانی/Enterprise با CRX و update_url
- نصب دستی با Load unpacked برای نسخه‌های تستی

## ساخت Release

```bash
python3 scripts/package_release.py
```

یا با GitHub Actions:

```bash
git tag v3.5.0
git push origin v3.5.0
```

Workflow فایل‌های زیر را داخل Release قرار می‌دهد:

- `smart-pac-ultra-v3.5.0-release.zip`
- `latest.json`

## فونت VazirFD

فایل‌های فونت را خودتان در یکی از مسیرهای زیر قرار دهید:

```text
ui/fonts/VazirFD.woff2
ui/fonts/VazirFD.woff
ui/fonts/VazirFD.ttf
```

یا:

```text
assets/ui/fonts/VazirFD.woff2
assets/ui/fonts/VazirFD.woff
assets/ui/fonts/VazirFD.ttf
```
