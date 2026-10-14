import type { SaveData, SaveMeta } from '../types';

export const CURRENT_SAVE_VERSION = 3;

export class SaveManager {
  private dbName = 'EasyStoryEngine_Saves';
  private storeName = 'saves';
  private db: IDBDatabase | null = null;
  private dbPromise: Promise<IDBDatabase | null> | null = null;

  constructor() {
    this.initDb();
  }

  private initDb(): Promise<IDBDatabase | null> {
    if (this.dbPromise) return this.dbPromise;
    if (typeof window === 'undefined' || !window.indexedDB) {
      return Promise.resolve(null);
    }

    this.dbPromise = new Promise((resolve) => {
      try {
        const req = window.indexedDB.open(this.dbName, 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(this.storeName)) {
            db.createObjectStore(this.storeName, { keyPath: 'meta.slot' });
          }
        };
        req.onsuccess = () => {
          this.db = req.result;
          resolve(this.db);
        };
        req.onerror = () => {
          resolve(null);
        };
      } catch {
        resolve(null);
      }
    });

    return this.dbPromise;
  }

  public computeChecksum(data: object): string {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16);
  }

  public async save(saveData: SaveData): Promise<boolean> {
    saveData.version = CURRENT_SAVE_VERSION;
    // Calculate checksum without previous checksum field
    const { checksum, ...rest } = saveData;
    saveData.checksum = this.computeChecksum(rest);

    const db = await this.initDb();
    if (db) {
      return new Promise((resolve) => {
        try {
          const tx = db.transaction(this.storeName, 'readwrite');
          const store = tx.objectStore(this.storeName);
          const req = store.put(saveData);
          req.onsuccess = () => resolve(true);
          req.onerror = () => resolve(this.fallbackSave(saveData));
        } catch {
          resolve(this.fallbackSave(saveData));
        }
      });
    }

    return this.fallbackSave(saveData);
  }

  private fallbackSave(saveData: SaveData): boolean {
    if (typeof localStorage === 'undefined') return false;
    try {
      localStorage.setItem(`ese_save_${saveData.meta.slot}`, JSON.stringify(saveData));
      return true;
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
      return false;
    }
  }

  public async load(slot: number): Promise<SaveData | null> {
    const db = await this.initDb();
    let data: SaveData | null = null;

    if (db) {
      data = await new Promise((resolve) => {
        try {
          const tx = db.transaction(this.storeName, 'readonly');
          const store = tx.objectStore(this.storeName);
          const req = store.get(slot);
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      });
    }

    if (!data && typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(`ese_save_${slot}`);
      if (raw) {
        try {
          data = JSON.parse(raw);
        } catch {}
      }
    }

    if (data) {
      // Validate checksum
      const { checksum, ...rest } = data;
      if (checksum && checksum !== this.computeChecksum(rest)) {
        console.warn(`[SaveManager] Checksum mismatch in save slot ${slot}`);
      }

      // Version migration if needed
      data = this.migrateSaveData(data);
    }

    return data;
  }

  public async listSaves(): Promise<SaveMeta[]> {
    const metas: SaveMeta[] = [];
    const db = await this.initDb();

    if (db) {
      const saves: SaveData[] = await new Promise((resolve) => {
        try {
          const tx = db.transaction(this.storeName, 'readonly');
          const store = tx.objectStore(this.storeName);
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => resolve([]);
        } catch {
          resolve([]);
        }
      });

      for (const s of saves) {
        metas.push(s.meta);
      }
    } else if (typeof localStorage !== 'undefined') {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('ese_save_')) {
          try {
            const parsed = JSON.parse(localStorage.getItem(key)!);
            if (parsed && parsed.meta) {
              metas.push(parsed.meta);
            }
          } catch {}
        }
      }
    }

    return metas.sort((a, b) => b.timestamp - a.timestamp);
  }

  public async deleteSave(slot: number): Promise<boolean> {
    const db = await this.initDb();
    if (db) {
      try {
        const tx = db.transaction(this.storeName, 'readwrite');
        tx.objectStore(this.storeName).delete(slot);
      } catch {}
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(`ese_save_${slot}`);
    }
    return true;
  }

  public exportSaveFile(saveData: SaveData): string {
    return JSON.stringify(saveData, null, 2);
  }

  public importSaveFile(jsonString: string): SaveData | null {
    try {
      const data = JSON.parse(jsonString) as SaveData;
      if (!data.meta || !data.core || !data.resume) {
        throw new Error('Invalid save data format');
      }
      return this.migrateSaveData(data);
    } catch (e) {
      console.error('Failed to parse imported save file:', e);
      return null;
    }
  }

  private migrateSaveData(data: SaveData): SaveData {
    if (data.version < CURRENT_SAVE_VERSION) {
      // Future-proof migrations
      data.version = CURRENT_SAVE_VERSION;
    }
    return data;
  }
}
