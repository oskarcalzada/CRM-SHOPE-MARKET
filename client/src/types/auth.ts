export interface User {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'manager' | 'employee' | 'readonly';
  permissions: string[];
}

export interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  hasPermission: (module: string, action: string) => boolean;
  loading: boolean;
}