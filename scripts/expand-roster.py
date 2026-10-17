"""Expose the first N catalogue players per team after their artwork is reviewed.
Usage: python scripts/expand-roster.py 4
Role overrides are presentation groups for fire-leader selection, not stats.
"""
from pathlib import Path
import json,sys
root=Path(__file__).resolve().parents[1]
limit=int(sys.argv[1]);assert 2<=limit<=13
league=json.loads((root/'public/league.json').read_text())
old=json.loads((root/'public/featured.json').read_text());roles={p['id']:p['role'] for p in old}
roles.update({'201935':'G','1630578':'C','1630163':'G','1629638':'G','1630700':'G','1629008':'F','1628389':'C','1628969':'F','1628401':'G','1630596':'C','202695':'F','1627750':'G','1626157':'C','1631105':'C','203507':'F','1629675':'C','201939':'G','1631114':'F'})
featured=[]
for t in league['teams']:
 for p in t['players'][:limit]:
  assert p['id'] in roles,'Review position group for '+p['name']
  featured.append({**{'teamId':t['id'],'teamName':t['name']},**{k:p[k] for k in ['id','name','heightCm','weightKg','heightDisplay','weightLb']},'role':roles[p['id']]})
(root/'public/featured.json').write_text(json.dumps(featured,indent=2)+'\n')
p=root/'public/featured.js';s=p.read_text();s='export const FEATURED='+json.dumps(featured,separators=(',',':'))+';\n'+s.split('\n',1)[1];p.write_text(s)
print(json.dumps({'players':len(featured),'perTeam':limit}))
