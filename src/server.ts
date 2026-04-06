import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';

// রাউট ইমপোর্ট
import authRoutes from './routes/auth.routes';
import ideaRoutes from './routes/idea.routes';
import categoryRoutes from './routes/category.routes';
import adminRoutes from './routes/admin.routes';
import voteRoutes from './routes/vote.routes';
import paymentRoutes from './routes/payment.routes';

const app = express();

// ১. টাইপস্ক্রিপ্ট এরর দূর করতে পোর্টকে নম্বর হিসেবে ডিফাইন করুন
const PORT: number = Number(process.env.PORT) || 5000;

// ২. CORS কনফিগারেশন (ভিডিওর জন্য আপাতত সব এলাউ করা হয়েছে)
app.use(cors({
  origin: '*', 
  credentials: true
}));

app.use(express.json());

// বেজ রাউট
app.get('/', (req, res) => {
  res.json({ message: 'EcoSpark Hub API is running! 🌱' });
});

// --- রাউট সেটআপ ---
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/ideas', ideaRoutes);
app.use('/api/votes', voteRoutes);
app.use('/api/payments', paymentRoutes);

// ৩. সার্ভার লিসেনিং (রেন্ডারের জন্য '0.0.0.0' হোস্ট ব্যবহার করা হয়েছে)
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});