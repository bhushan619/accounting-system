import multer from 'multer';
import path from 'path';
import fs from 'fs';
import config from '../config';
function ensure(dir){ if(!fs.existsSync(dir)) fs.mkdirSync(dir,{ recursive:true }); }
export function diskStorageFor(folder){ const dest = path.join(config.UPLOADS_DIR, folder); ensure(dest); return multer.diskStorage({ destination: (req,file,cb)=>cb(null,dest), filename:(req,file,cb)=>cb(null, Date.now()+'-'+file.originalname.replace(/\s+/g,'-')) }); }
