import { Request, Response, NextFunction } from 'express';
import passport from 'passport';

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate('jwt', { session: false }, (err: any, user: any, info: any) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      return res.status(401).json({ error: "Authorization header with Bearer token is required or session expired." });
    }
    req.user = user;
    next();
  })(req, res, next);
};
