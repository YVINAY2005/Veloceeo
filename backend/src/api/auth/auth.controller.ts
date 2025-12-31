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
    // We use a type guard approach or cast to a known type that has password
    const user = req.user as { password?: string };
    const { password, ...userWithoutPassword } = user;

    return res.status(200).json({
      status: 'success',
      data: {
        role: req.role,
        user: userWithoutPassword
      }
    });
  } catch (err) {
    return next(err);
  }
};
