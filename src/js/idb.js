const STORES = ["daily", "weekly", "monthly", "worksheets", "reviews", "startPoint", "outbox"];

export function memoryDb() {
  const stores = Object.fromEntries(STORES.map((name) => [name, new Map()]));
  let sequence = 1;
  return {
    async get(store, key) {
      const value = stores[store].get(key);
      return value === undefined ? null : structuredClone(value);
    },
    async put(store, key, value) {
      stores[store].set(key, structuredClone(value));
    },
    async delete(store, key) {
      stores[store].delete(key);
    },
    async all(store) {
      return [...stores[store].values()].map((value) => structuredClone(value));
    },
    async clear(store) {
      stores[store].clear();
    },
    async add(store, value) {
      const id = sequence;
      sequence += 1;
      stores[store].set(id, structuredClone({ ...value, id }));
      return id;
    },
    close() {},
  };
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function openIndexedDb(name) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const store of STORES) {
        if (db.objectStoreNames.contains(store)) continue;
        if (store === "outbox") db.createObjectStore(store, { keyPath: "id", autoIncrement: true });
        else db.createObjectStore(store);
      }
    };
    request.onsuccess = () => resolve(wrapIndexedDb(request.result));
    request.onerror = () => reject(request.error);
  });
}

function wrapIndexedDb(db) {
  return {
    async get(store, key) {
      const tx = db.transaction(store, "readonly");
      const value = await requestToPromise(tx.objectStore(store).get(key));
      return value ?? null;
    },
    async put(store, key, value) {
      const tx = db.transaction(store, "readwrite");
      await requestToPromise(tx.objectStore(store).put(value, key));
    },
    async delete(store, key) {
      const tx = db.transaction(store, "readwrite");
      await requestToPromise(tx.objectStore(store).delete(key));
    },
    async all(store) {
      const tx = db.transaction(store, "readonly");
      return (await requestToPromise(tx.objectStore(store).getAll())) || [];
    },
    async clear(store) {
      const tx = db.transaction(store, "readwrite");
      await requestToPromise(tx.objectStore(store).clear());
    },
    async add(store, value) {
      const tx = db.transaction(store, "readwrite");
      return requestToPromise(tx.objectStore(store).add(value));
    },
    close() {
      db.close();
    },
  };
}

export async function openUserDb(userId) {
  if (typeof indexedDB === "undefined") return memoryDb();
  try {
    return await openIndexedDb(`positive-planner:${userId}`);
  } catch (error) {
    console.warn("IndexedDB를 열지 못해 이 탭의 메모리에만 둡니다.", error);
    return memoryDb();
  }
}
