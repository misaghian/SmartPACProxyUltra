#!/usr/bin/env python3
import argparse, zipfile
from pathlib import Path

EXCLUDE_DIRS = {'.git', '.github', 'dist', '__pycache__'}
EXCLUDE_FILES = {'.DS_Store'}

def should_include(path: Path) -> bool:
    parts = set(path.parts)
    if parts & EXCLUDE_DIRS:
        return False
    if path.name in EXCLUDE_FILES:
        return False
    if path.suffix in {'.zip', '.crx'}:
        return False
    return True

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--version', default='3.4.2')
    parser.add_argument('--root', default='.')
    args = parser.parse_args()
    root = Path(args.root).resolve()
    dist = root / 'dist'
    dist.mkdir(exist_ok=True)
    out = dist / f'smart-pac-ultra-v{args.version}-release.zip'
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
        for p in root.rglob('*'):
            if p.is_file() and should_include(p.relative_to(root)):
                z.write(p, p.relative_to(root).as_posix())
    print(out)

if __name__ == '__main__':
    main()
