import app from './app';
import mongoose from 'mongoose';
import config from './config';
mongoose.connect(config.DATABASE_URL).then(()=> {
  app.listen(parseInt(config.PORT), ()=> console.log('Backend listening on', config.PORT));
}).catch(err=> { console.error(err); process.exit(1); });
