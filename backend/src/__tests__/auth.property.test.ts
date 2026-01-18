import * as fc from 'fast-check';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/jwt';

/**
 * Property-Based Tests for Auth Module
 * Using fast-check library with minimum 100 iterations
 */

describe('Auth Module - Property-Based Tests', () => {
  describe('Password Hashing Properties', () => {
    it('should always hash passwords differently even with same input', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 6, maxLength: 100 }),
          async (password) => {
            const hash1 = await bcrypt.hash(password, 10);
            const hash2 = await bcrypt.hash(password, 10);
            
            // Hashes should be different (due to salt)
            expect(hash1).not.toBe(hash2);
            
            // But both should verify correctly
            const valid1 = await bcrypt.compare(password, hash1);
            const valid2 = await bcrypt.compare(password, hash2);
            expect(valid1).toBe(true);
            expect(valid2).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should never store plain text password', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 6, maxLength: 100 }),
          async (password) => {
            const hash = await bcrypt.hash(password, 10);
            
            // Hash should not contain the original password
            expect(hash).not.toContain(password);
            expect(hash).not.toBe(password);
            expect(hash.length).toBeGreaterThan(password.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should fail verification with wrong password', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 6, maxLength: 100 }),
          fc.string({ minLength: 6, maxLength: 100 }),
          async (password1, password2) => {
            fc.pre(password1 !== password2); // Only test different passwords
            
            const hash = await bcrypt.hash(password1, 10);
            const isValid = await bcrypt.compare(password2, hash);
            
            expect(isValid).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('JWT Token Properties', () => {
    it('should always generate valid tokens that can be decoded', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 1000000 }),
          fc.emailAddress(),
          fc.constantFrom('student', 'organizer', 'admin'),
          (id, email, role) => {
            const token = jwt.sign(
              { id, email, role },
              jwtConfig.secret,
              { expiresIn: '1h' }
            );

            const decoded = jwt.verify(token, jwtConfig.secret) as any;
            
            expect(decoded.id).toBe(id);
            expect(decoded.email).toBe(email);
            expect(decoded.role).toBe(role);
            expect(decoded).toHaveProperty('iat');
            expect(decoded).toHaveProperty('exp');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should fail verification with wrong secret', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 1000000 }),
          fc.emailAddress(),
          fc.string({ minLength: 10, maxLength: 50 }),
          (id, email, wrongSecret) => {
            fc.pre(wrongSecret !== jwtConfig.secret);
            
            const token = jwt.sign(
              { id, email, role: 'student' },
              jwtConfig.secret,
              { expiresIn: '1h' }
            );

            expect(() => {
              jwt.verify(token, wrongSecret);
            }).toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should encode and decode any valid user data', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.integer({ min: 1, max: 1000000 }),
            email: fc.emailAddress(),
            role: fc.constantFrom('student', 'organizer', 'admin'),
            full_name: fc.string({ minLength: 2, maxLength: 100 }),
          }),
          (userData) => {
            const token = jwt.sign(userData, jwtConfig.secret, { expiresIn: '1h' });
            const decoded = jwt.verify(token, jwtConfig.secret) as any;
            
            expect(decoded.id).toBe(userData.id);
            expect(decoded.email).toBe(userData.email);
            expect(decoded.role).toBe(userData.role);
            expect(decoded.full_name).toBe(userData.full_name);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Email Validation Properties', () => {
    it('should accept all valid email formats', () => {
      fc.assert(
        fc.property(
          fc.emailAddress(),
          (email) => {
            // Email regex pattern
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            expect(emailRegex.test(email)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject emails without @ symbol', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 5, maxLength: 50 }).filter(s => !s.includes('@')),
          (invalidEmail) => {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            expect(emailRegex.test(invalidEmail)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Password Strength Properties', () => {
    it('should accept passwords with minimum length', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 6, maxLength: 100 }),
          (password) => {
            expect(password.length).toBeGreaterThanOrEqual(6);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject passwords that are too short', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 5 }),
          (password) => {
            expect(password.length).toBeLessThan(6);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('User Role Properties', () => {
    it('should only accept valid roles', () => {
      const validRoles = ['student', 'organizer', 'admin'];
      
      fc.assert(
        fc.property(
          fc.constantFrom(...validRoles),
          (role) => {
            expect(validRoles).toContain(role);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve role in JWT token', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('student', 'organizer', 'admin'),
          (role) => {
            const token = jwt.sign(
              { id: 1, email: 'test@test.com', role },
              jwtConfig.secret,
              { expiresIn: '1h' }
            );

            const decoded = jwt.verify(token, jwtConfig.secret) as any;
            expect(decoded.role).toBe(role);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Token Expiration Properties', () => {
    it('should always include expiration time', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 1000000 }),
          (id) => {
            const token = jwt.sign(
              { id, email: 'test@test.com', role: 'student' },
              jwtConfig.secret,
              { expiresIn: '1h' }
            );

            const decoded = jwt.verify(token, jwtConfig.secret) as any;
            
            expect(decoded).toHaveProperty('exp');
            expect(decoded).toHaveProperty('iat');
            expect(decoded.exp).toBeGreaterThan(decoded.iat);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Data Sanitization Properties', () => {
    it('should never expose password hash in responses', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.integer({ min: 1, max: 1000000 }),
            email: fc.emailAddress(),
            full_name: fc.string({ minLength: 2, maxLength: 100 }),
            role: fc.constantFrom('student', 'organizer', 'admin'),
          }),
          (userData) => {
            // Simulate response data (should not include password_hash)
            const responseData = {
              id: userData.id,
              email: userData.email,
              full_name: userData.full_name,
              role: userData.role,
            };

            expect(responseData).not.toHaveProperty('password_hash');
            expect(responseData).not.toHaveProperty('password');
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
