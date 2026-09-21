from pathlib import Path
import subprocess,shutil,plistlib,os,tempfile
from datetime import datetime
import re
root=Path(__file__).resolve().parent.parent
app_version=os.environ.get('ORDEX_VERSION','1.0.0')
numeric_version=''.join(str(int(part)).zfill(2) for part in re.findall(r'\d+',app_version)[:3]).ljust(6,'0')
work=root/'work';work.mkdir(exist_ok=True)
outputs=root/'outputs';outputs.mkdir(exist_ok=True)
icon_png=work/'ordex-icon.png';iconset=work/'ordex.iconset';icon_icns=work/'ordex.icns'
if not icon_png.exists():
 subprocess.run(['swift',str(root/'desktop/icon.swift'),str(icon_png)],check=True)
if not icon_icns.exists():
 if iconset.exists():shutil.rmtree(iconset)
 iconset.mkdir()
 for name,size in [('icon_16x16.png',16),('icon_16x16@2x.png',32),('icon_32x32.png',32),('icon_32x32@2x.png',64),('icon_128x128.png',128),('icon_128x128@2x.png',256),('icon_256x256.png',256),('icon_256x256@2x.png',512),('icon_512x512.png',512),('icon_512x512@2x.png',1024)]:
  subprocess.run(['sips','-z',str(size),str(size),str(icon_png),'--out',str(iconset/name)],check=True,stdout=subprocess.DEVNULL)
 subprocess.run(['iconutil','-c','icns',str(iconset),'-o',str(icon_icns)],check=True)
node=shutil.which('node') or str(Path.home()/'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node')
subprocess.run([node,str(root/'node_modules/vite/bin/vite.js'),'build'],cwd=root,env={**os.environ,'ORDEX_DESKTOP_RELEASE':'1'},check=True)
stage=Path(tempfile.mkdtemp(prefix='ordex-mac-release-',dir=work));app=stage/'Ordex.app'
subprocess.run(['ditto',str(root/'node_modules/electron/dist/Electron.app'),str(app)],check=True)
resources=app/'Contents/Resources'
code=resources/'app';code.mkdir()
shutil.copytree(root/'dist',code/'dist')
(code/'desktop').mkdir()
for name in ['main.cjs','preload.cjs','storage.cjs']:
 shutil.copy2(root/'desktop'/name,code/'desktop'/name)
(code/'package.json').write_text(f'{{"name":"ordex","productName":"Ordex","version":"{app_version}","main":"desktop/main.cjs"}}')
shutil.copy2(root/'LICENSE',code/'LICENSE')
shutil.copy2(root/'THIRD_PARTY_NOTICES.md',code/'THIRD_PARTY_NOTICES.md')
licenses=code/'third-party-licenses';licenses.mkdir()
for name in ['docx-preview','pdfjs-dist','jszip','react','react-dom','motion']:
 package=root/'node_modules'/name
 source=next((package/filename for filename in ['LICENSE','LICENSE.md','LICENSE.markdown'] if (package/filename).exists()),None)
 if source:shutil.copy2(source,licenses/f'{name}-LICENSE.txt')
for name in ['pako','setimmediate','lie']:
 package=next((root/'node_modules/.pnpm').glob(f'{name}@*/node_modules/{name}'))
 source=next((package/filename for filename in ['LICENSE','LICENSE.txt','license.md'] if (package/filename).exists()),None)
 if source:shutil.copy2(source,licenses/f'{name}-LICENSE.txt')
shutil.copy2(root/'node_modules/pdfjs-dist/LICENSE',licenses/'mingcute-icons-LICENSE.txt')
shutil.copy2(root/'node_modules/electron/dist/LICENSE',licenses/'electron-LICENSE.txt')
shutil.copy2(root/'node_modules/electron/dist/LICENSES.chromium.html',code/'LICENSES.chromium.html')
index=code/'dist/index.html'
s=index.read_text().replace('<head>','<head><meta http-equiv="Content-Security-Policy" content="default-src \'self\'; script-src \'self\'; style-src \'self\' \'unsafe-inline\'; img-src \'self\' data: blob:; media-src \'self\' blob:; worker-src \'self\'; connect-src \'self\'; object-src \'none\'; base-uri \'self\'">')
index.write_text(s)
info=app/'Contents/Info.plist'
with info.open('rb') as f:p=plistlib.load(f)
p.update(CFBundleName='Ordex',CFBundleDisplayName='Ordex',CFBundleIdentifier='local.ordex.desktop',CFBundleExecutable='Ordex',CFBundleShortVersionString=app_version,CFBundleVersion=numeric_version,CFBundleIconFile='ordex.icns')
with info.open('wb') as f:plistlib.dump(p,f)
(app/'Contents/MacOS/Electron').rename(app/'Contents/MacOS/Ordex')
shutil.copy2(icon_icns,resources/'ordex.icns')
subprocess.run(['xattr','-cr',str(app)],check=True)
subprocess.run(['codesign','--force','--deep','--sign','-',str(app)],check=True)
build_date=datetime.now().strftime('%m/%d/%Y %H:%M:%S')
try:
 subprocess.run(['xcrun','SetFile','-d',build_date,'-m',build_date,str(app)],check=True)
except Exception as error:
 print('跳过 Finder 时间戳设置（不影响安装包）：'+str(error))
subprocess.run(['codesign','--verify','--deep','--strict',str(app)],check=True)
target=outputs/f'Ordex-macOS-arm64-zh-en-v{app_version}.dmg'
if target.exists():raise SystemExit('输出 DMG 已存在；停止打包以免覆盖')
os.symlink('/Applications',stage/'Applications')
subprocess.run(['hdiutil','create','-volname','Ordex','-srcfolder',str(stage),'-format','UDZO',str(target)],check=True)
shutil.rmtree(stage)
print(target)
