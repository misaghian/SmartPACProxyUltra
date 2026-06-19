@echo off
git init
git branch -M main
git remote remove origin 2>nul
git remote add origin https://github.com/misaghian/SmartPACProxyUltra.git
git add .
git commit -m "Release v3.4.0"
git tag -f v3.4.0
git push -u origin main --tags
