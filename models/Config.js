import mongoose from 'mongoose';

const timingSchema  = new mongoose.Schema({ icon: String, title: String, time: String, days: String }, { _id: false });
const eventSchema   = new mongoose.Schema({ day: String, month: String, year: String, title: String, desc: String, tag: String }, { _id: false });
const gallerySchema = new mongoose.Schema({ url: String, caption: String }, { _id: false });

const schema = new mongoose.Schema({
  key: { type: String, default: 'main', unique: true },
  templeName: { type: String, default: 'Shri [Temple Name] Mandir' },
  templeDeity: { type: String, default: '[Deity Name]' },
  templeTagline: { type: String, default: 'A sacred abode of peace, devotion and divine blessings.' },
  templeEstYear: { type: String, default: 'Est. 1950' },
  templeLocation: { type: String, default: 'City, State' },
  heroShloka: { type: String, default: 'सर्वे भवन्तु सुखिनः' },
  heroSubShloka: { type: String, default: 'ॐ शान्ति शान्ति शान्ति ॥' },
  topbarText: { type: String, default: '🙏 Jay Shri Ram — ॐ नमः शिवाय — Har Har Mahadev 🙏' },
  aboutPara1: { type: String, default: 'Our temple is a sacred place of worship that has been a source of spiritual strength and community for generations of devotees.' },
  aboutPara2: { type: String, default: 'The temple stands as a symbol of our rich cultural and spiritual heritage, offering a tranquil retreat from the chaos of daily life.' },
  aboutPara3: { type: String, default: 'From daily pujas and abhishekam to grand festivals, the temple is always alive with spiritual energy and community spirit.' },
  aboutImageUrl: { type: String, default: 'https://images.unsplash.com/photo-1561361058-c24cecae35ca?w=800&q=80' },
  stat1: { type: String, default: '500+' }, stat1Label: { type: String, default: 'Daily Devotees' },
  stat2: { type: String, default: '365' },  stat2Label: { type: String, default: 'Days Open' },
  stat3: { type: String, default: '50+' },  stat3Label: { type: String, default: 'Annual Events' },
  contactAddress: { type: String, default: 'Temple Address, City, State' },
  contactPhone:   { type: String, default: '+91 XXXXX XXXXX' },
  contactEmail:   { type: String, default: 'info@temple.org' },
  contactHours:   { type: String, default: 'Every Day — 5:30 AM to 9:00 PM' },
  contactSocial:  { type: String, default: 'Follow us on Facebook & Instagram' },
  googleMapsEmbed: { type: String, default: '' },
  cloudinaryCloudName:    { type: String, default: '' },
  cloudinaryUploadPreset: { type: String, default: '' },
  timings: { type: [timingSchema], default: [
    { icon: '🌅', title: 'Mangala Aarti',  time: '5:30 AM',           days: 'Every Day' },
    { icon: '🌄', title: 'Pratah Darshan', time: '6:00 AM – 12:00 PM',days: 'Every Day' },
    { icon: '☀️', title: 'Madhyan Aarti',  time: '12:00 PM',          days: 'Every Day' },
    { icon: '🌆', title: 'Sandhya Aarti',  time: '7:00 PM',           days: 'Every Day' },
    { icon: '🌙', title: 'Shayan Aarti',   time: '8:30 PM',           days: 'Every Day' },
    { icon: '⭐', title: 'Special Puja',   time: 'On Request',        days: 'All Days'  },
  ]},
  events: { type: [eventSchema], default: [
    { day: '01', month: 'JAN', year: '2025', title: 'New Year Puja',   desc: 'Special abhishek and puja to welcome the New Year.', tag: 'Special Puja' },
    { day: '15', month: 'FEB', year: '2025', title: 'Maha Shivratri',  desc: 'Grand celebration with night-long puja and aarti.',  tag: 'Festival' },
    { day: '25', month: 'MAR', year: '2025', title: 'Ram Navami',      desc: 'Birthday of Lord Ram celebrated with kirtan and prasad.', tag: 'Festival' },
  ]},
  galleryImages: { type: [gallerySchema], default: [
    { url: 'https://images.unsplash.com/photo-1545126913-69a83ad9c2d2?w=800&q=80', caption: 'Temple Entrance' },
    { url: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=600&q=80', caption: 'Evening Aarti' },
    { url: 'https://images.unsplash.com/photo-1519817800575-a8f97fc1e2bb?w=600&q=80', caption: 'Festival' },
    { url: 'https://images.unsplash.com/photo-1516563248398-78e0e3e7ab5c?w=600&q=80', caption: 'Devotees' },
    { url: 'https://images.unsplash.com/photo-1601507134941-d0e2f7e9af6a?w=800&q=80', caption: 'Courtyard' },
    { url: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=600&q=80', caption: 'Sacred Rituals' },
  ]},
  donatePurposes: { type: [String], default: [
    'Daily Puja & Aarti', 'Temple Maintenance & Renovation',
    'Festival Celebrations', 'Prasad & Langar (Community Meal)', 'Education & Charitable Activities',
  ]},
}, { timestamps: true });

export default mongoose.models.Config || mongoose.model('Config', schema);
