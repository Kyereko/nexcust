import type { NextFunction, Request, Response } from 'express';
import { timingSafeEqual } from 'crypto';

/**
 * Hosted deployments put the API behind the web tier. When API_GATEWAY_SECRET is set, every request must
 * carry that secret in GATEWAY_HEADER (added server-side by the web app); anything else gets a bare 404,
 * so the API's own URL is useless on its own. Locally the variable is unset and the check is off.
 */
export const GATEWAY_HEADER = 'x-nexcust-gateway';
/** Real client address, forwarded by the web tier. Trusted only on gateway-verified requests. */
export const CLIENT_IP_HEADER = 'x-nexcust-client-ip';

export function gatewayVerified(req: Request): boolean {
  const secret = process.env.API_GATEWAY_SECRET;
  if (!secret) return true;
  const given = req.headers[GATEWAY_HEADER];
  if (typeof given !== 'string' || given.length !== secret.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(secret));
}

export function gatewayMiddleware(req: Request, res: Response, next: NextFunction) {
  if (gatewayVerified(req)) return next();
  res.status(404).json({ statusCode: 404, message: 'Not Found' });
}
