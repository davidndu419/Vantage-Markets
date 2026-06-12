interface FirebaseTokenPayload {
  aud?: string;
  exp?: number;
  sub?: string;
  user_id?: string;
}

const decodeTokenPayload = (token: string): FirebaseTokenPayload => {
  const payload = token.split('.')[1];
  if (!payload) throw new Error('Invalid authentication token.');

  return JSON.parse(
    Buffer.from(payload, 'base64url').toString('utf8')
  ) as FirebaseTokenPayload;
};

export const requireAdmin = async (authorization?: string): Promise<string> => {
  const token = authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : '';
  if (!token) throw new Error('Unauthorized');

  const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error('Firebase project is not configured.');

  const payload = decodeTokenPayload(token);
  const uid = payload.user_id || payload.sub;
  if (
    !uid
    || payload.aud !== projectId
    || !payload.exp
    || payload.exp * 1000 <= Date.now()
  ) {
    throw new Error('Unauthorized');
  }

  const userUrl =
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}`
    + `/databases/(default)/documents/users/${encodeURIComponent(uid)}`;
  const response = await fetch(userUrl, {
    headers: { authorization: `Bearer ${token}` },
  });

  if (!response.ok) throw new Error('Unauthorized');

  const userDocument = await response.json();
  if (userDocument.fields?.role?.stringValue !== 'admin') {
    throw new Error('Forbidden');
  }

  return uid;
};
