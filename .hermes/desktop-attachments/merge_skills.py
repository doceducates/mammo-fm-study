import zipfile, os
from collections import defaultdict

LOCAL = 'C:/Users/muham/AppData/Local/hermes/skills'
ZIP = 'E:/Research/mammo-fm-study/.hermes/desktop-attachments/hermes-skills.zip'
EXCLUDE_DIRS = {'.hub', '.archive', '.curator_state', '.bundled_manifest'}

def rel(p):
    parts = p.split('/')
    return '/'.join(parts[3:])

added, skipped = [], []
seen_dirs = set()
with zipfile.ZipFile(ZIP) as z:
    names = [n for n in z.namelist() if n.startswith('root/.hermes/skills/') and not n.endswith('/')]
    for n in names:
        r = rel(n)
        top = r.split('/')[0]
        if top in EXCLUDE_DIRS or r in {'.usage.json', '.usage.json.lock'}:
            skipped.append(r); continue
        tgt = os.path.join(LOCAL, r)
        if os.path.exists(tgt):
            skipped.append(r); continue
        d = os.path.dirname(tgt)
        if d not in seen_dirs:
            os.makedirs(d, exist_ok=True)
            seen_dirs.add(d)
        with z.open(n) as src, open(tgt, 'wb') as out:
            out.write(src.read())
        added.append(r)

print('ADDED:', len(added))
print('SKIPPED (existing local or internal):', len(skipped))
cats = defaultdict(int)
for a in added:
    cats[a.split('/')[0]] += 1
print()
print('New files per top-level:')
for c in sorted(cats):
    print(f'  {c}: {cats[c]}')
