"""Build pose metadata from complete connected silhouettes, never uniform tiles.
Requires Pillow, NumPy and SciPy. PNG source artwork is not modified.
"""
from pathlib import Path
from PIL import Image
import numpy as np,json
from scipy.ndimage import label,find_objects
root=Path(__file__).resolve().parents[1]/'public'
data={}
for p in json.loads((root/'featured.json').read_text()):
 path=root/'art'/('player-'+p['id']+'-v2.png')
 im=np.array(Image.open(path).convert('RGBA'));h,w=im.shape[:2]
 mask=im[:,:,3]>100
 # Durant's raised dunk hand touches the preceding running shoe. Separate
 # those two source poses at the hand/shoe seam before finding silhouettes.
 if p['name']=='Kevin Durant': mask[923:925,:314]=False
 labels,n=label(mask,structure=np.ones((3,3)))
 sizes=np.bincount(labels.ravel());rows=[[],[],[],[]]
 for j,s in enumerate(find_objects(labels)):
  if sizes[j+1]<3000:continue
  ys,xs=s;row=min(3,int(((ys.start+ys.stop)/2)/(h/4)))
  rows[row].append((xs.start,ys.start,xs.stop,ys.stop))
 for row in rows:row.sort(key=lambda b:(b[0]+b[2])/2)
 assert [len(r) for r in rows] in ([4,4,4,4],[4,4,4,3]),(p['name'],rows)
 physical=[b for row in rows for b in row]
 mapping=([0,1,2,3,4,5,6,7,8,7,9,10,11,12,13,14] if len(physical)==15 else list(range(16)))
 frames=[]
 for i in mapping:
  x,y,ex,ey=physical[i];sx=max(0,x-2);sy=max(0,y-2);ex=min(w,ex+2);ey=min(h,ey+2)
  # Preserve a consistent tile origin for the stride; nonuniform final rows
  # use their actual silhouette centre rather than an imaginary fourth tile.
  ax=round(((i%4)+.5)*w/4) if i<12 or len(physical)==16 else round((x+ex)/2)
  frames.append({'box':[sx,sy,ex-sx,ey-sy],'anchor':[ax,ey]})
 data[p['name']]={'id':p['id'],'src':'/art/'+path.name,'bodyPixels':sum(f['box'][3] for f in frames[:2])/2,'width':w,'height':h,'frames':frames}
(root/'art-manifest.js').write_text('export const ATLAS_DATA='+json.dumps(data,separators=(',',':'))+';\n')
print('Built complete silhouettes for',len(data),'athletes')
