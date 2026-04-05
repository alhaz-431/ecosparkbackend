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
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// বেজ রাউট (চেক করার জন্য যে সার্ভার চলছে কি না)
app.get('/', (req, res) => {
  res.json({ message: 'EcoSpark Hub API is running! 🌱' });
});

// --- রাউট সেটআপ ---

// ১. অথেনটিকেশন (Login, Register)
app.use('/api/auth', authRoutes);

// ২. অ্যাডমিন প্যানেল (Manage Users, Stats)
app.use('/api/admin', adminRoutes);

// ৩. ক্যাটাগরি সংক্রান্ত
app.use('/api/categories', categoryRoutes);

// ৪. আইডিয়া সংক্রান্ত (মূল লিস্ট এবং ডিটেইলস)
app.use('/api/ideas', ideaRoutes);

// ৫. ভোট সংক্রান্ত (আলাদা পাথ দিলে ম্যানেজ করা সহজ)
app.use('/api/votes', voteRoutes);

// ৬. পেমেন্ট সংক্রান্ত
app.use('/api/payments', paymentRoutes);

// সার্ভার লিসেনিং
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});