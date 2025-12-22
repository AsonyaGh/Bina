
export enum Role {
  ADMIN = 'ADMIN',
  WAREHOUSE_MANAGER = 'WAREHOUSE_MANAGER',
  BRANCH_MANAGER = 'BRANCH_MANAGER',
  SALES_OFFICER = 'SALES_OFFICER',
}

export enum MotorcycleStatus {
  IN_WAREHOUSE = 'IN_WAREHOUSE',
  IN_TRANSIT = 'IN_TRANSIT',
  AT_BRANCH = 'AT_BRANCH',
  SOLD = 'SOLD',
}

export enum TransferStatus {
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  PENDING = 'PENDING',
  IN_TRANSIT = 'IN_TRANSIT',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  locationId?: string; // Warehouse or Branch ID they belong to
  avatarUrl?: string;
  password?: string; // For mock auth purposes
  isActive?: boolean;
}

export interface Location {
  id: string;
  name: string;
  type: 'WAREHOUSE' | 'BRANCH';
  address: string;
}

export interface Motorcycle {
  chassisNumber: string;
  type: string;
  color: string;
  status: MotorcycleStatus;
  currentLocationId: string;
  importDate: string;
  soldDate?: string;
  price?: number;
}

export interface Transfer {
  id: string;
  reference: string;
  fromLocationId: string;
  toLocationId: string;
  chassisNumbers: string[];
  status: TransferStatus;
  initiatedBy: string; // User ID
  receivedBy?: string; // User ID
  dateInitiated: string;
  dateCompleted?: string;
}

export interface Sale {
  id: string;
  chassisNumber: string;
  customerName: string;
  customerPhone: string;
  price: number;
  salesOfficerId: string;
  branchId: string;
  date: string;
}

export interface Log {
  id: string;
  action: string;
  userId: string;
  details: string;
  timestamp: string;
}
