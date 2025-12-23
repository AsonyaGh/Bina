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
  getDoc
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

// Helper to map Firestore docs
const mapDocs = <T>(snapshot: any): T[] => {
  return snapshot.docs.map((d: any) => ({ ...d.data(), id: d.id })) as T[];
};

export const storageService = {
  // Initialization
  init: async () => {
    try {
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      
      if (snapshot.empty) {
        console.log("Database empty. Seeding initial data...");
        const batch = writeBatch(db);

        // Seed Users
        MOCK_USERS.forEach(u => {
          const ref = doc(db, 'users', u.id);
          batch.set(ref, u);
        });

        // Seed Locations
        MOCK_LOCATIONS.forEach(l => {
          const ref = doc(db, 'locations', l.id);
          batch.set(ref, l);
        });

        // Seed Bikes - Use chassis as ID
        MOCK_BIKES.forEach(b => {
          const ref = doc(db, 'motorcycles', b.chassisNumber);
          batch.set(ref, b);
        });

        await batch.commit();
        console.log("Database seeded successfully.");
      }
    } catch (error) {
      console.error("Error seeding database:", error);
    }
  },

  // Users
  getUsers: async (): Promise<User[]> => {
    const snapshot = await getDocs(collection(db, 'users'));
    return mapDocs<User>(snapshot);
  },
  addUser: async (user: User) => {
    if (user.id && user.id.startsWith('u_')) {
        await setDoc(doc(db, 'users', user.id), user);
    } else {
        await addDoc(collection(db, 'users'), user);
    }
  },
  updateUser: async (user: User) => {
    if (!user.id) return;
    const ref = doc(db, 'users', user.id);
    await updateDoc(ref, { ...user });
  },
  deleteUser: async (id: string) => {
    await deleteDoc(doc(db, 'users', id));
  },

  // Locations
  getLocations: async (): Promise<Location[]> => {
    const snapshot = await getDocs(collection(db, 'locations'));
    return mapDocs<Location>(snapshot);
  },
  addLocation: async (location: Location) => {
     if (location.id) {
        await setDoc(doc(db, 'locations', location.id), location);
     } else {
        await addDoc(collection(db, 'locations'), location);
     }
  },
  updateLocation: async (location: Location) => {
    if (!location.id) return;
    await updateDoc(doc(db, 'locations', location.id), { ...location });
  },
  deleteLocation: async (id: string) => {
    await deleteDoc(doc(db, 'locations', id));
  },
  
  // Motorcycles
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

  // Transfers
  getTransfers: async (): Promise<Transfer[]> => {
    const snapshot = await getDocs(collection(db, 'transfers'));
    return mapDocs<Transfer>(snapshot);
  },
  createTransfer: async (transfer: Transfer) => {
    const batch = writeBatch(db);
    
    // Create Transfer Record
    const transferRef = doc(collection(db, 'transfers'));
    const transferWithId = { ...transfer, id: transferRef.id }; // Ensure ID matches
    batch.set(transferRef, transferWithId);
    
    // Update bikes to IN_TRANSIT
    transfer.chassisNumbers.forEach(cn => {
      const bikeRef = doc(db, 'motorcycles', cn);
      batch.update(bikeRef, { 
        status: MotorcycleStatus.IN_TRANSIT,
        currentLocationId: 'TRANSIT'
      });
    });

    await batch.commit();
  },
  approveTransfer: async (transferId: string, userId: string) => {
    const ref = doc(db, 'transfers', transferId);
    await updateDoc(ref, { status: TransferStatus.PENDING });
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

        // Fetch Origin to be precise
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

  // Sales
  getSales: async (): Promise<Sale[]> => {
    const snapshot = await getDocs(collection(db, 'sales'));
    return mapDocs<Sale>(snapshot);
  },
  createSale: async (sale: Sale) => {
    const batch = writeBatch(db);
    
    // Create Sale
    const saleRef = doc(collection(db, 'sales'));
    const saleWithId = { ...sale, id: saleRef.id };
    batch.set(saleRef, saleWithId);

    // Update Bike
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

  // Logs
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

  // Stats
  reset: async () => {
    if(confirm("Full Cloud Reset is not enabled for safety. Refresh the page to attempt re-seeding if empty.")) {
        location.reload();
    }
  }
};