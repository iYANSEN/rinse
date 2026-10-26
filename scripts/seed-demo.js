#!/usr/bin/env node
/* Seed demo jobs with real photos. Run with: node scripts/seed-demo.js
   Outputs a JSON file that can be loaded in the browser console to populate IndexedDB. */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PHOTO_DIR = path.join(__dirname, '..', 'demo-photos');
const OUT_FILE = path.join(__dirname, '..', 'demo-seed.json');

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function fileToBase64(filepath) {
  const buf = fs.readFileSync(filepath);
  const ext = path.extname(filepath).toLowerCase();
  const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
  return `data:${mime};base64,${buf.toString('base64')}`;
}

// Before/after pairs based on filenames
const pairs = [
  {
    name: 'Concrete Driveway',
    client: 'Miller Residence',
    address: '124 Oak Street',
    before: '1.-Concrete-Driveway-Cleaning-Before-And-After.jpg',
    after: '20261025_040750.jpg',
    cap: 'Front driveway',
  },
  {
    name: 'Paved Driveway',
    client: 'Chen Family',
    address: '88 Maple Lane',
    before: '2.-Paved-Driveway-Cleaning-Before-And-After.jpg',
    after: '20261025_040822.jpg',
    cap: 'Paved driveway',
  },
  {
    name: 'House Washing',
    client: 'Rodriguez Home',
    address: '210 Pine Avenue',
    before: '3.-House-Washing-Before-And-After.jpg',
    after: '20261025_040855.jpg',
    cap: 'House exterior',
  },
  {
    name: 'Brick Cleaning',
    client: 'Thompson Property',
    address: '45 Elm Court',
    before: '4.-Brick-Cleaning-Before-And-After.jpg',
    after: '20261025_040912.jpg',
    cap: 'Brick walkway',
  },
  {
    name: 'Patio Pressure Cleaning',
    client: 'Williams Backyard',
    address: '33 Cedar Drive',
    before: '5.-Patio-Pressure-Cleaning-Before-And-After.jpg',
    after: '20261025_040952.jpg',
    cap: 'Backyard patio',
  },
  {
    name: 'Pathway Pressure Cleaning',
    client: 'Davis Garden',
    address: '77 Birch Road',
    before: '6.-Pathway-Pressure-Cleaning-Before-And-After.jpg',
    after: '20261025_041017.jpg',
    cap: 'Garden pathway',
  },
  {
    name: 'Staircase Cleaning',
    client: 'Anderson Entry',
    address: '12 Summit Lane',
    before: '7.-Staircase-Pressure-Cleaning-Before-And-After.jpg',
    after: '20261025_041035.jpg',
    cap: 'Front staircase',
  },
  {
    name: 'Furniture Cleaning',
    client: 'Garcia Patio',
    address: '560 Lake View',
    before: '8.-Furniture-Pressure-Cleaning-Before-And-After.jpg',
    after: '20261025_041053.jpg',
    cap: 'Patio furniture',
  },
  {
    name: 'Cladding Cleaning',
    client: 'Martinez Exterior',
    address: '99 Ridge Road',
    before: '9.-Cladding-Pressure-Cleaning-Before-And-After.jpg',
    after: '20261025_041116.jpg',
    cap: 'Side cladding',
  },
  {
    name: 'Balcony Cleaning',
    client: 'Taylor Apartment',
    address: '4B Harbor Point',
    before: '10.-Balcony-Pressure-Cleaning-Before-And-After.jpg',
    after: '20261025_041146.jpg',
    cap: 'Balcony deck',
  },
  {
    name: 'Driveway Broward County',
    client: 'Johnson Residence',
    address: '20261025_040721.png',
    before: 'before-after-driveway-cleaning-broward-county-fl.png',
    after: '20261025_040721.png',
    cap: 'Main driveway',
  },
];

function makeThumb(base64, maxDim = 384) {
  // We'll let the browser create thumbnails on import
  return base64;
}

async function main() {
  const jobs = [];
  const photos = [];
  const now = Date.now();

  for (let i = 0; i < pairs.length; i++) {
    const p = pairs[i];
    const jobId = uid();
    const pairId = 'p' + uid();

    // Create job
    const job = {
      id: jobId,
      name: p.name,
      client: p.client,
      address: p.address,
      date: new Date(now + i * 86400000).toISOString().slice(0, 10),
      demo: true,
      created: now + i * 86400000,
      message: `Hi ${p.client}, your ${p.name.toLowerCase()} looks brand new after today's wash. Slide the photo below to see the difference!`,
    };
    jobs.push(job);

    // Before photo
    const beforePath = path.join(PHOTO_DIR, p.before);
    const afterPath = path.join(PHOTO_DIR, p.after);

    if (!fs.existsSync(beforePath)) {
      console.warn(`Missing before: ${p.before}`);
      continue;
    }
    if (!fs.existsSync(afterPath)) {
      console.warn(`Missing after: ${p.after}`);
      continue;
    }

    const beforeB64 = fileToBase64(beforePath);
    const afterB64 = fileToBase64(afterPath);

    const t0 = now + i * 86400000 - 3600000; // 1 hour before

    const beforePhoto = {
      id: uid(),
      jobId: jobId,
      blob: beforeB64, // Will be converted to blob on import
      thumb: makeThumb(beforeB64),
      sig: null,
      role: 'before',
      pairId: pairId,
      t: t0,
      name: p.before,
    };

    const afterPhoto = {
      id: uid(),
      jobId: jobId,
      blob: afterB64,
      thumb: makeThumb(afterB64),
      sig: null,
      role: 'after',
      pairId: pairId,
      t: t0 + 7200000, // 2 hours after
      name: p.after,
      cap: p.cap,
    };

    photos.push(beforePhoto, afterPhoto);
  }

  // Also add the extra photos as a separate job
  const extraPhotos = [
    'IMG-20261020-WA0010.jpg',
    'Screenshot_20261022_172149_Edge.jpg',
    'Screenshot_20261024_031824_Samsung Notes.jpg',
    'Screenshot_20261024_031832_Samsung Notes.jpg',
  ].filter(f => fs.existsSync(path.join(PHOTO_DIR, f)));

  if (extraPhotos.length >= 2) {
    const jobId = uid();
    const pairId = 'p' + uid();
    const job = {
      id: jobId,
      name: 'Mixed Exterior Cleaning',
      client: 'Various Clients',
      address: 'Multiple locations',
      date: new Date(now + pairs.length * 86400000).toISOString().slice(0, 10),
      demo: true,
      created: now + pairs.length * 86400000,
      message: 'A collection of recent pressure washing jobs. Each area transformed.',
    };
    jobs.push(job);

    extraPhotos.forEach((f, idx) => {
      const p = path.join(PHOTO_DIR, f);
      if (fs.existsSync(p)) {
        const b64 = fileToBase64(p);
        photos.push({
          id: uid(),
          jobId,
          blob: b64,
          thumb: makeThumb(b64),
          sig: null,
          role: idx % 2 === 0 ? 'before' : 'after',
          pairId: idx % 2 === 0 ? pairId : null,
          t: now + pairs.length * 86400000 + idx * 3600000,
          name: f,
          cap: idx % 2 === 1 ? `Area ${Math.floor(idx/2)+1}` : '',
        });
      }
    });
  }

  const seed = { jobs, photos };
  fs.writeFileSync(OUT_FILE, JSON.stringify(seed, null, 2));
  console.log(`Wrote ${jobs.length} jobs and ${photos.length} photos to ${OUT_FILE}`);
}

main().catch(e => { console.error(e); process.exit(1); });