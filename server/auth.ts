import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { storage } from './storage';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface AuthenticatedAdmin {
  id: number;
  username: string;
  name: string;
}

export async function createAdmin(username: string, password: string, name: string) {
  const hashedPassword = await bcrypt.hash(password, 10);
  return await storage.createAdmin({
    username,
    password: hashedPassword,
    name,
  });
}

export async function authenticateAdmin(username: string, password: string): Promise<AuthenticatedAdmin | null> {
  const admin = await storage.getAdminByUsername(username);
  if (!admin) {
    return null;
  }
  
  const isValidPassword = await bcrypt.compare(password, admin.password);
  if (!isValidPassword) {
    return null;
  }
  
  return {
    id: admin.id,
    username: admin.username,
    name: admin.name,
  };
}

export function generateToken(admin: AuthenticatedAdmin): string {
  return jwt.sign(admin, JWT_SECRET, { expiresIn: '24h' });
}

export function verifyToken(token: string): AuthenticatedAdmin | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthenticatedAdmin;
  } catch (error) {
    return null;
  }
}
