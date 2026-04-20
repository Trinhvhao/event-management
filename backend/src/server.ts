import dotenv from 'dotenv';

// Load environment variables FIRST
dotenv.config();

import app from './app';
import prisma from './config/database';
import cron from 'node-cron';
import { eventService } from './services/events.service';

const PORT = process.env.PORT || 7776;

// Test database connection
async function testDatabaseConnection() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

// Start server
async function startServer() {
  try {
    await testDatabaseConnection();

    // Cron job: cập nhật trạng thái sự kiện + gửi feedback request mỗi 5 phút
    cron.schedule('*/5 * * * *', async () => {
      try {
        await eventService.updateStatuses();
        console.log('✅ Event statuses updated');
      } catch (error) {
        console.error('❌ Failed to update event statuses:', error);
      }
    });

    // Cron job: gửi nhắc nhở sự kiện 24h trước — chạy mỗi giờ
    cron.schedule('0 * * * *', async () => {
      try {
        await eventService.sendReminders();
        console.log('✅ Event reminders sent');
      } catch (error) {
        console.error('❌ Failed to send reminders:', error);
      }
    });
    console.log('⏰ Cron jobs registered: status update (5min) + reminders (1h)');

    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 API URL: http://localhost:${PORT}/api`);
      console.log(`💚 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server');
  await prisma.$disconnect();
  process.exit(0);
});

startServer();
