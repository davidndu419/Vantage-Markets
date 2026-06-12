import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const getServiceAccount = () => {
  const rawCredential = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!rawCredential) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY is not configured.');
  }

  const serviceAccount = rawCredential.trim().startsWith('{')
    ? JSON.parse(rawCredential)
    : {
        projectId: process.env.VITE_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: rawCredential,
      };
  if (!serviceAccount.client_email && !serviceAccount.clientEmail) {
    throw new Error('FIREBASE_CLIENT_EMAIL is required when using a PEM private key.');
  }
  if (serviceAccount.private_key) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
  }
  if (serviceAccount.privateKey) {
    serviceAccount.privateKey = serviceAccount.privateKey.replace(/\\n/g, '\n');
  }
  return serviceAccount;
};

const app = getApps()[0] || initializeApp({
  credential: cert(getServiceAccount()),
});

export const adminDb = getFirestore(app);
