// Local test runner only: some containers do not expose interface enumeration.
const os=require('node:os');const original=os.networkInterfaces;
os.networkInterfaces=function(){try{return original();}catch{return {};}};
