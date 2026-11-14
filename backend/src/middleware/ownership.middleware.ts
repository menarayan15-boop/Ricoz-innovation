import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from './auth.middleware.js';
import { Application, IApplication } from '../models/application.model.js';

export interface ApplicationAuthorizedRequest extends AuthenticatedRequest {
  application?: IApplication;
}

export const validateApplicationAccess = async (
  req: ApplicationAuthorizedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid application ID format.',
      });
      return;
    }

    const application = await Application.findById(id);
    if (!application) {
      res.status(404).json({
        success: false,
        message: 'Application not found.',
      });
      return;
    }

    const user = req.user;
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
      return;
    }

    // 1. Admin has system-wide oversight
    if (user.role === 'admin') {
      req.application = application;
      next();
      return;
    }

    // 2. Applicant ownership check
    if (user.role === 'applicant') {
      if (application.applicantId.toString() !== user._id.toString()) {
        res.status(403).json({
          success: false,
          message:
            'Forbidden: Access denied. You do not have permission to view or manage another applicant\'s dossier.',
        });
        return;
      }
      req.application = application;
      next();
      return;
    }

    // 3. Attorney assignment check
    if (user.role === 'attorney') {
      if (
        !application.assignedAttorneyId ||
        application.assignedAttorneyId.toString() !== user._id.toString()
      ) {
        res.status(403).json({
          success: false,
          message:
            'Forbidden: Access denied. You are not the assigned attorney on this visa case.',
        });
        return;
      }
      req.application = application;
      next();
      return;
    }

    // 4. Employer sponsorship check
    if (user.role === 'employer') {
      if (
        !application.employerId ||
        application.employerId.toString() !== user._id.toString()
      ) {
        res.status(403).json({
          success: false,
          message:
            'Forbidden: Access denied. You are not authorized to access this employer-sponsored application.',
        });
        return;
      }
      req.application = application;
      next();
      return;
    }

    res.status(403).json({
      success: false,
      message: 'Forbidden: Insufficient privileges.',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error verifying case authorization.',
    });
  }
};

