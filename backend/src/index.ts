import app from './app';
import mongoose from 'mongoose';
import config from './config';
import { ensureIndexes } from './middleware/dbIndexes';

mongoose.connect(config.DATABASE_URL).then(async () => {
  await ensureIndexes();
  app.listen(parseInt(config.PORT), () => console.log('Backend listening on', config.PORT));
}).catch(err => { console.error(err); process.exit(1); });

