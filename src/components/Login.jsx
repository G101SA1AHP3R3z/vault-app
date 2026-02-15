import React, { useState } from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../lib/firebase";
import { Loader2, Lock } from "lucide-react";

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      // This throws up the Google account selection window
      await signInWithPopup(auth, googleProvider);
      // We don't need to do anything else here! 
      // VaultContext is listening and will automatically let us in.
    } catch (error) {
      console.error("Login failed:", error);
      alert("Google threw a fit and denied your entry. Check the console.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-4 selection:bg-black selection:text-white">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-200 animate-in zoom-in-95 duration-500">
        
        <div className="p-10 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mb-6 shadow-xl">
            <Lock className="w-8 h-8 text-white" />
          </div>
          
          <h1 className="text-4xl font-black uppercase tracking-tighter text-black mb-2">
            The Vault
          </h1>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-10">
            Authorized Personnel Only
          </p>

          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full py-4 px-6 bg-black text-white rounded-xl font-black uppercase tracking-widest text-sm shadow-xl hover:bg-gray-900 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                {/* Custom Google G SVG for that premium feel */}
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Sign in with Google
              </>
            )}
          </button>
        </div>

        <div className="bg-gray-50 p-6 border-t border-gray-100 text-center">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            Secure Tailor Shop Management
          </p>
        </div>

      </div>
    </div>
  );
}