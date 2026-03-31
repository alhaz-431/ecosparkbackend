import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import ideaRoutes from './routes/idea.routes';
import categoryRoutes from './routes/category.routes';
import adminRoutes from './routes/admin.routes';
import voteRoutes from './routes/vote.routes';
import paymentRoutes from './routes/payment.routes';


const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'EcoSpark Hub API is running! 🌱' });
});

app.use('/api/auth', authRoutes);
app.use('/api/ideas', ideaRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ideas', voteRoutes);
app.use('/api/ideas', paymentRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

