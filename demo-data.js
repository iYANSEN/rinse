// Demo data with real paired photos (11 jobs, 22 photos, properly paired X-1=before, X-2=after)
// This file is loaded as a module and used by makeDemo()

const PHOTO_BASE = '/paired-photos/';

const PAIRS = [
  { num: 1, name: 'Concrete Driveway', client: 'Miller Residence', address: '124 Oak Street', cap: 'Front driveway', ext: '.jpg' },
  { num: 2, name: 'Paved Driveway', client: 'Chen Family', address: '88 Maple Lane', cap: 'Paved driveway', ext: '.png' },
  { num: 3, name: 'Driveway Washing', client: 'Rodriguez Home', address: '210 Pine Avenue', cap: 'House exterior', ext: '.jpg' },
  { num: 4, name: 'House Cleaning', client: 'Thompson Property', address: '45 Elm Court', cap: 'Brick walkway', ext: '.jpg' },
  { num: 5, name: 'Pathway Cleaning', client: 'Williams Backyard', address: '33 Cedar Drive', cap: 'Backyard patio', ext: '.jpg' },
  { num: 6, name: 'Pathway Cleaning', client: 'Davis Garden', address: '77 Birch Road', cap: 'Garden pathway', ext: '.jpg' },
  { num: 7, name: 'Pathway Cleaning', client: 'Anderson Entry', address: '12 Summit Lane', cap: 'Front staircase', ext: '.jpg' },
  { num: 8, name: 'Stairway Cleaning', client: 'Garcia Patio', address: '560 Lake View', cap: 'Patio furniture', ext: '.jpg' },
  { num: 9, name: 'Patio Cleaning', client: 'Martinez Exterior', address: '99 Ridge Road', cap: 'Side cladding', ext: '.jpg' },
  { num: 10, name: 'Cladding Cleaning', client: 'Taylor Apartment', address: '4B Harbor Point', cap: 'Balcony deck', ext: '.jpg' },
  { num: 11, name: 'Balcony Cleaning', client: 'Various Clients', address: 'Multiple locations', cap: 'Mixed areas', ext: '.jpg' },
];

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function createDemoJobs() {
  const jobs = [];
  const photos = [];
  const now = Date.now();

  for (let i = 0; i < PAIRS.length; i++) {
    const p = PAIRS[i];
    const jobId = uid();
    const pairId = 'p' + uid();

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

    const beforeFile = `${p.num}-1${p.ext}`;
    const afterFile = `${p.num}-2${p.ext}`;

    const t0 = now + i * 86400000 - 3600000;

    const beforePhoto = {
      id: uid(),
      jobId: jobId,
      blob: null, // Will be loaded from URL
      thumb: null,
      src: PHOTO_BASE + beforeFile,
      sig: null,
      role: 'before',
      pairId: pairId,
      t: t0,
      name: beforeFile,
    };

    const afterPhoto = {
      id: uid(),
      jobId: jobId,
      blob: null,
      thumb: null,
      src: PHOTO_BASE + afterFile,
      sig: null,
      role: 'after',
      pairId: pairId,
      t: t0 + 7200000,
      name: afterFile,
      cap: p.cap,
    };

    photos.push(beforePhoto, afterPhoto);
  }

  return { jobs, photos };
}

export { PAIRS };