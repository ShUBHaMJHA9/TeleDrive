import React, { useState } from 'react';
import { useAuth } from '../hooks';
import { Loader2, Check } from 'lucide-react';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

const customStyles = `
  .react-tel-input .country-list {
    border-radius: 16px !important;
    box-shadow: 0 12px 40px -8px rgba(0,0,0,0.1) !important;
    border: 1px solid #f3f4f6 !important;
    margin-top: 8px !important;
    width: 320px !important;
    max-height: 280px !important;
    overflow-x: hidden !important;
  }
  .react-tel-input .country-list::-webkit-scrollbar {
    width: 6px;
  }
  .react-tel-input .country-list::-webkit-scrollbar-thumb {
    background-color: #e5e7eb;
    border-radius: 10px;
  }
  .react-tel-input .country-list .country {
    padding: 12px 16px !important;
    display: flex !important;
    align-items: center !important;
    transition: background-color 0.2s ease !important;
  }
  .react-tel-input .country-list .country:hover {
    background-color: #f9fafb !important;
  }
  .react-tel-input .country-list .country.highlight {
    background-color: #f0f7ff !important;
  }
  .react-tel-input .country-list .search {
    padding: 12px !important;
    background-color: rgba(255, 255, 255, 0.95) !important;
    backdrop-filter: blur(8px) !important;
    border-bottom: 1px solid #f3f4f6 !important;
    position: sticky !important;
    top: 0 !important;
    z-index: 10 !important;
  }
  .react-tel-input .country-list .search-box {
    width: 100% !important;
    padding: 10px 14px !important;
    border-radius: 10px !important;
    border: 1px solid #e5e7eb !important;
    font-size: 14px !important;
    background-color: #f9fafb !important;
    transition: all 0.2s ease !important;
    margin: 0 !important;
  }
  .react-tel-input .country-list .search-box:focus {
    outline: none !important;
    border-color: #3390ec !important;
    background-color: #ffffff !important;
    box-shadow: 0 0 0 3px rgba(51, 144, 236, 0.1) !important;
  }
  .react-tel-input .country-list .country-name {
    font-size: 15px !important;
    color: #374151 !important;
    margin-left: 8px !important;
  }
  .react-tel-input .country-list .dial-code {
    color: #9ca3af !important;
    font-size: 14px !important;
  }
  .react-tel-input .flag {
    transform: scale(1.15) !important;
    border-radius: 2px !important;
  }
`;

