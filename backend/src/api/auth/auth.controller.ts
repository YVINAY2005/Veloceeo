import { Request, Response, NextFunction } from 'express';

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user || !req.role) {
      return res.status(401).json({
        status: 'fail',
        message: 'Not authenticated'
      });
    }

    // Remove sensitive data
    const user = { ...req.user };
    delete user.password;

    return res.status(200).json({
      status: 'success',
      data: {
        role: req.role,
        user
      }
    });
  } catch (err) {
    return next(err);
  }
};
