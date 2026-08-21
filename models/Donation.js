import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  name:    { type: String, required: true, trim: true },
  phone:   { type: String, required: true, trim: true },
  email:   { type: String, trim: true, default: '' },
  amount:  { type: Number, required: true, min: 1 },
  purpose: { type: String, default: 'General' },
  message: { type: String, default: '' },
  status:  { type: String, enum: ['Pending','Received','Verified'], default: 'Pending' },
}, { timestamps: true });

export default mongoose.models.Donation || mongoose.model('Donation', schema);
