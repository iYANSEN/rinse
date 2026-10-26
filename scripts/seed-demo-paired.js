#!/usr/bin/env node
/* Seed demo jobs with properly paired photos.
   Naming: X-1 = before, X-2 = after (X = pair number 1-11) */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PHOTO_DIR = path.join(__dirname, '..', 'paired-photos');
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

const pairs = [
  { num: 1, name: 'Concrete Driveway', client: 'Miller Residence', address: '124 Oak Street', cap: 'Front driveway' },
  { num: 2, name: 'Paved Driveway', client: 'Chen Family', address: '88 Maple Lane', cap: 'Paved driveway' },
  { num: 3, name: 'House Washing', client: 'Rodriguez Home', address: '210 Pine Avenue', cap: 'House exterior' },
  { num: 4, name: 'Brick Cleaning', client: 'Thompson Property', address: '45 Elm Court', cap: 'Brick walkway' },
  { num: 5, name: 'Patio Cleaning', client: 'Williams Backyard', address: '33 Cedar Drive', cap: 'Backyard patio' },
  { num: 6, name: 'Pathway Cleaning', client: 'Davis Garden', address: '77 Birch Road', cap: 'Garden pathway' },
  { num: 7, name: 'Staircase Cleaning', client: 'Anderson Entry', address: '12 Summit Lane', cap: 'Front staircase' },
  { num: 8, name: 'Furniture Cleaning', client: 'Garcia Patio', address: '560 Lake View', cap: 'Patio furniture' },
  { num: 9, name: 'Cladding Cleaning', client: 'Martinez Exterior', address: '99 Ridge Road', cap: 'Side cladding' },
  { num: 10, name: 'Balcony Cleaning', client: 'Taylor Apartment', address: '4B Harbor Point', cap: 'Balcony deck' },
  { num: 11, name: 'Mixed Exterior', client: 'Various Clients', address: 'Multiple locations', cap: 'Mixed areas' },
];

async function main() {
  const jobs = [];
  const photos = [];
  const now = Date.now();

  for (let i = 0; i < pairs.length; i++) {
    const p = pairs[i];
    const jobId = uid();
    const pairId = 'p' + uid();

    // Verify both files exist
    const beforeFile = `${p.num}-1${p.num === 2 ? '.png' : '.jpg'}`;
    const afterFile = `${p.num}-2${p.num === 2 ? '.png' : '.jpg'}`;
    const beforePath = path.join(PHOTO_DIR, beforeFile);
    const afterPath = path.join(PHOTO_DIR, afterFile);

    if (!fs.existsSync(beforePath) || !fs.existsSync(afterPath)) {
      console.warn(`Missing files for pair ${p.num}: ${beforeFile}, ${afterFile}`);
      continue;
    }

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

    const beforeB64 = fileToBase64(beforePath);
    const afterB64 = fileToBase64(afterPath);

    const t0 = now + i * 86400000 - 3600000; // 1 hour before

    const beforePhoto = {
      id: uid(),
      jobId: jobId,
      blob: beforeB64,
      thumb: beforeB64,
      sig: null,
      role: 'before',
      pairId: pairId,
      t: t0,
      name: beforeFile,
    };

    const afterPhoto = {
      id: uid(),
      jobId: jobId,
      blob: afterB64,
      thumb: afterB64,
      sig: null,
      role: 'after',
      pairId: pairId,
      t: t0 + 7200000, // 2 hours after
      name: afterFile,
      cap: p.cap,
    };

    photos.push(beforePhoto, afterPhoto);
  }

  const seed = { jobs, photos };
  fs.writeFileSync(OUT_FILE, JSON.stringify(seed, null, 2));
  console.log(`Wrote ${jobs.length} jobs and ${photos.length} photos to ${OUT_FILE}`);
}

main().catch(e => { console.error(e); process.exit(1); });