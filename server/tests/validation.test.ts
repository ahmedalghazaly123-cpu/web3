import { describe, it, expect } from 'vitest';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  role: z.enum(['student', 'teacher', 'admin', 'owner', 'parent']),
});

describe('Validation', () => {
  it('rejects invalid email', () => {
    expect(() => loginSchema.parse({ email: 'bad', password: 'x' })).toThrow();
  });

  it('rejects short password on signup', () => {
    expect(() => signupSchema.parse({ email: 'a@b.com', password: '123', name: 'A', role: 'student' })).toThrow();
  });

  it('accepts valid signup', () => {
    const data = signupSchema.parse({ email: 'a@b.com', password: '123456', name: 'Ahmed', role: 'student' });
    expect(data.role).toBe('student');
  });
});
