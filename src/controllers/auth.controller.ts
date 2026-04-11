import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../prismaClient';

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = req.body;

    // ১. সব ফিল্ড আছে কিনা চেক করা (এখানে role অবশ্যই 'MEMBER' অথবা 'ADMIN' হতে হবে)
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'All fields including role are required' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // ২. ডাটাবেসে ইউজার তৈরি (Prisma Schema অনুযায়ী role সেভ হবে)
    const user = await prisma.user.create({
      data: { 
        name, 
        email, 
        password: hashedPassword,
        role: role // এখানে 'MEMBER' অথবা 'ADMIN' আসবে
      },
    });

    res.status(201).json({
      message: 'Registration successful',
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ message: 'Email, password and role are required' });
    }

    // ৩. ডাটাবেসে ইমেইল এবং রোল—দুইটাই মিলিয়ে দেখা হচ্ছে
    const user = await prisma.user.findFirst({ 
      where: { 
        email: email,
        role: role // ইউজার MEMBER হিসেবে লগইন করতে চাইলে ডাটাবেজেও MEMBER থাকতে হবে
      } 
    });

    if (!user) {
      return res.status(400).json({ 
        message: `No ${role.toLowerCase()} account found with this email.` 
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // ৪. টোকেন তৈরি
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
    console.error(error);
    res.status(500).json({ message: 'Server error during login' });
  }
};