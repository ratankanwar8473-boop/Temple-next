import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  name:    { type: String, required: true, trim: true },
  phone:   { type: String, required: true, trim: true },
  email:   { type: String, trim: true, default: '' },
  type:    { type: String, default: 'General' },
  message: { type: String, required: true },
  status:  { type: String, enum: ['Unread','Read','Replied'], default: 'Unread' },
}, { timestamps: true });

export default mongoose.models.Enquiry || mongoose.model('Enquiry', schema);
