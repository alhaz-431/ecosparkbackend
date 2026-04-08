import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../prismaClient';

export const register = async (req: Request, res: Response) => {
  try {
    // এখানে role রিসিভ করা হচ্ছে
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'All fields including role are required' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // ডাটাবেসে ইউজার তৈরির সময় role ও সেভ হবে
    const user = await prisma.user.create({
      data: { 
        name, 
        email, 
        password: hashedPassword,
        role: role // 'USER' অথবা 'ADMIN' সেভ হবে
      },
    });

    res.status(201).json({
      message: 'Registration successful',
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    // ফ্রন্টএন্ড থেকে পাঠানো role রিসিভ করুন
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ message: 'Email, password and role are required' });
    }

    // ডাটাবেসে ইমেইল এবং রোল—দুইটাই মিলিয়ে দেখা হচ্ছে
    const user = await prisma.user.findFirst({ 
      where: { 
        email: email,
        role: role 
      } 
    });

    // যদি ঐ রোলের কোনো ইউজার না পাওয়া যায়
    if (!user) {
      return res.status(400).json({ 
        message: `No ${role.toLowerCase()} account found with this email.` 
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};