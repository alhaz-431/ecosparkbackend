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
import contactRoutes from './routes/contact.routes';

const app = express();

const PORT: number = Number(process.env.PORT) || 5000;

// CORS - Multiple Origins Allowed (Localhost + Production Vercel)
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://ecospark-frontend.vercel.app', // আপনার Vercel ফ্রন্টএন্ড URL
  process.env.FRONTEND_URL, // .env ফাইল থেকে থাকলে সেটাও নিবে
].filter(Boolean) as string[];

app.use(
  cors({
    origin: (origin, callback) => {
      // Postman/Mobile App বা same-origin এর জন্য origin undefined হতে পারে
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('CORS constraint violation: Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

app.use(express.json());

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
app.use('/api/contact', contactRoutes);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});