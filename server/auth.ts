import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from './types';

const JWT_SECRET = process.env.JWT_SECRET || 'sbom-guardian-jwt-college-secret-key-2026';

export interface AuthTokenPayload {
  userId: string;
  email: string;
  role: 'ADMIN' | 'SECURITY_ANALYST' | 'DEVELOPER';
}

// In-memory user store initialized with realistic role accounts
const USERS: User[] = [
  {
    id: 'usr-admin-1',
    name: 'Sarah Connor',
    email: 'admin@sbomguardian.internal',
    role: 'ADMIN',
    createdAt: '2026-01-10T08:00:00Z'
  },
  {
    id: 'usr-sec-2',
    name: 'Alex Rivera',
    email: 'security@sbomguardian.internal',
    role: 'SECURITY_ANALYST',
    createdAt: '2026-01-15T09:30:00Z'
  },
  {
    id: 'usr-dev-3',
    name: 'David Chen',
    email: 'dev@sbomguardian.internal',
    role: 'DEVELOPER',
    createdAt: '2026-02-01T11:00:00Z'
  }
];

// In-memory password hash map
const USER_PASSWORDS: Record<string, string> = {
  'admin@sbomguardian.internal': bcrypt.hashSync('admin123!', 10),
  'security@sbomguardian.internal': bcrypt.hashSync('security123!', 10),
  'dev@sbomguardian.internal': bcrypt.hashSync('dev123!', 10)
};

export function registerUser(name: string, email: string, password: string, role: 'ADMIN' | 'SECURITY_ANALYST' | 'DEVELOPER' = 'DEVELOPER'): { user: User; token: string } {
  const existing = USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    throw new Error('A user with this email address already exists.');
  }

  const id = `usr-${Date.now()}`;
  const user: User = {
    id,
    name,
    email: email.toLowerCase(),
    role,
    createdAt: new Date().toISOString()
  };

  USERS.push(user);
  USER_PASSWORDS[user.email] = bcrypt.hashSync(password, 10);

  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role } as AuthTokenPayload,
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  return { user, token };
}

export function loginUser(email: string, password: string): { user: User; token: string } {
  const user = USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    throw new Error('Invalid email or password credentials.');
  }

  const hash = USER_PASSWORDS[user.email];
  if (!hash || !bcrypt.compareSync(password, hash)) {
    throw new Error('Invalid email or password credentials.');
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role } as AuthTokenPayload,
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  return { user, token };
}

export function verifyToken(token: string): AuthTokenPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
  } catch {
    throw new Error('Unauthorized or expired session token.');
  }
}

export function getUserById(id: string): User | undefined {
  return USERS.find(u => u.id === id);
}

export function getAllUsers(): User[] {
  return USERS.map(u => ({ ...u }));
}
