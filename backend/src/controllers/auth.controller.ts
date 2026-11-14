import { Request, Response } from 'express';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { User } from '../models/user.model.js';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validators/auth.validator.js';
import { generateToken } from '../utils/token.util.js';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.nodeEnv === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Strict Privilege Escalation Guard: Deny admin self-registration
    if (req.body.role === 'admin') {
      res.status(403).json({
        success: false,
        message: 'Security Violation: Administrator accounts cannot be created via public registration.',
      });
      return;
    }

    // 2. Validate Input
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorMessages = parseResult.error.errors.map((e) => e.message).join('. ');
      res.status(400).json({
        success: false,
        message: errorMessages,
        errors: parseResult.error.flatten().fieldErrors,
      });
      return;
    }

    // 3. Database Connection Guard (before database operations)
    if (mongoose.connection.readyState !== 1) {
      res.status(503).json({
        success: false,
        message: 'Database service is currently unavailable. Please try again shortly.',
      });
      return;
    }

    const { name, email, password, role } = parseResult.data;

    // 4. Prevent Duplicate Email
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(409).json({
        success: false,
        message: 'An account with this email address already exists. Please sign in instead.',
      });
      return;
    }

    // 5. Create User in MongoDB (Password hashed automatically in pre-save hook)
    const user = await User.create({
      name,
      email,
      password,
      role: role || 'applicant',
    });

    // 6. Generate JWT
    const token = generateToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    // 7. Set HttpOnly Cookie
    res.cookie('auth_token', token, COOKIE_OPTIONS);

    logger.info(`User registered successfully: ${user.email} (Role: ${user.role})`);

    res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      token,
      user: user.toJSON(),
    });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete registration. Please try again.',
    });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Validate Input
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        message: 'Valid email and password are required.',
        errors: parseResult.error.flatten().fieldErrors,
      });
      return;
    }

    // 2. Database Connection Guard (before database operations)
    if (mongoose.connection.readyState !== 1) {
      res.status(503).json({
        success: false,
        message: 'Database service is currently unavailable. Please try again shortly.',
      });
      return;
    }

    const { email, password } = parseResult.data;
    const normalizedEmail = email.trim().toLowerCase();
    const escapedEmail = normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // 3. Query User with password explicitly included (exact and case-insensitive fallback)
    const user = await User.findOne({
      $or: [
        { email: normalizedEmail },
        { email: { $regex: new RegExp(`^${escapedEmail}$`, 'i') } },
      ],
    }).select('+password');
    if (!user) {
      logger.warn(`Login attempt rejected: email [${email}] not registered`);
      res.status(401).json({
        success: false,
        message: 'Invalid email address or password: No account found with this email address.',
        reason: 'account_not_found',
      });
      return;
    }

    // 4. Compare Password with bcrypt
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      logger.warn(`Login attempt rejected: invalid password for [${email}]`);
      res.status(401).json({
        success: false,
        message: 'Invalid email address or password: Incorrect password entered.',
        reason: 'incorrect_password',
      });
      return;
    }

    // 4. Update last login timestamp safely (avoids re-triggering save hooks)
    await User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });

    // 5. Generate JWT Token
    const token = generateToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    // 6. Set HttpOnly Cookie
    res.cookie('auth_token', token, COOKIE_OPTIONS);

    logger.info(`User logged in successfully: ${user.email} (Role: ${user.role})`);

    res.status(200).json({
      success: true,
      message: 'Authentication successful.',
      token,
      user: user.toJSON(),
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during authentication.',
    });
  }
};

export const getMe = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Not authenticated.',
    });
    return;
  }

  res.status(200).json({
    success: true,
    user: req.user.toJSON(),
  });
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  res.clearCookie('auth_token', { path: '/' });
  res.status(200).json({
    success: true,
    message: 'Signed out successfully.',
  });
};

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = forgotPasswordSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        message: 'Valid email address is required.',
      });
      return;
    }

    const { email } = parseResult.data;
    const normalizedEmail = email.trim().toLowerCase();
    const escapedEmail = normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const user = await User.findOne({
      $or: [
        { email: normalizedEmail },
        { email: { $regex: new RegExp(`^${escapedEmail}$`, 'i') } },
      ],
    });

    let devResetToken: string | undefined;

    if (user) {
      // Generate secure 32-byte hex token
      const rawToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

      user.resetPasswordToken = hashedToken;
      user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry
      await user.save({ validateBeforeSave: false });

      devResetToken = rawToken;
      logger.info(`Password reset token generated for ${user.email}`);
    }

    // Consistent response regardless of whether user exists
    res.status(200).json({
      success: true,
      message: 'If an account exists with this email address, password reset instructions have been generated.',
      ...(config.nodeEnv !== 'production' && devResetToken ? { devResetToken } : {}),
    });
  } catch (error) {
    logger.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to process password reset request at this time.',
    });
  }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = resetPasswordSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorMessages = parseResult.error.errors.map((e) => e.message).join('. ');
      res.status(400).json({
        success: false,
        message: errorMessages,
      });
      return;
    }

    const { token, password } = parseResult.data;
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      res.status(400).json({
        success: false,
        message: 'Password reset token is invalid or has expired.',
      });
      return;
    }

    // Set new password (will be hashed by pre-save hook)
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    logger.info(`Password successfully reset for user: ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. You can now sign in with your new password.',
    });
  } catch (error) {
    logger.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to reset password. Please try again.',
    });
  }
};

