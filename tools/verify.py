"""Dependency, provenance and syntax checks. No browser automation or new packages."""
from pathlib import Path
import hashlib, json, re, struct, subprocess, shutil
from html.parser import HTMLParser

ROOT = Path(__file__).resolve().parents[1]
GAME = ROOT / 'game'
errors, refs = [], set()
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()

def local(base, value):
    if not value or value.startswith(('data:', '#', 'http:', 'https:', 'blob:')): return
    path = value.split('?')[0].split('#')[0]
    if not path or '${' in path: return
    target = (base / path).resolve()
    refs.add(str(target.relative_to(ROOT)) if target.is_relative_to(ROOT) else str(target))
    if not target.is_relative_to(ROOT) or not target.is_file(): errors.append(f'Missing/outside local dependency: {base.name}: {value}')

class HTMLRefs(HTMLParser):
    def __init__(self, p): super().__init__(); self.p=p; self.ids=[]
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if a.get('id'): self.ids.append(a['id'])
        for k in ['src','href','data-sheet']:
            if k in a: local(self.p.parent, a[k])

node = shutil.which('node')
assert node, 'Existing Node runtime required'
scripts = list(GAME.rglob('*.js'))
for p in scripts:
    s=p.read_text(encoding='utf-8-sig')
    parsed=subprocess.run([node,'--input-type=module','--check'], input=s, text=True, encoding='utf-8', capture_output=True, timeout=15)
    if parsed.returncode: errors.append(f'JS parse: {p}: {parsed.stderr}')
    for value in re.findall(r'''(?m)^import\b[\s\S]*?\bfrom\s*['"]([^'"]+)['"]''',s): local(p.parent,value)
    for value in ([] if 'vendor' in p.parts else re.findall(r'''['"]((?:\./)?assets/[^'"\s]+)['"]''',s)):
        if value.endswith(('-', '/')): continue  # expanded dynamic filenames checked below
        local(GAME,value)
for p in [ROOT/'index.html', *GAME.rglob('*.html')]:
    parser=HTMLRefs(p); parser.feed(p.read_text(encoding='utf-8-sig'))
    if len(parser.ids)!=len(set(parser.ids)): errors.append(f'Duplicate HTML ids: {p}')
    if '{{' in p.read_text(): errors.append(f'Unresolved template: {p}')
for p in GAME.glob('*.css'):
    for value in re.findall(r'url\([\'"]?([^\)]+)',p.read_text()):
        value=value.rstrip('\'"')
        if value.startswith(('data:','%23')): continue
        local(p.parent,value)
for skin in ['vivo','muerto']:
    for mode in ['low','full','empty']: local(GAME,f'assets/fx-{skin}-{mode}.webp')
    local(GAME,f'assets/card-{skin}.webp')
    local(GAME,f'assets/taco-eating/{skin}.png')
for entry in json.loads((GAME/'assets/new-held-weapons/runtime-manifest.json').read_text())['runtimeAssets']:
    local(GAME, 'assets/new-held-weapons/'+entry['file'])
for name in ['poses-native.png','poses-muerto.png']:
    local(GAME, 'assets/coa-new-sheet/'+name)
for name in ['ken.png','ken-alpha.png','monica.png','dan.png','alex.png','rick.png','sergio.png','sergio-alpha.png']:
    local(GAME, 'assets/character-originals/'+name)
audio=(GAME/'siempre-audio.js').read_text()
names=re.findall(r'\b(\w+):\s*\.\d+',audio[audio.index('const FILES'):audio.index('const VARIANTS')])
for n in names: local(GAME,f'audio/{n}.mp3')

glbs=[]
for p in GAME.rglob('*.glb'):
    b=p.read_bytes()
    assert b[:4]==b'glTF' and struct.unpack_from('<I',b,8)[0]==len(b)
    d=json.loads(b[20:20+struct.unpack_from('<I',b,12)[0]])
    for kind in ['images','buffers']:
        for item in d.get(kind,[]):
            if 'uri' in item: local(p.parent,item['uri'])
    tris=sum(d['accessors'][q['indices']]['count']//3 if 'indices' in q else d['accessors'][q['attributes']['POSITION']]['count']//3 for m in d.get('meshes',[]) for q in m['primitives'] if q.get('mode',4)==4)
    glbs.append(dict(path=str(p.relative_to(ROOT)),sha256=sha(p),bytes=len(b),triangles=tris,bones=sum(len(x['joints']) for x in d.get('skins',[])),clips=[a['name'] for a in d.get('animations',[])],collisionNodes=sum(n.get('name','').startswith('col_') for n in d.get('nodes',[]))))

manifest=json.loads((ROOT/'SOURCE-MANIFEST.json').read_text())
for r in manifest['files']:
    p=ROOT/r['path']
    r.update(sha256=sha(p),bytes=p.stat().st_size,modified=sha(p)!=r['sourceSha256'])
    r['sourceUnchangedAtVerification']=sha(Path(r['source']))==r['sourceSha256']
    if not r['sourceUnchangedAtVerification']: errors.append('Source changed since copy: '+r['source'])
manifest['glbInspection']=glbs
manifest['checks']=dict(jsFilesParsed=len(scripts),localDependenciesResolved=len(refs),audioFiles=len(names),sourceFilesChecked=len(manifest['files']),errors=errors)
(ROOT/'SOURCE-MANIFEST.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
print(json.dumps(dict(**manifest['checks'],glbs=glbs),indent=2))
raise SystemExit(bool(errors))
