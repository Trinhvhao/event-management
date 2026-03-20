import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';

const router = Router();
router.use(authenticate);
router.use(authorize('admin'));

// Users
router.get('/users', adminController.getUsers);
router.put('/users/:id', adminController.updateUser);
router.get('/dashboard', adminController.getDashboard);

// Categories CRUD
router.get('/categories', adminController.getCategories);
router.post('/categories', adminController.createCategory);
router.delete('/categories/:id', adminController.deleteCategory);

// Departments CRUD
router.get('/departments', adminController.getDepartments);
router.post('/departments', adminController.createDepartment);
router.delete('/departments/:id', adminController.deleteDepartment);

export default router;
