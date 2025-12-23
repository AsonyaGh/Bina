import { User, Role, Location, Motorcycle, MotorcycleStatus, Transfer, TransferStatus, Sale, Log } from '../types';
import { db } from '../firebase';
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  writeBatch,
  getDoc,
  onSnapshot
} from 'firebase/firestore';

// Mock Data for seeding
const MOCK_LOCATIONS: Location[] = [
  { id: 'loc_wh_1', name: 'Central Warehouse', type: 'WAREHOUSE', address: '123 Industrial Park' },
  { id: 'loc_br_1', name: 'Downtown Branch', type: 'BRANCH', address: '45 City Center' },
  { id: 'loc_br_2', name: 'Northside Branch', type: 'BRANCH', address: '88 North Road' },
];

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

const mapDocs = <T>(snapshot: any): T[] => {
  return snapshot.docs.map((d: any) => ({ ...d.data(), id: d.id })) as T[];
};

export const storageService = {
  // Initialization & Seeding
  init: async () => {
    try {
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      
      if (snapshot.empty) {
        console.log("Database empty. Seeding initial data...");
        const batch = writeBatch(db);

        MOCK_USERS.forEach(u => batch.set(doc(db, 'users', u.id), u));
        MOCK_LOCATIONS.forEach(l => batch.set(doc(db, 'locations', l.id), l));
        MOCK_BIKES.forEach(b => batch.set(doc(db, 'motorcycles', b.chassisNumber), b));

        await batch.commit();
        console.log("Database seeded successfully.");
      }
    } catch (error) {
      console.error("Error seeding database:", error);
    }
  },

  // --- Users ---
  getUsers: async (): Promise<User[]> => {
    const snapshot = await getDocs(collection(db, 'users'));
    return mapDocs<User>(snapshot);
  },
  addUser: async (user: User) => {
    const ref = user.id ? doc(db, 'users', user.id) : doc(collection(db, 'users'));
    await setDoc(ref, { ...user, id: ref.id });
  },
  updateUser: async (user: User) => {
    if (!user.id) return;
    await updateDoc(doc(db, 'users', user.id), { ...user });
  },
  deleteUser: async (id: string) => {
    await deleteDoc(doc(db, 'users', id));
  },

  // --- Locations ---
  getLocations: async (): Promise<Location[]> => {
    const snapshot = await getDocs(collection(db, 'locations'));
    return mapDocs<Location>(snapshot);
  },
  addLocation: async (location: Location) => {
    const ref = location.id ? doc(db, 'locations', location.id) : doc(collection(db, 'locations'));
    await setDoc(ref, { ...location, id: ref.id });
  },
  updateLocation: async (location: Location) => {
    if (!location.id) return;
    await updateDoc(doc(db, 'locations', location.id), { ...location });
  },
  deleteLocation: async (id: string) => {
    await deleteDoc(doc(db, 'locations', id));
  },

  // --- Motorcycles (Real-time) ---
  subscribeToMotorcycles: (callback: (data: Motorcycle[]) => void) => {
    const q = query(collection(db, 'motorcycles'));
    return onSnapshot(q, (snapshot) => {
        callback(mapDocs<Motorcycle>(snapshot));
    });
  },
  getMotorcycles: async (): Promise<Motorcycle[]> => {
    const snapshot = await getDocs(collection(db, 'motorcycles'));
    return mapDocs<Motorcycle>(snapshot);
  },
  addMotorcycle: async (moto: Motorcycle) => {
    await setDoc(doc(db, 'motorcycles', moto.chassisNumber), moto);
    await storageService.logAction('System', `Imported motorcycle ${moto.chassisNumber}`);
  },
  updateMotorcycle: async (moto: Motorcycle) => {
    await updateDoc(doc(db, 'motorcycles', moto.chassisNumber), { ...moto });
  },
  deleteMotorcycle: async (chassisNumber: string) => {
    await deleteDoc(doc(db, 'motorcycles', chassisNumber));
  },

  // --- Transfers (Real-time) ---
  subscribeToTransfers: (callback: (data: Transfer[]) => void) => {
    const q = query(collection(db, 'transfers'));
    return onSnapshot(q, (snapshot) => {
        // Sort by date descending
        const data = mapDocs<Transfer>(snapshot).sort((a,b) => 
            new Date(b.dateInitiated).getTime() - new Date(a.dateInitiated).getTime()
        );
        callback(data);
    });
  },
  getTransfers: async (): Promise<Transfer[]> => {
     const snapshot = await getDocs(collection(db, 'transfers'));
     return mapDocs<Transfer>(snapshot);
  },
  createTransfer: async (transfer: Transfer) => {
    const batch = writeBatch(db);
    
    // Create Transfer
    const transferRef = doc(db, 'transfers', transfer.id);
    batch.set(transferRef, transfer);
    
    // If it's already "IN_TRANSIT" (PENDING), assume items left the origin immediately
    if (transfer.status === TransferStatus.PENDING) {
        transfer.chassisNumbers.forEach(cn => {
            const bikeRef = doc(db, 'motorcycles', cn);
            batch.update(bikeRef, { 
                status: MotorcycleStatus.IN_TRANSIT,
                currentLocationId: 'TRANSIT'
            });
        });
    }

    await batch.commit();
  },
  approveTransfer: async (transferId: string, userId: string) => {
    // Approve Request (Branch -> Warehouse flow usually) or just Admin approval
    const transferRef = doc(db, 'transfers', transferId);
    const batch = writeBatch(db);

    batch.update(transferRef, { status: TransferStatus.PENDING }); // Set to In Transit

    // We must fetch transfer to get bikes to move them to TRANSIT status
    const tDoc = await getDoc(transferRef);
    if(tDoc.exists()) {
        const t = tDoc.data() as Transfer;
        t.chassisNumbers.forEach(cn => {
            const bikeRef = doc(db, 'motorcycles', cn);
            batch.update(bikeRef, {
                status: MotorcycleStatus.IN_TRANSIT,
                currentLocationId: 'TRANSIT'
            });
        });
    }
    await batch.commit();
  },
  completeTransfer: async (transferId: string, userId: string) => {
    const transferRef = doc(db, 'transfers', transferId);
    const tDoc = await getDoc(transferRef);
    
    if (tDoc.exists()) {
       const t = tDoc.data() as Transfer;
       const batch = writeBatch(db);
       
       batch.update(transferRef, {
           status: TransferStatus.COMPLETED,
           receivedBy: userId,
           dateCompleted: new Date().toISOString()
       });

       t.chassisNumbers.forEach(cn => {
           const bikeRef = doc(db, 'motorcycles', cn);
           batch.update(bikeRef, {
               status: MotorcycleStatus.AT_BRANCH,
               currentLocationId: t.toLocationId
           });
       });

       await batch.commit();
    }
  },
  cancelTransfer: async (transferId: string, userId: string) => {
    const transferRef = doc(db, 'transfers', transferId);
    const tDoc = await getDoc(transferRef);

    if (tDoc.exists()) {
        const t = tDoc.data() as Transfer;
        const batch = writeBatch(db);
        batch.update(transferRef, { status: TransferStatus.CANCELLED });

        // Fetch Origin to revert status correctly
        const locRef = doc(db, 'locations', t.fromLocationId);
        const locDoc = await getDoc(locRef);
        const loc = locDoc.data() as Location;
        const revertedStatus = loc?.type === 'WAREHOUSE' ? MotorcycleStatus.IN_WAREHOUSE : MotorcycleStatus.AT_BRANCH;

        t.chassisNumbers.forEach(cn => {
            const bikeRef = doc(db, 'motorcycles', cn);
            batch.update(bikeRef, {
                status: revertedStatus,
                currentLocationId: t.fromLocationId
            });
        });

        await batch.commit();
    }
  },

  // --- Sales (Real-time) ---
  subscribeToSales: (callback: (data: Sale[]) => void) => {
    const q = query(collection(db, 'sales'));
    return onSnapshot(q, (snapshot) => {
        const data = mapDocs<Sale>(snapshot).sort((a,b) => 
            new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        callback(data);
    });
  },
  getSales: async (): Promise<Sale[]> => {
    const snapshot = await getDocs(collection(db, 'sales'));
    return mapDocs<Sale>(snapshot);
  },
  createSale: async (sale: Sale) => {
    const batch = writeBatch(db);
    
    const saleRef = doc(db, 'sales', sale.id);
    batch.set(saleRef, sale);

    const bikeRef = doc(db, 'motorcycles', sale.chassisNumber);
    batch.update(bikeRef, {
        status: MotorcycleStatus.SOLD,
        soldDate: sale.date,
        price: sale.price
    });

    await batch.commit();
  },
  updateSale: async (updatedSale: Sale) => {
    if (!updatedSale.id) return;
    const saleRef = doc(db, 'sales', updatedSale.id);
    await updateDoc(saleRef, { ...updatedSale });
    
    if (updatedSale.price) {
        const bikeRef = doc(db, 'motorcycles', updatedSale.chassisNumber);
        await updateDoc(bikeRef, { price: updatedSale.price });
    }
  },
  deleteSale: async (saleId: string) => {
    const saleRef = doc(db, 'sales', saleId);
    const sDoc = await getDoc(saleRef);
    
    if (sDoc.exists()) {
        const sale = sDoc.data() as Sale;
        const batch = writeBatch(db);
        batch.delete(saleRef);
        
        const bikeRef = doc(db, 'motorcycles', sale.chassisNumber);
        const bikeDoc = await getDoc(bikeRef);
        
        if (bikeDoc.exists()) {
            const bike = bikeDoc.data() as Motorcycle;
            // Determine logical status based on location ID naming convention or lookup
            // Simplification: if it contains 'wh' -> Warehouse, else Branch
            const status = bike.currentLocationId.includes('wh') ? MotorcycleStatus.IN_WAREHOUSE : MotorcycleStatus.AT_BRANCH;
            
            batch.update(bikeRef, {
                status: status,
                soldDate: null,
                price: null
            });
        }
        await batch.commit();
    }
  },

  // --- Logs (Real-time) ---
  subscribeToLogs: (callback: (data: Log[]) => void) => {
      const q = query(collection(db, 'logs'));
      return onSnapshot(q, (snapshot) => {
          callback(mapDocs<Log>(snapshot).sort((a,b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          ));
      });
  },
  getLogs: async (): Promise<Log[]> => {
    const q = query(collection(db, 'logs'));
    const snapshot = await getDocs(q);
    const logs = mapDocs<Log>(snapshot);
    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },
  logAction: async (userId: string, details: string) => {
    await addDoc(collection(db, 'logs'), {
      action: 'ACTION',
      userId,
      details,
      timestamp: new Date().toISOString()
    });
  },

  // Reset
  reset: async () => {
    if(confirm("To re-seed the Cloud Database, you must manually delete collections in Firebase Console. Refreshing page to attempt seed if empty.")) {
        location.reload();
    }
  }
};