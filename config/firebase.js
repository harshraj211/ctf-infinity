const admin = require('firebase-admin');

let db, bucket;

function initFirebase() {
  if (admin.apps.length > 0) return;

  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    : null;

  if (!serviceAccount) {
    console.warn('⚠️  No FIREBASE_SERVICE_ACCOUNT found in .env — Firebase features disabled.');
    return;
  }

  const appConfig = { credential: admin.credential.cert(serviceAccount) };

  // Only init storage if a bucket is specified
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;
  if (storageBucket && storageBucket.trim() !== '') {
    appConfig.storageBucket = storageBucket.trim();
  }

  admin.initializeApp(appConfig);
  db = admin.firestore();

  if (storageBucket && storageBucket.trim() !== '') {
    bucket = admin.storage().bucket();
    console.log('🔥 Firebase initialized (Firestore + Storage)');
  } else {
    console.log('🔥 Firebase initialized (Firestore only — Storage skipped)');
  }
}

initFirebase();

module.exports = {
  get db() { return db; },
  get bucket() { return bucket; },
  admin,
};
