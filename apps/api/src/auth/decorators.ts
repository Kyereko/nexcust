import { SetMetadata } from '@nestjs/common';
import type { Permission } from '@nexcust/contracts';

export const IS_PUBLIC = 'j1:public';
export const PERMISSION = 'j1:permission';
/** Route needs no session (login, health, certificate verification). */
export const Public = () => SetMetadata(IS_PUBLIC, true);
/** Route requires this permission; the guard resolves the caller's jurisdiction into req.scope. */
export const RequirePermission = (p: Permission) => SetMetadata(PERMISSION, p);
