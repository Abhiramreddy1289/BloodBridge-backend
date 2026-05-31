const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const RESOURCE_ID = 'blood-bank-directory-updated-till-last-month';
const DEFAULT_OUTPUT = path.join(__dirname, '..', 'data', 'government-blood-banks.json');
const DEFAULT_API_KEY = '579b464db66ec23bdd0000017f2fc59a0ed6236a7a2287636e767376';

const normalizeRecord = (record) => ({
  name: pick(record, ['blood_bank_name', 'bloodbank_name', 'blood_bank', 'name']),
  state: pick(record, ['state', 'state_name']),
  district: pick(record, ['district', 'city', 'district_name']),
  address: pick(record, ['address', 'blood_bank_address']),
  pincode: pick(record, ['pincode', 'pin_code', 'pin']),
  phone: pick(record, ['contact_no', 'phone', 'mobile', 'telephone']),
  email: pick(record, ['email', 'email_id']),
  website: pick(record, ['website', 'website_link', 'websitelink']),
  latitude: pick(record, ['latitude', 'lat']),
  longitude: pick(record, ['longitude', 'lng', 'lon']),
  geolocation: pick(record, ['geolocation', 'geo_location']),
});

const pick = (record, keys) => {
  const entry = Object.entries(record).find(([key, value]) => (
    keys.includes(key.toLowerCase().replace(/[^a-z0-9_]+/g, '_')) && value !== undefined && value !== null
  ));

  return entry ? String(entry[1]).trim() : '';
};

const downloadBloodBanks = async () => {
  const outputPath = path.resolve(process.argv[2] || DEFAULT_OUTPUT);
  const apiKey = process.env.DATA_GOV_API_KEY || DEFAULT_API_KEY;
  const limit = Number(process.env.DATA_GOV_LIMIT || 1000);
  let offset = 0;
  let allRecords = [];

  while (true) {
    const url = new URL(`https://api.data.gov.in/resource/${RESOURCE_ID}`);
    url.searchParams.set('api-key', apiKey);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('offset', String(offset));

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`data.gov.in request failed with ${response.status}`);
    }

    const payload = await response.json();
    const records = payload.records || [];
    allRecords = allRecords.concat(records.map(normalizeRecord));

    console.log(`Downloaded ${allRecords.length} records...`);

    if (records.length < limit) break;
    offset += limit;
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(allRecords, null, 2));
  console.log(`Saved ${allRecords.length} blood bank records to ${outputPath}`);
};

downloadBloodBanks().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