const AuthScreen = () => {
  const { requestCode, verifyCode } = useAuth();
  const [step, setStep] = useState('phone'); // 'phone', 'code', 'password'
  const [loginMethod, setLoginMethod] = useState('otp'); // 'otp', 'password'
  const [phone, setPhone] = useState('');
  const [apiId, setApiId] = useState('');
  const [apiHash, setApiHash] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRequestCode = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!apiId || !apiHash) {
      setError('Please provide Telegram API ID and Hash');
      return;
    }

    // Phone from react-phone-input-2 already includes country code, e.g. '+911234567890'
    if (phone.length < 10) {
      setError('Please enter a valid phone number');
      return;
    }

    try {
      setLoading(true);
      await requestCode(phone, apiId, apiHash);
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
      setError(err.response?.data?.message || err.response?.data?.error || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (phone.length < 10) return setError('Please enter a valid phone number');
    
    try {
      setLoading(true);
      const { authAPI } = await import('../api/client');
      const res = await authAPI.loginPassword(phone, password);
      
      if (res.status === 202 && res.data.requireOtp) {
        setStep('code');
        setError(res.data.message);
      } else {
        localStorage.setItem('token', res.data.token);
        window.location.reload();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{customStyles}</style>
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
        <div className="bg-white rounded-[24px] p-8 md:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100/80">
          {step === 'phone' ? (
            <div className="space-y-6">
              {/* Login Method Toggle */}
              <div className="flex p-1 bg-gray-100 rounded-xl mb-6">
                <button
                  onClick={() => { setLoginMethod('otp'); setError(''); }}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${loginMethod === 'otp' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  Telegram OTP
                </button>
                <button
                  onClick={() => { setLoginMethod('password'); setError(''); }}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${loginMethod === 'password' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  Password
                </button>
              </div>

              <form onSubmit={loginMethod === 'password' ? handleLoginPassword : handleRequestCode} className="space-y-6">
                {loginMethod === 'otp' && (
                  <div className="space-y-4 mb-6">
                    <div>
                      <label className="block text-[15px] font-semibold text-gray-900 tracking-tight mb-2">
                        Telegram API Credentials
                      </label>
                      <p className="text-[13px] text-gray-500 mb-3">
                        Get your API ID and Hash from <a href="https://my.telegram.org/auth" target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">my.telegram.org</a>
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          placeholder="API ID"
                          value={apiId}
                          onChange={(e) => setApiId(e.target.value.trim())}
                          className="w-full h-[48px] px-4 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all text-sm shadow-sm"
                          required
                          disabled={loading}
                        />
                        <input
                          type="text"
                          placeholder="API Hash"
                          value={apiHash}
                          onChange={(e) => setApiHash(e.target.value.trim())}
                          className="w-full h-[48px] px-4 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all text-sm shadow-sm"
                          required
                          disabled={loading}
                        />
                      </div>
                    </div>
                  </div>
                )}

              <div className="space-y-2">
                <label className="block text-[15px] font-semibold text-gray-900 tracking-tight">
                  Phone Number
                </label>

                {/* Phone Input with Country Selector */}
                <div className="relative group">
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
                    containerClass="!w-full"
                    inputClass="!w-full !h-[56px] !text-[17px] !pl-[72px] !pr-4 !bg-white hover:!border-gray-400 focus:!bg-white !border !border-gray-300 focus:!border-blue-600 !rounded-xl !transition-all !duration-200 !shadow-[0_2px_4px_rgba(0,0,0,0.02)] focus:!shadow-[0_4px_12px_rgba(37,99,235,0.1)] !font-medium !text-gray-900 outline-none focus:!ring-4 focus:!ring-blue-600/10 placeholder:!text-gray-400 placeholder:!font-normal"
                    buttonClass="!absolute !left-0 !top-0 !bottom-0 !w-[60px] !bg-transparent hover:!bg-gray-50 !border-0 !border-r !border-gray-300 !rounded-l-xl !transition-colors flex items-center justify-center"
                    dropdownClass="!w-[320px] !rounded-2xl !shadow-2xl !border-gray-100 !mt-2 overflow-hidden"
                    searchClass="!w-full !p-3 !border-b !border-gray-100 !bg-gray-50 !text-sm"
                  />
                </div>

                {loginMethod === 'password' && (
                  <div className="pt-4">
                    <label className="block text-[15px] font-semibold text-gray-900 tracking-tight mb-2">
                      Password
                    </label>
                    <input
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-[56px] px-4 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all text-sm shadow-[0_2px_4px_rgba(0,0,0,0.02)]"
                      required
                      disabled={loading}
                    />
                  </div>
                )}

                {loginMethod === 'otp' && <p className="text-[14px] text-gray-500 pt-2 pb-2">We'll send a 5-digit verification code via Telegram</p>}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium animate-in fade-in slide-in-from-top-1">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || phone.length < 7 || (loginMethod === 'password' && password.length < 6)}
                className="w-full bg-[#3390ec] hover:bg-[#2c81d6] disabled:bg-[#a6d1fb] disabled:text-white/90 text-white font-semibold py-[18px] px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-[16px] shadow-[0_2px_10px_rgba(51,144,236,0.2)] hover:shadow-[0_4px_14px_rgba(51,144,236,0.3)] disabled:shadow-none active:scale-[0.98] disabled:active:scale-100"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {loginMethod === 'otp' ? 'Sending Code...' : 'Logging In...'}
                  </>
                ) : (
                  loginMethod === 'otp' ? 'Send Verification Code' : 'Login'
                )}
              </button>
            </form>
            </div>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-2">
                <label className="block text-[15px] font-semibold text-gray-900 tracking-tight">
                  Verification Code
                </label>
                <div className="text-[14px] text-gray-500 pb-2">
                  Enter the 5-digit code sent to <span className="font-medium text-gray-900">{phone}</span>
                </div>
                <input
                  type="text"
                  placeholder="00000"
                  maxLength="5"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full h-[64px] px-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 text-center text-4xl tracking-[0.3em] pl-[0.3em] font-mono font-bold transition-all duration-200 bg-white shadow-[0_2px_4px_rgba(0,0,0,0.02)]"
                  required
                  disabled={loading}
                  autoFocus
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium animate-in fade-in slide-in-from-top-1">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || code.length !== 5}
                className="w-full bg-[#3390ec] hover:bg-[#2c81d6] disabled:bg-[#a6d1fb] disabled:text-white/90 text-white font-semibold py-[18px] px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-[16px] shadow-[0_2px_10px_rgba(51,144,236,0.2)] hover:shadow-[0_4px_14px_rgba(51,144,236,0.3)] disabled:shadow-none active:scale-[0.98] disabled:active:scale-100"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    {code.length === 5 && <Check className="w-5 h-5" />}
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
                className="w-full bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 font-semibold py-4 px-6 rounded-xl transition-all text-[15px] hover:text-gray-900"
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
    </>
  );
};

export default AuthScreen;

