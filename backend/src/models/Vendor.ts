import { Schema, model } from 'mongoose';

const VendorSchema = new Schema({
  name: { type: String, required: true },
  email: String,
  phone: String,
  address: String,
  taxId: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export default model('Vendor', VendorSchema);
