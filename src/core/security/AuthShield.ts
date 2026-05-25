import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface EcosystemUser {
  id: string;
  role: string;
  permissions: string[];
  [key: string]: any;
}

declare global {
  namespace Express {
    interface Request {
      user?: EcosystemUser;
    }
  }
}

export class AuthShield {
  private readonly jwtSecret: string;

  constructor(secret?: string) {
    this.jwtSecret = secret || process.env.JWT_SECRET || 'default_ecosystem_secret_do_not_use_in_prod';
  }

  public verifyToken = (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'Missing or malformed Authorization header' });
      return;
    }

    const token = authHeader.split(' ')[1];

    let decoded: EcosystemUser;
    try {
      decoded = jwt.verify(token, this.jwtSecret) as EcosystemUser;
    } catch (error: any) {
      const isExpired = error.name === 'TokenExpiredError';
      res.status(401).json({ 
        error: isExpired ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN', 
        message: error.message || 'Token synchronization failure'
      });
      return;
    }

    req.user = decoded;
    next();
  };

  public requireRole = (roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' });
        return;
      }

      if (!roles.includes(req.user.role)) {
        res.status(403).json({ error: 'FORBIDDEN', message: 'Insufficient role privileges' });
        return;
      }

      next();
    };
  };
}

export const authShield = new AuthShield();
