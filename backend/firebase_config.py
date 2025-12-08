"""Firebase Admin SDK configuration for backend."""
import firebase_admin
from firebase_admin import credentials, firestore
import os

# Initialize Firebase Admin SDK
def initialize_firebase():
    """Initialize Firebase Admin SDK with credentials."""
    try:
        # Check if already initialized
        if not firebase_admin._apps:
            # Try to load service account key if available
            service_account_path = os.environ.get('FIREBASE_SERVICE_ACCOUNT_KEY', 'serviceAccountKey.json')
            
            if os.path.exists(service_account_path):
                # Initialize with service account
                cred = credentials.Certificate(service_account_path)
                firebase_admin.initialize_app(cred)
                print("✓ Firebase initialized with service account")
            else:
                # Initialize with default credentials (for development)
                firebase_admin.initialize_app(options={
                    'projectId': 'paperly-b08fb',
                })
                print("✓ Firebase initialized with default credentials")
        
        return firestore.client()
    except Exception as e:
        print(f"⚠ Firebase initialization warning: {e}")
        print("⚠ Continuing without Firebase - data will be stored in memory only")
        return None

# Initialize Firestore client
db = initialize_firebase()
