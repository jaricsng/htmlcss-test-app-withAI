import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production';

/** Claims embedded in every JWT issued by this server. */
export interface JwtPayload {
  /** Database primary key of the authenticated user. */
  userId: number;
  /** Account type — controls which routes and resources the user may access. */
  role: 'lecturer' | 'student';
  /** Display name carried in the token to avoid an extra DB lookup on each request. */
  name: string;
}

declare global {
  namespace Express {
    interface Request {
      /** Decoded JWT payload attached by {@link requireAuth}. Present on all protected routes. */
      user?: JwtPayload;
    }
  }
}

/**
 * Express middleware that validates the `Authorization: Bearer <token>` header.
 * Attaches the decoded {@link JwtPayload} to `req.user` on success.
 * Responds 401 if the header is absent or the token is invalid/expired.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    req.user = jwt.verify(token, JWT_SECRET) as JwtPayload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

/**
 * Express middleware factory that enforces a specific account role.
 * Must be used after {@link requireAuth}. Responds 403 if the authenticated
 * user's role does not match.
 *
 * @param role - The required role: `"lecturer"` or `"student"`.
 */
export function requireRole(role: 'lecturer' | 'student') {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.role !== role) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

/**
 * Signs a new JWT containing the given payload.
 * The token expires after 24 hours and is signed with `JWT_SECRET`.
 *
 * @param payload - Claims to embed: `userId`, `role`, and `name`.
 * @returns Signed JWT string.
 */
export function signToken(payload: JwtPayload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}
