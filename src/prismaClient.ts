import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

let prisma: PrismaClient;

// যদিDATABASE_URL এ 'neon' বা ক্লাউড ইউআরএল থাকে তবে অ্যাডাপ্টার ব্যবহার করবে
if (process.env.NODE_ENV === 'production') {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  const adapter = new PrismaPg(pool);
  prisma = new PrismaClient({ adapter });
} else {
  // লোকাল ডেভেলপমেন্টের জন্য সাধারণ ক্লায়েন্ট
  prisma = new PrismaClient();
}

export default prisma;