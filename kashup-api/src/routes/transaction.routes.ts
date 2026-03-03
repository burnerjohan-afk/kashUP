import { Router } from 'express';
import { createTransactionHandler, exportTransactionsHandler, flagTransactionHandler, getTransactionsHandler } from '../controllers/transaction.controller';
import { authMiddleware, requireRoles } from '../middlewares/auth';
import { validateBody } from '../middlewares/validator';
import { createTransactionSchema } from '../schemas/transaction.schema';
import { USER_ROLE } from '../types/domain';

const router = Router();

router.post('/', authMiddleware, validateBody(createTransactionSchema), createTransactionHandler);

// Routes admin
router.get('/', authMiddleware, requireRoles(USER_ROLE.admin), getTransactionsHandler);
router.get('/export', authMiddleware, requireRoles(USER_ROLE.admin), exportTransactionsHandler);
router.post('/:id/flag', authMiddleware, requireRoles(USER_ROLE.admin), flagTransactionHandler);

export default router;


