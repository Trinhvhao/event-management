import prisma from '../config/database';

// Increase timeout for database operations
jest.setTimeout(30000);

// Clean up database after all tests
afterAll(async () => {
  await prisma.$disconnect();
});
