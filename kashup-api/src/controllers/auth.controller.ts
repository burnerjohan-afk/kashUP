import { Request, Response } from 'express';
import {
  loginUser,
  registerUser,
  requestPasswordReset,
  refreshUserSession,
  signInWithApple,
  signInWithGoogle,
} from '../services/auth.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';

export const signup = asyncHandler(async (req: Request, res: Response) => {
  const result = await registerUser(req.body);
  sendSuccess(res, result, null, 201);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await loginUser(req.body);
  sendSuccess(res, result);
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const result = await refreshUserSession(req.body);
  sendSuccess(res, result);
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const result = await requestPasswordReset(req.body);
  sendSuccess(res, result);
});

export const appleSignIn = asyncHandler(async (req: Request, res: Response) => {
  const result = await signInWithApple(req.body);
  sendSuccess(res, result);
});

export const googleSignIn = asyncHandler(async (req: Request, res: Response) => {
  const result = await signInWithGoogle(req.body);
  sendSuccess(res, result);
});


