import { User, Role, Location, Motorcycle, MotorcycleStatus, Transfer, TransferStatus, Sale, Log } from '../types';

// Mock Data seeding
const MOCK_LOCATIONS: Location[] = [
  { id: 'loc_wh_1', name: 'Central Warehouse', type: 'WAREHOUSE', address: '123 Industrial Park' },
  { id: 'loc_br_1', name: 'Downtown Branch', type: 'BRANCH', address: '45 City Center' },
  { id: 'loc_br_2', name: 'Northside Branch', type: 'BRANCH', address: '88 North Road' },
];

// Added passwords (default '123456') and isActive status
const MOCK_USERS: User[] = [
  { id: 'u_admin', name: 'Admin User', email: 'admin@binawoo.com', role: Role.ADMIN, password: '123456', isActive: true },
  { id: 'u_wh', name: 'Warehouse Mgr', email: 'warehouse@binawoo.com', role: Role.WAREHOUSE_MANAGER, locationId: 'loc_wh_1', password: '123456', isActive: true },
  { id: 'u_br1', name: 'Branch Mgr 1', email: 'branch1@binawoo.com', role: Role.BRANCH_MANAGER, locationId: 'loc_br_1', password: '123456', isActive: true },
  { id: 'u_sales1', name: 'Sales Officer 1', email: 'sales1@binawoo.com', role: Role.SALES_OFFICER, locationId: 'loc_br_1', password: '123456', isActive: true },
];

const MOCK_BIKES: Motorcycle[] = Array.from({ length: 20 }).map((_, i) => ({
  chassisNumber: `BW-${1000 + i}`,
  type: i % 2 === 0 ? 'Sport 150cc' : 'Cruiser 250cc',
  color: i % 3 === 0 ? 'Red' : i % 3 === 1 ? 'Black' : 'White',
  status: i < 10 ? MotorcycleStatus.IN_WAREHOUSE : MotorcycleStatus.AT_BRANCH,
  currentLocationId: i < 10 ? 'loc_wh_1' : 'loc_br_1',
  importDate: new Date().toISOString(),
}));

const MOCK_TRANSFERS: Transfer[] = [];
const MOCK_SALES: Sale[] = [];
const MOCK_LOGS: Log[] = [];

// Local Storage Helper
const save = (key: string, data: any) => localStorage.setItem(key, JSON.stringify(data));
const load = (key: string, def: any) => {
  const s = localStorage.getItem(key);
  return s ? JSON.parse(s) : def;
};

