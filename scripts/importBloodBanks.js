const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const BloodBank = require('../models/BloodBank');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const REQUIRED_FIELDS = ['name', 'state', 'district'];

const headerAliases = {
  name: ['name', 'bloodbankname', 'blood_bank_name', 'blood bank name', 'bloodbank'],
  state: ['state', 'statename', 'state_name'],
  district: ['district', 'districtname', 'district_name', 'city'],
  address: ['address', 'addr', 'bloodbankaddress', 'blood_bank_address'],
  pincode: ['pincode', 'pin', 'pin_code', 'zipcode', 'zip'],
  phone: ['phone', 'contact', 'contactno', 'contact_no', 'mobile', 'telephone'],
  email: ['email', 'emailid', 'email_id'],
  website: ['website', 'websitelink', 'website_link', 'url'],
  latitude: ['latitude', 'lat'],
  longitude: ['longitude', 'lng', 'lon', 'long'],
  geolocation: ['geolocation', 'geo_location', 'geo location', 'location'],
};

const normalizeKey = (value) => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');

const canonicalFieldFor = (header) => {
  const normalizedHeader = normalizeKey(header);
  return Object.entries(headerAliases).find(([, aliases]) => (
    aliases.some((alias) => normalizeKey(alias) === normalizedHeader)
  ))?.[0];
};

const parseCsv = (content) => {
  const rows = [];
  let row = [];
  let value = '';
  let quoted = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const next = content[index + 1];

    if (char === '"' && quoted && next === '"') {
      value += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(value);
      value = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(value);
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      value = '';
    } else {
      value += char;
    }
  }

  if (value || row.length) {
    row.push(value);
    if (row.some((cell) => cell.trim())) rows.push(row);
  }

  return rows;
};

const readRecords = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  const content = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');

  if (ext === '.json') {
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : parsed.data || parsed.bloodBanks || [];
  }

  if (ext !== '.csv') {
    throw new Error('Blood bank directory must be a .csv or .json file');
  }

  const [headers, ...rows] = parseCsv(content);
  const fields = headers.map(canonicalFieldFor);

  return rows.map((row) => fields.reduce((record, field, index) => {
    if (field) record[field] = row[index]?.trim() || '';
    return record;
  }, {}));
};

const loadCoordinateMap = (filePath) => {
  if (!filePath || !fs.existsSync(filePath)) return new Map();

  const content = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  const records = JSON.parse(content);
  const map = new Map();

  for (const record of records) {
    const state = normalizePlace(record.state);
    const district = normalizePlace(record.district || record.name);
    const latitude = Number(record.latitude);
    const longitude = Number(record.longitude);

    if (!state || !Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;

    if (normalizePlace(record.scope || record.level) === 'state' || !district) {
      map.set(`${state}:__state__`, [longitude, latitude]);
    } else {
      map.set(`${state}:${district}`, [longitude, latitude]);
    }
  }

  return map;
};

const normalizePlace = (value) => String(value || '').trim().toLowerCase();

const getCoordinates = (record, coordinateMap) => {
  const latitude = Number(record.latitude);
  const longitude = Number(record.longitude);

  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    return [longitude, latitude];
  }

  if (record.geolocation) {
    const match = String(record.geolocation).match(/(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)/);
    if (match) {
      const first = Number(match[1]);
      const second = Number(match[2]);
      if (Number.isFinite(first) && Number.isFinite(second)) {
        return Math.abs(first) <= 90 && Math.abs(second) <= 180 ? [second, first] : [first, second];
      }
    }
  }

  const state = normalizePlace(record.state);
  const district = normalizePlace(record.district);
  return coordinateMap.get(`${state}:${district}`) || coordinateMap.get(`${state}:__state__`);
};

const sanitizeRecord = (record, coordinateMap) => {
  const missingFields = REQUIRED_FIELDS.filter((field) => !String(record[field] || '').trim());

  if (missingFields.length) {
    return { error: `missing ${missingFields.join(', ')}` };
  }

  const coordinates = getCoordinates(record, coordinateMap);

  if (!coordinates) {
    return { error: 'missing coordinates and no district/state fallback found' };
  }

  return {
    value: {
      name: String(record.name).trim(),
      state: String(record.state).trim(),
      district: String(record.district).trim(),
      address: String(record.address || '').trim(),
      pincode: String(record.pincode || '').trim(),
      phone: String(record.phone || '').trim(),
      email: String(record.email || '').trim(),
      website: String(record.website || '').trim(),
      source: 'eRaktKosh',
      location: {
        type: 'Point',
        coordinates,
      },
      inventory: {
        'A+': Math.floor(Math.random() * 35) + 5,
        'A-': Math.floor(Math.random() * 10) + 1,
        'B+': Math.floor(Math.random() * 40) + 5,
        'B-': Math.floor(Math.random() * 10) + 1,
        'AB+': Math.floor(Math.random() * 15) + 2,
        'AB-': Math.floor(Math.random() * 5) + 1,
        'O+': Math.floor(Math.random() * 50) + 5,
        'O-': Math.floor(Math.random() * 15) + 2,
      },
    },
  };
};

const importBloodBanks = async () => {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const fileArgs = args.filter((arg) => arg !== '--dry-run');
  const [directoryFile, coordinateFile = path.join(__dirname, '..', 'data', 'india-district-coordinates.sample.json')] = fileArgs;

  if (!directoryFile) {
    throw new Error('Usage: npm run import:blood-banks -- <blood-bank-directory.csv|json> [district-coordinates.json] [--dry-run]');
  }

  const directoryPath = path.resolve(directoryFile);
  const coordinatePath = path.resolve(coordinateFile);
  const coordinateMap = loadCoordinateMap(coordinatePath);
  const records = readRecords(directoryPath);
  const operations = [];
  const skipped = [];

  for (const [index, record] of records.entries()) {
    const { value, error } = sanitizeRecord(record, coordinateMap);

    if (error) {
      skipped.push({ row: index + 2, reason: error, name: record.name || '' });
      continue;
    }

    operations.push({
      updateOne: {
        filter: {
          name: value.name,
          state: value.state,
          district: value.district,
        },
        update: { $set: value },
        upsert: true,
      },
    });
  }

  if (dryRun) {
    console.log(`Valid records: ${operations.length}`);
    console.log(`Skipped: ${skipped.length}`);

    if (operations.length) {
      const preview = operations[0].updateOne.update.$set;
      console.log('Preview:');
      console.log(JSON.stringify(preview, null, 2));
    }

    if (skipped.length) {
      console.log('First skipped rows:');
      skipped.slice(0, 10).forEach((item) => {
        console.log(`- row ${item.row}: ${item.reason}${item.name ? ` (${item.name})` : ''}`);
      });
    }

    return;
  }

  await connectDB(process.env.MONGO_URI);

  if (operations.length) {
    await BloodBank.bulkWrite(operations, { ordered: false });
  }

  console.log(`Imported/updated: ${operations.length}`);
  console.log(`Skipped: ${skipped.length}`);

  if (skipped.length) {
    console.log('First skipped rows:');
    skipped.slice(0, 10).forEach((item) => {
      console.log(`- row ${item.row}: ${item.reason}${item.name ? ` (${item.name})` : ''}`);
    });
  }

  await mongoose.disconnect();
};

importBloodBanks().catch(async (error) => {
  console.error(error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
