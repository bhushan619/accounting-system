import mongoose, { Document, Schema } from 'mongoose';

export interface ISettings extends Document {
  type: 'company' | 'defaults' | 'email' | 'currency';
  data: Record<string, any>;
  updatedBy?: mongoose.Types.ObjectId;
  updatedAt: Date;
}

const SettingsSchema = new Schema<ISettings>({
  type: {
    type: String,
    enum: ['company', 'defaults', 'email', 'currency'],
    required: true,
    unique: true
  },
  data: {
    type: Schema.Types.Mixed,
    required: true,
    default: {}
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

export default mongoose.model<ISettings>('Settings', SettingsSchema);
