from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile
from PIL import Image
import hashlib
import os
import shutil
import subprocess
import tempfile
import urllib.request

root = Path(__file__).resolve().parent.parent
work = root / 'work'
work.mkdir(exist_ok=True)
outputs = root / 'outputs'
outputs.mkdir(exist_ok=True)

version = '44.3.0'
archive_name = f'electron-v{version}-win32-x64.zip'
archive = work / archive_name
release = f'https://github.com/electron/electron/releases/download/v{version}'

if not archive.exists():
    urllib.request.urlretrieve(f'{release}/{archive_name}', archive)
checksums = urllib.request.urlopen(f'{release}/SHASUMS256.txt').read().decode()
expected = next(line.split()[0] for line in checksums.splitlines() if line.endswith(f' *{archive_name}'))
actual = hashlib.sha256(archive.read_bytes()).hexdigest()
if actual != expected:
    raise SystemExit('Electron Windows 运行时校验失败')

node = shutil.which('node') or str(Path.home() / '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node')
subprocess.run([node, str(root / 'node_modules' / 'vite' / 'bin' / 'vite.js'), 'build'], cwd=root, env={**os.environ, 'ORDEX_DESKTOP_RELEASE': '1'}, check=True)

stage = Path(tempfile.mkdtemp(prefix='ordex-win32-x64-', dir=work))
with ZipFile(archive) as source:
    source.extractall(stage)

(stage / 'electron.exe').rename(stage / 'Ordex.exe')
resources = stage / 'resources'
app = resources / 'app'
app.mkdir()
shutil.copytree(root / 'dist', app / 'dist')
(app / 'desktop').mkdir()
for name in ['main.cjs', 'preload.cjs', 'storage.cjs']:
    shutil.copy2(root / 'desktop' / name, app / 'desktop' / name)
(app / 'package.json').write_text('{"name":"ordex","productName":"Ordex","version":"1.0.0","main":"desktop/main.cjs"}')
shutil.copy2(root / 'LICENSE', app / 'LICENSE')
shutil.copy2(root / 'THIRD_PARTY_NOTICES.md', app / 'THIRD_PARTY_NOTICES.md')
licenses = app / 'third-party-licenses'
licenses.mkdir()
for name in ['docx-preview', 'pdfjs-dist', 'jszip', 'react', 'react-dom', 'motion']:
    package = root / 'node_modules' / name
    source = next((package / filename for filename in ['LICENSE', 'LICENSE.md', 'LICENSE.markdown'] if (package / filename).exists()), None)
    if source:
        shutil.copy2(source, licenses / f'{name}-LICENSE.txt')
for name in ['pako', 'setimmediate', 'lie']:
    package = next((root / 'node_modules' / '.pnpm').glob(f'{name}@*/node_modules/{name}'))
    source = next((package / filename for filename in ['LICENSE', 'LICENSE.txt', 'license.md'] if (package / filename).exists()), None)
    if source:
        shutil.copy2(source, licenses / f'{name}-LICENSE.txt')
shutil.copy2(root / 'node_modules' / 'pdfjs-dist' / 'LICENSE', licenses / 'mingcute-icons-LICENSE.txt')
(licenses / 'ICON-NOTICE.txt').write_text('Ordex file icons use shapes from MingCute free icons (https://github.com/mingcute-design/mingcute-icons), licensed under Apache-2.0. Some SVG shapes were adjusted for the Ordex interface.\n')

icon_png = work / 'ordex-icon.png'
if not icon_png.exists():
    raise SystemExit('请先运行 desktop/package.py 生成 Ordex 图标')
Image.open(icon_png).save(app / 'desktop' / 'ordex.ico', sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])

index = app / 'dist' / 'index.html'
index.write_text(index.read_text().replace('<head>', '<head><meta http-equiv="Content-Security-Policy" content="default-src \'self\'; script-src \'self\'; style-src \'self\' \'unsafe-inline\'; img-src \'self\' data: blob:; media-src \'self\' blob:; worker-src \'self\'; connect-src \'self\'; object-src \'none\'; base-uri \'self\'">'))

destination = outputs / 'Ordex-Windows-x64-zh-en-v1.0.0-portable.zip'
installer = outputs / 'Ordex-Windows-x64-zh-en-v1.0.0-Setup.exe'
if destination.exists() or installer.exists():
    raise SystemExit('输出文件已存在；请先移动旧版本，避免覆盖')
with ZipFile(destination, 'w', ZIP_DEFLATED, compresslevel=9) as target:
    for file in sorted(stage.rglob('*')):
        if file.is_file():
            target.write(file, Path('Ordex') / file.relative_to(stage))
subprocess.run(['makensis', '-V2', f'-DSTAGE={stage}', f'-DOUTPUT={installer}', f'-DICON={app / "desktop" / "ordex.ico"}', str(root / 'desktop' / 'ordex-windows-installer.nsi')], check=True)
shutil.rmtree(stage)
print(destination, installer)
