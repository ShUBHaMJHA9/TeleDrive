import React from 'react';

const ProfessionalLoader = ({ progress, dark = false }) => (
  <div className="flex flex-col items-center justify-center animate-in fade-in zoom-in duration-700">
    <div className="relative w-32 h-32 mb-10">
      <div className={`absolute inset-0 border-2 ${dark ? 'border-blue-500/10' : 'border-blue-500/10'} rounded-full`}></div>
      <div className="absolute inset-0 border-t-4 border-blue-500 rounded-full animate-orbit"></div>
      <div className={`absolute inset-4 border-2 ${dark ? 'border-blue-400/10' : 'border-blue-400/10'} rounded-full`}></div>
      <div className="absolute inset-4 border-b-4 border-blue-400 rounded-full animate-orbit [animation-direction:reverse] [animation-duration:3s]"></div>
      
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative">
          <div className="absolute inset-0 bg-blue-500/40 blur-2xl rounded-full animate-pulse"></div>
          <img src="/logo.png" className="w-16 h-16 object-contain relative z-10 animate-bounce" alt="TeleDrive" onError={e => e.target.style.display='none'} />
        </div>
      </div>
    </div>
    
    <div className="text-center">
      <h3 className={`text-2xl font-black tracking-[0.3em] uppercase mb-4 ${dark ? 'text-white' : 'text-gray-900'}`}>
        TeleDrive
      </h3>
      <div className="flex flex-col items-center gap-3">
        <div className={`w-56 h-1.5 ${dark ? 'bg-white/10' : 'bg-gray-100'} rounded-full overflow-hidden shadow-inner`}>
          <div 
            className="h-full bg-gradient-to-r from-blue-700 via-blue-500 to-blue-400 transition-all duration-700 shadow-[0_0_15px_rgba(59,130,246,0.6)]"
            style={{ width: `${progress || 10}%` }}
          ></div>
        </div>
        <p className={`text-[10px] font-black tracking-[0.2em] uppercase ${dark ? 'text-blue-400' : 'text-blue-600'}`}>
          {progress > 0 ? `Turbo Protocol: ${progress}%` : 'Synchronizing Data...'}
        </p>
      </div>
    </div>
  </div>
);

export default ProfessionalLoader;
