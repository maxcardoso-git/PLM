import { IsString, IsNotEmpty } from 'class-validator';

export class TahCallbackDto {
  @IsString()
  @IsNotEmpty()
  token: string;
}

export interface TahJwtPayload {
  sub: string;           // User UUID from TAH
  email: string;
  name?: string;
  tenant_id: string;
  org_id?: string;       // Organization ID from TAH
  roles?: string[];
  permissions?: string[];
  iss: string;           // Issuer URL
  aud: string;           // Audience (app ID)
  iat: number;           // Issued at
  exp: number;           // Expiration
  nbf?: number;          // Not before
  type?: string;         // Token type
}

export interface AuthenticatedUser {
  id: string;
  tahUserId: string;
  email: string;
  name?: string;
  tenantId: string;
  orgId?: string;
  roles: string[];
}
