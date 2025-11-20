import { Schema, model } from 'mongoose';
const ClientSchema = new Schema({ name: String, email: String, createdAt: { type: Date, default: Date.now }});
export default model('Client', ClientSchema);
