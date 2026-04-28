export type AuthenticatedUser = {
  userId: string;
  email: string;
  role: 'USER' | 'ADMIN';
  adminReadOnly?: boolean;
};

export type OAuthAuthenticatedUser = {
  id: string;
  email: string;
  role: 'USER' | 'ADMIN';
  isSuspended?: boolean;
  adminReadOnly?: boolean;
  providerRawId?: string;
};
