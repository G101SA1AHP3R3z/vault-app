import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { Box, ShieldAlert } from 'lucide-react';

export default function Login() {
  const [error, setError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleGoogleLogin = async () => {
    setIsAuthenticating(true);
    setError('');
    
    try {
      await signInWithPopup(auth, googleProvider);
      // Once this succeeds, your VaultContext's onAuthStateChanged 
      // will automatically catch the new user and let them in.
    } catch (err) {
      console.error("Auth Error:", err);
      setError("Failed to get past the bouncer. Try again.");
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
        
        {/* Header / Branding */}
        <div className="bg-black p-10 flex flex-col items-center justify-center text-white relative overflow-hidden">
          {/* Edge-lord geometric background element */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-3xl" />
          
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-black rotate-3 shadow-lg mb-6">
            <Box className="w-8 h-8 stroke-[2.5px]" />
          </div>
          <h1 className="font-black text-4xl tracking-tighter uppercase mb-2">Vault</h1>
          <p className="text-xs font-mono text-gray-400 uppercase tracking-widest text-center">
            Restricted Access
          </p>
        </div>

        {/* Action Area */}
        <div className="p-10 flex flex-col items-center">
          <p className="text-sm font-bold text-gray-500 mb-8 text-center">
            Authenticate with your Google account to access your secure assets.
          </p>

          {error && (
            <div className="mb-6 w-full flex items-center gap-2 bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold uppercase tracking-wide">
              <ShieldAlert className="w-4 h-4" />
              {error}
            </div>
          )}

          <button
            onClick={handleGoogleLogin}
            disabled={isAuthenticating}
            className={`
              w-full flex items-center justify-center gap-3 py-4 px-6 rounded-xl font-black text-sm uppercase tracking-wide transition-all duration-300
              ${isAuthenticating 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-black text-white hover:bg-gray-900 hover:shadow-xl hover:-translate-y-1 active:translate-y-0'}
            `}
          >
            {isAuthenticating ? (
              "Verifying..."
            ) : (
              <>
                {/* Standard Google G SVG */}
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Sign In With Google
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}