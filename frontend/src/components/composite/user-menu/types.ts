/**
 * User menu types
 */

export interface UserMenuUser {
  displayName?: string;
  email?: string;
  apiKey?: string;
}

export interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserMenuUser;
  onApiKeyGenerated?: () => void;
}

export interface ApiKeySectionProps {
  apiKey: string;
  onCopy: (key: string) => void;
  isBlueTheme?: boolean;
}

export interface UserAvatarProps {
  user: UserMenuUser;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  isActive?: boolean;
}
