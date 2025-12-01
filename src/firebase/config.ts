
export const firebaseConfig = {
  "projectId": "studio-9145223887-757dc",
  "appId": "1:154400695338:web:04e371c9f1946cac490f53",
  "apiKey": "AIzaSyDPonZuJ2vcfl4jsrtwkpnb6mJWq0b5DFg",
  "authDomain": "studio-9145223887-757dc.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "154400695338"
};

// Action code settings for email verification link
export const actionCodeSettings = {
  // URL to redirect back to. The domain (www.example.com)
  // must be whitelisted in the Firebase Console.
  url: `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:9002'}/history`,
  // This must be true.
  handleCodeInApp: true,
};
