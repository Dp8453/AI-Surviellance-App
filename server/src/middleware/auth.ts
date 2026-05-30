import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'antigravity_surveillance_sec_token_9x';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
    email: string;
  };
}

/**
 * Protects route, requires valid JWT in Authorization header.
 */
export function protect(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  let token: string | undefined;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    res.status(401).json({ message: 'Access denied. Security token missing.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; role: string; email: string };
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Access denied. Invalid security token.' });
  }
}

/**
 * Restricts access to specific roles.
 */
export function authorize(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized. Login required.' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ message: `Access forbidden. Role '${req.user.role}' lacks permissions.` });
      return;
    }

    next();
  };
}
