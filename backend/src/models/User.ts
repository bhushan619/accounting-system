import { Schema, model } from 'mongoose';
const UserSchema = new Schema({ email: String, password: String, createdAt: { type: Date, default: Date.now }});
export default model('User', UserSchema);
