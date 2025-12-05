import { Schema, model } from 'mongoose';

const RolePermissionSchema = new Schema({
  role: { 
    type: String, 
    required: true, 
    unique: true,
    enum: ['admin', 'accountant', 'employee'] 
  },
  permissions: [{ type: String }],
  updatedAt: { type: Date, default: Date.now },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' }
});

export default model('RolePermission', RolePermissionSchema);
