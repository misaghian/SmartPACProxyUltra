# راهنمای اتصال پروژه به GitHub و ساخت Release

مخزن پیشنهادی:

```text
https://github.com/misaghian/SmartPACProxyUltra
```

## اتصال پروژه محلی به GitHub

در ریشه پروژه اجرا کنید:

```bash
git init
git branch -M main
git remote add origin https://github.com/misaghian/SmartPACProxyUltra.git
git add .
git commit -m "Release v3.4.0"
git tag v3.4.0
git push -u origin main --tags
```

## ساخت Release دستی

1. وارد صفحه GitHub Repository شوید.
2. از بخش Releases روی Draft a new release بزنید.
3. Tag را `v3.4.0` انتخاب کنید.
4. فایل ZIP نسخه را به Release اضافه کنید.
5. متن `RELEASE_NOTES_v3.4.0_FA.md` را برای توضیحات Release استفاده کنید.

## نکته مهم درباره آپدیت افزونه

دکمه بررسی آپدیت داخل افزونه فقط آخرین Release را از GitHub بررسی و لینک دانلود را نمایش می‌دهد. مرورگر Chrome اجازه نصب خودکار ZIP از داخل افزونه را نمی‌دهد. برای انتشار عمومی، مسیر استاندارد Chrome Web Store است و آپدیت نصب‌شده از Store توسط خود Chrome انجام می‌شود.
