/* Import demo seed data into Rinse IndexedDB.
   Usage: Open app in browser, paste this into console, or load as a script. */

(async function() {
  const response = await fetch('demo-seed.json');
  if (!response.ok) throw new Error('Could not load demo-seed.json');
  const seed = await response.json();

  const DB_NAME = 'rinse';
  const STORES = ['jobs', 'photos', 'outbox'];

  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('jobs')) db.createObjectStore('jobs', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('photos')) {
          const s = db.createObjectStore('photos', { keyPath: 'id' });
          s.createIndex('job', 'jobId');
        }
        if (!db.objectStoreNames.contains('outbox')) db.createObjectStore('outbox', { keyPath: 'id' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  function putAll(db, storeName, items) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      let count = 0;
      items.forEach(item => {
        const req = store.put(item);
        req.onsuccess = () => { if (++count === items.length) resolve(); };
        req.onerror = () => reject(req.error);
      });
      if (items.length === 0) resolve();
    });
  }

  function dataUrlToBlob(dataUrl) {
    const [header, b64] = dataUrl.split(',');
    const mime = header.match(/data:(.+);base64/)[1];
    const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    return new Blob([bytes], { type: mime });
  }

  const db = await openDB();
  console.log('Opened DB, importing', seed.jobs.length, 'jobs and', seed.photos.length, 'photos');

  // Convert base64 data URLs to blobs for photos
  for (const p of seed.photos) {
    if (p.blob && p.blob.startsWith('data:')) {
      p.blob = dataUrlToBlob(p.blob);
    }
    if (p.thumb && p.thumb.startsWith('data:')) {
      p.thumb = dataUrlToBlob(p.thumb);
    }
  }

  await putAll(db, 'jobs', seed.jobs);
  await putAll(db, 'photos', seed.photos);
  console.log('Import complete!');
  console.log('Reload the page to see the new demo jobs.');
})();