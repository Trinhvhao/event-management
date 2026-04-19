import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/authorize';
import { adminController } from '../controllers/admin.controller';

const router = Router();

// Apply auth and admin middleware to all routes
router.use(authenticate);
router.use(requireAdmin);

// User Management Routes
router.get('/users', adminController.getUsers);
router.put('/users/:id/lock', adminController.lockUser);
router.put('/users/:id/unlock', adminController.unlockUser);
router.put('/users/:id/role', adminController.changeUserRole);
router.post('/users/bulk-lock', adminController.bulkLock);
router.post('/users/bulk-unlock', adminController.bulkUnlock);
router.get('/users/:id/audit-logs', adminController.getUserAuditLogs);

// Organizer Management Routes
router.get('/organizers', adminController.getOrganizers);
router.post('/organizers/grant', adminController.grantOrganizerRights);
router.delete('/organizers/:id/revoke', adminController.revokeOrganizerRights);
router.get('/organizers/:id/metrics', adminController.getOrganizerMetrics);

// Category Management Routes
router.get('/categories', adminController.getCategories);
router.post('/categories', adminController.createCategory);
router.put('/categories/:id', adminController.updateCategory);
router.delete('/categories/:id', adminController.deleteCategory);

// Department Management Routes
router.get('/departments', adminController.getDepartments);
router.post('/departments', adminController.createDepartment);
router.put('/departments/:id', adminController.updateDepartment);
router.delete('/departments/:id', adminController.deleteDepartment);

// Role Management Routes
// TODO: Implement in Phase 3
// GET /api/admin/roles/matrix - Get role permission matrix
// GET /api/admin/roles/statistics - Get role distribution statistics

// Statistics Routes
// TODO: Implement in Phase 4
// GET /api/admin/statistics/dashboard - Get dashboard metrics
// GET /api/admin/statistics/charts - Get chart data

export default router;
