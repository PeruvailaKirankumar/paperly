# Firebase Service Account Setup

To enable backend to write to Firestore, you need a service account key:

## Steps to Get Service Account Key:

1. Go to Firebase Console: https://console.firebase.google.com/
2. Select your project: "paperly-b08fb"
3. Click the gear icon (⚙️) next to "Project Overview"
4. Click "Project settings"
5. Go to "Service accounts" tab
6. Click "Generate new private key"
7. Save the downloaded JSON file as `serviceAccountKey.json` in the `backend/` directory

## Alternative - Using Application Default Credentials:

If you don't want to use a service account key file, the backend will use default credentials.
The backend will still work in development mode - it will store data in memory and log warnings.

For production, you MUST use a service account key.

## Security Note:

**NEVER commit `serviceAccountKey.json` to git!**

It's already in `.gitignore`. Keep it secure.
