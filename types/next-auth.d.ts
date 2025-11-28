import 'next-auth';
import { DefaultSession, DefaultUser } from 'next-auth';
import { JWT, DefaultJWT } from 'next-auth/jwt';
import type { UserRole } from '@/types/user-role';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      employeeId: string;
      firstName: string;
      lastName: string;
      company: string;
      employeeType: string;
      department: string;
      role: UserRole;
    } & DefaultSession['user'];
  }

  interface User extends DefaultUser {
    employeeId: string;
    firstName: string;
    lastName: string;
    company: string;
    employeeType: string;
    department: string;
    role: UserRole;
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    company: string;
    employeeType: string;
    department: string;
    role: UserRole;
  }
}
