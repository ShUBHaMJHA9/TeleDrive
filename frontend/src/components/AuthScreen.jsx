import React, { useState } from 'react';
import { useAuth } from '../hooks';
import { Loader2, Check } from 'lucide-react';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

const AuthScreen = () => {
  const { requestCode, verifyCode } = useAuth();
  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRequestCode = async (e) => {
    e.preventDefault();
    setError('');
    
    // Phone from react-phone-input-2 already includes country code, e.g. '+911234567890'
    if (phone.length < 10) {
      setError('Please enter a valid phone number');
      return;
    }

    try {
      setLoading(true);
      await requestCode(phone);
      setStep('code');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setError('');
    try {
      setLoading(true);
      await verifyCode(phone, code);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Hero Section */}
        <div className="mb-12 text-center">
          <img src="/logo.png" alt="TeleDrive" className="w-28 h-28 mx-auto mb-6" />
          <h1 className="text-4xl font-bold text-gray-900 mb-3 tracking-tight">TeleDrive</h1>
          
          {/* Feature Tagline */}
          <div className="flex items-center justify-center gap-2 text-sm font-medium text-gray-600 mb-4">
            <span>☁️ Unlimited Storage</span>
            <span className="text-gray-400">•</span>
            <span>🔒 Secure</span>
            <span className="text-gray-400">•</span>
            <span>🔐 Private</span>
          </div>
          
          <p className="text-gray-600 text-base">Cloud storage powered by Telegram</p>
        </div>

        {/* Auth Card */}
        <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-sm">
          {step === 'phone' ? (
            <form onSubmit={handleRequestCode} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3 tracking-wide">
                  Phone Number
                </label>

                {/* Phone Input with Country Selector */}
                <PhoneInput
                  country={'in'}
                  value={phone}
                  onChange={setPhone}
                  inputProps={{
                    placeholder: 'Enter your mobile number',
                    disabled: loading,
                    autoFocus: true,
                  }}
                  preferredCountries={['in', 'us', 'gb', 'ca', 'au']}
                  enableSearch={true}
                  disableDropdown={false}
                />

                <p className="text-sm text-gray-500 mt-3 ml-0.5">We'll send a 6-digit verification code via Telegram</p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || phone.length < 7}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold py-4 px-6 rounded-lg transition flex items-center justify-center gap-2 text-base"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending Code...
                  </>
                ) : (
                  'Send Verification Code'
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  Verification Code
                </label>
                <div className="text-sm text-gray-600 mb-3">
                  Enter the 6-digit code sent to {phone}
                </div>
                <input
                  type="text"
                  placeholder="000000"
                  maxLength="6"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-4xl tracking-widest font-mono font-bold"
                  required
                  disabled={loading}
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold py-4 px-6 rounded-lg transition flex items-center justify-center gap-2 text-base"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    {code.length === 6 && <Check className="w-4 h-4" />}
                    Verify & Login
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep('phone');
                  setCode('');
                  setError('');
                  setPhone('');
                }}
                className="w-full bg-white hover:bg-gray-50 border border-gray-300 text-gray-900 font-semibold py-4 px-6 rounded-lg transition text-base"
              >
                Use Different Number
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center space-y-2">
          <p className="text-sm text-gray-600">
            🔐 Your connection is encrypted and secure
          </p>
          <p className="text-xs text-gray-500">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;

