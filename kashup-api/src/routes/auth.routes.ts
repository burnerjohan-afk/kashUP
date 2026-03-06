import { Router } from 'express';
import {
  forgotPassword,
  login,
  signup,
  refresh,
  appleSignIn,
  googleSignIn,
} from '../controllers/auth.controller';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  refreshSchema,
  appleSignInSchema,
  googleSignInSchema,
} from '../schemas/auth.schema';
import { validateBody } from '../middlewares/validator';
import { authRateLimiter, strictRateLimiter } from '../middlewares/rateLimiter';

const router = Router();

// Rate limiting strict pour création de compte et reset password
router.post('/signup', strictRateLimiter, validateBody(registerSchema), signup);
router.post('/register', strictRateLimiter, validateBody(registerSchema), signup);
router.post('/password/forgot', strictRateLimiter, validateBody(forgotPasswordSchema), forgotPassword);

// Rate limiting pour login (protection brute force)
router.post('/login', authRateLimiter, validateBody(loginSchema), login);

// Connexion avec Apple / Google
router.post('/apple', authRateLimiter, validateBody(appleSignInSchema), appleSignIn);
router.post('/google', authRateLimiter, validateBody(googleSignInSchema), googleSignIn);

// Rafraîchissement du token (pour le back office)
router.post('/refresh', authRateLimiter, validateBody(refreshSchema), refresh);

export default router;


