# BloodBridge Backend

Emergency Blood Connector backend built with Node.js, Express, and MongoDB.

## Setup
1. Copy `.env.example` to `.env`
2. Install dependencies: `npm install`
3. Start the server: `npm run dev`

## API
The backend exposes routes under `/api/auth`, `/api/donors`, `/api/requests`, `/api/search`, `/api/admin`, and `/api/blood-banks`.

## Blood bank directory import
Import static blood bank data once, then use e-RaktKosh for live stock availability.

```bash
npm run download:blood-banks -- ./data/government-blood-banks.json
npm run import:blood-banks -- ./data/blood-banks.sample.csv ./data/india-district-coordinates.sample.json --dry-run
npm run import:blood-banks -- ./path/to/government-blood-banks.csv ./path/to/india-district-coordinates.json
npm run import:blood-banks -- ./data/government-blood-banks.json ./data/india-district-coordinates.sample.json
```

Supported directory formats: CSV and JSON.

MongoDB stores static fields only: name, state, district, address, pincode, phone, email, website, coordinates, and source.

Coordinate files should contain district rows:

```json
{ "state": "Delhi", "district": "New Delhi", "latitude": 28.6139, "longitude": 77.209 }
```

Add optional state fallback rows with `"scope": "state"`:

```json
{ "state": "Delhi", "scope": "state", "latitude": 28.7041, "longitude": 77.1025 }
```
