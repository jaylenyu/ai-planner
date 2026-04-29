export type AuthenticatedUser = {
  userId: string;
  email: string | null;
  nickname: string;
  role: 'USER' | 'ADMIN';
  adminReadOnly?: boolean;
};

export type OAuthAuthenticatedUser = {
  id: string;
  email: string | null;
  nickname?: string;
  role: 'USER' | 'ADMIN';
  isSuspended?: boolean;
  deletedAt?: Date | null;
  adminReadOnly?: boolean;
  providerRawId?: string;
  providerEmail?: string | null;
  needsSignup?: boolean;
};
