import os, zipfile
src='src'; out='files'
os.makedirs(out, exist_ok=True)
for name in sorted(os.listdir(src)):
    d=os.path.join(src,name); paths=[]
    for root,_,fs in os.walk(d):
        for f in fs: paths.append(os.path.relpath(os.path.join(root,f),d))
    paths.sort(key=lambda p:(p!='[Content_Types].xml', not p.startswith('_rels'), p))
    with zipfile.ZipFile(os.path.join(out,name),'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
        for p in paths: z.write(os.path.join(d,p), p.replace(os.sep,'/'))
    print(name, os.path.getsize(os.path.join(out,name)), zipfile.ZipFile(os.path.join(out,name)).testzip())