// Data Service
export const storageService = {
  // Initialization
  init: () => {
    const usersRaw = localStorage.getItem('users');
    let needsRefresh = false;

    // Check if data is missing or stale
    if (!usersRaw) {
      needsRefresh = true;
    } else {
      try {
        const currentUsers = JSON.parse(usersRaw);
        // Strict check: Ensure Admin exists AND has a password AND has isActive status
        const adminUser = currentUsers.find((u: any) => u.email === 'admin@binawoo.com');
        
        if (!adminUser) {
           console.log("Admin user missing. Refreshing data.");
           needsRefresh = true;
        } else if (!adminUser.password || adminUser.isActive === undefined) {
           console.log("Detected stale data (missing password/active status). Refreshing data.");
           needsRefresh = true;
        }
      } catch (e) {
        needsRefresh = true;
      }
    }

    if (needsRefresh) {
      console.log("Seeding fresh mock data...");
      save('users', MOCK_USERS);
      save('locations', MOCK_LOCATIONS);
      // Only reset these if completely missing, OR if we are doing a forced structure update we might want to ensure they exist
      // For now, we ensure the core collections exist
      if (!localStorage.getItem('motorcycles') || needsRefresh) save('motorcycles', MOCK_BIKES);
      if (!localStorage.getItem('transfers') || needsRefresh) save('transfers', MOCK_TRANSFERS);
      if (!localStorage.getItem('sales') || needsRefresh) save('sales', MOCK_SALES);
      if (!localStorage.getItem('logs') || needsRefresh) save('logs', MOCK_LOGS);
      
      // Clear any existing session to force re-login with new credentials
      localStorage.removeItem('currentUser');
    }
  },

  // Users
  getUsers: (): User[] => load('users', []),
  addUser: (user: User) => {
    const users = load('users', []);
    users.push(user);
    save('users', users);
  },
  updateUser: (updatedUser: User) => {
    const users = load('users', []) as User[];
    const idx = users.findIndex(u => u.id === updatedUser.id);
    if (idx !== -1) {
      // Preserve password if not provided in update
      if (!updatedUser.password) {
        updatedUser.password = users[idx].password;
      }
      users[idx] = updatedUser;
      save('users', users);
    }
  },
  deleteUser: (id: string) => {
    const users = load('users', []) as User[];
    save('users', users.filter(u => u.id !== id));
  },

  // Locations
  getLocations: (): Location[] => load('locations', []),
  addLocation: (location: Location) => {
    const locations = load('locations', []);
    locations.push(location);
    save('locations', locations);
  },
  updateLocation: (location: Location) => {
    const locations = load('locations', []) as Location[];
    const idx = locations.findIndex(l => l.id === location.id);
    if (idx !== -1) {
      locations[idx] = location;
      save('locations', locations);
    }
  },
  deleteLocation: (id: string) => {
    const locations = load('locations', []) as Location[];
    save('locations', locations.filter(l => l.id !== id));
  },
  
  // Motorcycles
  getMotorcycles: (): Motorcycle[] => load('motorcycles', []),
  addMotorcycle: (moto: Motorcycle) => {
    const list = load('motorcycles', []);
    list.push(moto);
    save('motorcycles', list);
    storageService.logAction('System', `Imported motorcycle ${moto.chassisNumber}`);
  },
  updateMotorcycle: (moto: Motorcycle) => {
    const list = load('motorcycles', []) as Motorcycle[];
    const idx = list.findIndex(m => m.chassisNumber === moto.chassisNumber);
    if (idx !== -1) {
      list[idx] = moto;
      save('motorcycles', list);
    }
  },
  deleteMotorcycle: (chassisNumber: string) => {
    const list = load('motorcycles', []) as Motorcycle[];
    save('motorcycles', list.filter(m => m.chassisNumber !== chassisNumber));
  },

  // Transfers
  getTransfers: (): Transfer[] => load('transfers', []),
  createTransfer: (transfer: Transfer) => {
    const list = load('transfers', []);
    list.push(transfer);
    save('transfers', list);
    
    // Update bikes to IN_TRANSIT
    const bikes = load('motorcycles', []) as Motorcycle[];
    transfer.chassisNumbers.forEach(cn => {
      const bike = bikes.find(b => b.chassisNumber === cn);
      if (bike) {
        bike.status = MotorcycleStatus.IN_TRANSIT;
        bike.currentLocationId = 'TRANSIT';
      }
    });
    save('motorcycles', bikes);
  },
  approveTransfer: (transferId: string, userId: string) => {
    const transfers = load('transfers', []) as Transfer[];
    const t = transfers.find(tr => tr.id === transferId);
    if (t && t.status === TransferStatus.PENDING_APPROVAL) {
      t.status = TransferStatus.PENDING; // Now officially In Transit/Ready for Receipt
      save('transfers', transfers);
    }
  },
  completeTransfer: (transferId: string, userId: string) => {
    const transfers = load('transfers', []) as Transfer[];
    const t = transfers.find(tr => tr.id === transferId);
    if (t) {
      t.status = TransferStatus.COMPLETED;
      t.receivedBy = userId;
      t.dateCompleted = new Date().toISOString();
      save('transfers', transfers);

      // Update bikes
      const bikes = load('motorcycles', []) as Motorcycle[];
      t.chassisNumbers.forEach(cn => {
        const bike = bikes.find(b => b.chassisNumber === cn);
        if (bike) {
          bike.status = MotorcycleStatus.AT_BRANCH;
          bike.currentLocationId = t.toLocationId;
        }
      });
      save('motorcycles', bikes);
    }
  },
  cancelTransfer: (transferId: string, userId: string) => {
    const transfers = load('transfers', []) as Transfer[];
    const t = transfers.find(tr => tr.id === transferId);
    
    // Allow cancellation of PENDING or PENDING_APPROVAL
    if (t && (t.status === TransferStatus.PENDING || t.status === TransferStatus.PENDING_APPROVAL)) {
      t.status = TransferStatus.CANCELLED;
      save('transfers', transfers);

      // Revert bikes to original location
      const bikes = load('motorcycles', []) as Motorcycle[];
      const locations = load('locations', []) as Location[];
      const origin = locations.find((l: Location) => l.id === t.fromLocationId);
      
      const revertedStatus = origin?.type === 'WAREHOUSE' ? MotorcycleStatus.IN_WAREHOUSE : MotorcycleStatus.AT_BRANCH;

      t.chassisNumbers.forEach(cn => {
        const bike = bikes.find(b => b.chassisNumber === cn);
        if (bike) {
          bike.status = revertedStatus;
          bike.currentLocationId = t.fromLocationId;
        }
      });
      save('motorcycles', bikes);
    }
  },

  // Sales
  getSales: (): Sale[] => load('sales', []),
  createSale: (sale: Sale) => {
    const list = load('sales', []);
    list.push(sale);
    save('sales', list);

    const bikes = load('motorcycles', []) as Motorcycle[];
    const bike = bikes.find(b => b.chassisNumber === sale.chassisNumber);
    if (bike) {
      bike.status = MotorcycleStatus.SOLD;
      bike.soldDate = sale.date;
      bike.price = sale.price;
    }
    save('motorcycles', bikes);
  },
  updateSale: (updatedSale: Sale) => {
    const list = load('sales', []) as Sale[];
    const idx = list.findIndex(s => s.id === updatedSale.id);
    if (idx !== -1) {
       // Update bike price if changed
       const bikes = load('motorcycles', []) as Motorcycle[];
       const bike = bikes.find(b => b.chassisNumber === updatedSale.chassisNumber);
       if (bike) {
           bike.price = updatedSale.price;
           save('motorcycles', bikes);
       }
       list[idx] = updatedSale;
       save('sales', list);
    }
  },
  deleteSale: (saleId: string) => {
    const sales = load('sales', []) as Sale[];
    const sale = sales.find(s => s.id === saleId);
    if (sale) {
       const bikes = load('motorcycles', []) as Motorcycle[];
       const bike = bikes.find(b => b.chassisNumber === sale.chassisNumber);
       
       // Revert bike status
       if (bike) {
           const locations = load('locations', []) as Location[];
           const loc = locations.find((l: Location) => l.id === bike.currentLocationId);
           
           if (loc && loc.type === 'WAREHOUSE') {
               bike.status = MotorcycleStatus.IN_WAREHOUSE;
           } else {
               bike.status = MotorcycleStatus.AT_BRANCH;
           }
           bike.soldDate = undefined;
           bike.price = undefined;
           save('motorcycles', bikes);
       }
       save('sales', sales.filter(s => s.id !== saleId));
    }
  },

  // Logs
  getLogs: (): Log[] => load('logs', []).sort((a: Log, b: Log) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
  logAction: (userId: string, details: string) => {
    const logs = load('logs', []);
    logs.push({
      id: Math.random().toString(36).substr(2, 9),
      action: 'ACTION',
      userId,
      details,
      timestamp: new Date().toISOString()
    });
    save('logs', logs);
  },

  // Stats
  reset: () => {
    localStorage.clear();
    location.reload();
  }
};