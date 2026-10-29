"""Read-only checks against public game/crawler responses. No score writes or social posts."""
from concurrent.futures import ThreadPoolExecutor
from hashlib import sha256
from html.parser import HTMLParser
from pathlib import Path
from urllib.request import Request, urlopen
import json
import subprocess

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = 'https://siempretequila.com/games/siempre-zombie/'
IMAGE = PUBLIC + 'assets/social/siempre-zombie-share-v1.jpg'

class Metadata(HTMLParser):
    def __init__(self): super().__init__(); self.tags = {}
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'meta': self.tags[a.get('property', a.get('name', ''))] = a.get('content', '')
        if tag == 'link' and a.get('rel') == 'canonical': self.tags['canonical'] = a.get('href')

def fetch(url, ua):
    with urlopen(Request(url, headers={'User-Agent': ua}), timeout=30) as r:
        return r.status, r.url, r.headers, r.read()

def crawl(ua):
    status, final, headers, body = fetch(PUBLIC, ua)
    p = Metadata(); p.feed(body.decode())
    assert status == 200 and final == PUBLIC
    assert p.tags['canonical'] == PUBLIC and p.tags['og:url'] == PUBLIC
    assert p.tags['og:image'] == IMAGE and p.tags['twitter:image'] == IMAGE
    assert p.tags['og:image:width'] == '1200' and p.tags['og:image:height'] == '630'
    assert p.tags['twitter:card'] == 'summary_large_image'
    assert b'id="share-score"' in body and b'score-sharing.js?v=20261028-1' in body
    return {'userAgent': ua, 'status': status, 'finalUrl': final, 'title': p.tags['og:title'], 'image': IMAGE}

def file_check(name):
    status, final, headers, body = fetch(PUBLIC+name, 'SiempreReleaseCheck/1.0')
    local = (ROOT/'game'/name).read_bytes()
    if not name.endswith('.jpg'):
        body=body.replace(b'\r\n', b'\n'); local=local.replace(b'\r\n', b'\n')
    assert status == 200 and body == local, name
    if name.endswith('.jpg'): assert headers.get_content_type() == 'image/jpeg'
    return {'path': name, 'status': status, 'contentType': headers.get_content_type(), 'bytes': len(body), 'sha256': sha256(body).hexdigest(), 'matchesLocal': True}

if __name__ == '__main__':
    with ThreadPoolExecutor(max_workers=4) as pool:
        crawlers=list(pool.map(crawl, ['facebookexternalhit/1.1', 'WhatsApp/2.24.0']))
        files=list(pool.map(file_check, ['index.html', 'score-sharing.js', 'score-sharing.css', 'assets/social/siempre-zombie-share-v1.jpg', 'siempre-zombie.js', 'zombie-intro.js', 'leaderboard-config.js', 'driver-viewmodel.js', 'muerto-rpg-runtime.js']))
    status, final, _, _ = fetch(PUBLIC.rstrip('/'), 'WhatsApp/2.24.0')
    assert status == 200 and final == PUBLIC
    report={'publicUrl': PUBLIC, 'commit': subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(), 'deploymentId':'dpl_BqUgbBPexhjx5QxfdWGjAZmJQEkL', 'crawlerResponses':crawlers, 'files':files, 'slashRedirect':True, 'socialContentPosted':False, 'mobilePerformance':'Plan only; no performance edits or physical-phone measurements.'}
    target=Path(__file__).with_name('SOCIAL-SHARING-RECEIPT.json')
    target.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'passed':True,'crawlerAgents':len(crawlers),'matchingFiles':len(files),'receipt':str(target)}))
