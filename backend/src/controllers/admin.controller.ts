import { Response } from 'express';
import { User } from '../models/user.model.js';
import { Application } from '../models/application.model.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { UserRole } from '../types/index.js';

export const listAllUsers = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve users' });
  }
};

export const updateUserRole = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    const validRoles: UserRole[] = ['applicant', 'attorney', 'employer', 'admin'];
    if (!validRoles.includes(role)) {
      res.status(400).json({
        success: false,
        message: `Invalid role. Must be one of: ${validRoles.join(', ')}`,
      });
      return;
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { role },
      { new: true }
    ).select('-password');

    if (!updatedUser) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: `User role updated to ${role} successfully.`,
      user: updatedUser,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update user role' });
  }
};

export const getSystemStats = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const totalUsers = await User.countDocuments();
    const applicantsCount = await User.countDocuments({ role: 'applicant' });
    const attorneysCount = await User.countDocuments({ role: 'attorney' });
    const employersCount = await User.countDocuments({ role: 'employer' });
    const adminsCount = await User.countDocuments({ role: 'admin' });

    const totalApplications = await Application.countDocuments();
    const activeApplications = await Application.countDocuments({
      status: { $in: ['documents_pending', 'ai_analyzed', 'under_attorney_review'] },
    });

    res.status(200).json({
      success: true,
      stats: {
        users: {
          total: totalUsers,
          applicants: applicantsCount,
          attorneys: attorneysCount,
          employers: employersCount,
          admins: adminsCount,
        },
        applications: {
          total: totalApplications,
          active: activeApplications,
        },
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch system stats' });
  }
};

