const path = require('path');
const dotenv = require('dotenv');

// Load env from current directory
dotenv.config({ path: path.join(__dirname, '.env') });

const connectDB = require('./config/db');
const app = require('./app');
const { startCampReminderJob } = require('./utils/campReminderJob');

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

// Attempt to connect to DB but don't block server start
connectDB(MONGO_URI)
  .then(() => {
    console.log('Database connected successfully');
    startCampReminderJob();
  })
  .catch((error) => {
    console.error('Database connection failed:', error.message);
    console.log('Starting server in offline mode (DB-dependent features will fail)...');
  });

app.listen(PORT, () => {
  console.log(`BloodBridge backend running on http://localhost:${PORT}`);
});


