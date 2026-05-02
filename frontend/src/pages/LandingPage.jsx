import React, { useState } from 'react';
import { ArrowRight, Check, Cloud, Upload, Share2, Zap, Shield, Globe } from 'lucide-react';

const LandingPage = () => {
  const [email, setEmail] = useState('');

  return (
    <div className="bg-gradient-to-b from-slate-950 via-blue-900 to-slate-950 min-h-screen text-white overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 backdrop-blur-lg border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="TeleDrive" className="w-8 h-8" />
            <span className="text-xl font-bold gradient-text">TeleDrive</span>
          </div>
          <div className="hidden md:flex gap-8 items-center">
            <a href="#features" className="hover:text-blue-400 transition">Features</a>
            <a href="#pricing" className="hover:text-blue-400 transition">Pricing</a>
            <a href="#" className="hover:text-blue-400 transition">Security</a>
            <button className="btn btn-primary text-sm">Get Started</button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-float"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-float" style={{ animationDelay: '2s' }}></div>

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-block mb-6 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full">
            <span className="text-sm font-semibold gradient-text">🚀 Introducing TeleDrive</span>
          </div>

          <h1 className="text-6xl md:text-7xl font-bold mb-6 tracking-tight leading-tight">
            Unlimited Cloud Storage,<br />
            <span className="gradient-text">Powered by Telegram</span>
          </h1>

          <p className="text-xl text-gray-400 mb-12 max-w-3xl mx-auto leading-relaxed">
            Store, share, and access your files anywhere. Backed by Telegram's infrastructure, with end-to-end encryption. Your data, your control.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <button className="btn btn-primary px-8 py-4 flex items-center justify-center gap-2 text-lg">
              Get Started Free <ArrowRight className="w-5 h-5" />
            </button>
            <button className="btn btn-secondary px-8 py-4 flex items-center justify-center gap-2 text-lg">
              Watch Demo
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 pt-8 border-t border-white/10">
            {[
              { number: '100GB', label: 'Free Storage' },
              { number: '256-bit', label: 'Encryption' },
              { number: '99.9%', label: 'Uptime' },
            ].map((stat, i) => (
              <div key={i}>
                <p className="text-3xl font-bold mb-2">{stat.number}</p>
                <p className="text-gray-400 text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 bg-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold mb-4">Everything you need</h2>
            <p className="text-gray-400 text-lg">Powerful features for modern cloud storage</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Upload,
                title: 'Drag & Drop Upload',
                desc: 'Upload files instantly. Supports files up to 5GB.'
              },
              {
                icon: Share2,
                title: 'Secure Sharing',
                desc: 'Share files with expiring links and password protection.'
              },
              {
                icon: Cloud,
                title: '100GB Free Storage',
                desc: 'Get 100GB free storage to start. Scale as you grow.'
              },
              {
                icon: Zap,
                title: 'Lightning Fast',
                desc: 'Upload and download speeds optimized for speed.'
              },
              {
                icon: Shield,
                title: 'End-to-End Encrypted',
                desc: 'Military-grade encryption. Only you can access your files.'
              },
              {
                icon: Globe,
                title: 'Access Anywhere',
                desc: 'Web, mobile, desktop. Your files follow you.'
              },
            ].map((feature, i) => (
              <div key={i} className="glass-card p-8 group hover:scale-105 transition-transform duration-300">
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-500/30 transition">
                  <feature.icon className="w-6 h-6 text-blue-400" strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-gray-400">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-5xl font-bold text-center mb-16">How it works</h2>

          <div className="space-y-8">
            {[
              {
                step: '1',
                title: 'Sign up with Telegram',
                desc: 'Use your Telegram account to instantly create a TeleDrive account. Fast and secure.'
              },
              {
                step: '2',
                title: 'Upload your files',
                desc: 'Drag and drop files or click to upload. Automatic backups available for important files.'
              },
              {
                step: '3',
                title: 'Share and collaborate',
                desc: 'Generate shareable links or invite others. Control access with expiring links.'
              },
            ].map((item, i) => (
              <div key={i} className="flex gap-8 items-start">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center font-bold flex-shrink-0 glow">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-2">{item.title}</h3>
                  <p className="text-gray-400 text-lg">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-6 bg-white/5">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-5xl font-bold text-center mb-6">Simple, transparent pricing</h2>
          <p className="text-gray-400 text-center text-lg mb-16">Choose the plan that's right for you</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: 'Free',
                price: '$0',
                storage: '100GB',
                features: ['100GB Storage', 'Basic Support', 'File Sharing'],
              },
              {
                name: 'Pro',
                price: '$9.99',
                storage: '2TB',
                features: ['2TB Storage', 'Priority Support', 'Advanced Sharing', 'Team Folders'],
                popular: true,
              },
              {
                name: 'Business',
                price: '$19.99',
                storage: 'Unlimited',
                features: ['Unlimited Storage', '24/7 Support', 'API Access', 'Admin Console'],
              },
            ].map((plan, i) => (
              <div key={i} className={`glass-card p-8 relative ${plan.popular ? 'ring-2 ring-blue-500 scale-105' : ''}`}>
                {plan.popular && <div className="absolute -top-4 left-1/2 -translate-x-1/2 badge">Most Popular</div>}
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-gray-400">/month</span>
                </div>
                <p className="text-gray-400 mb-6">{plan.storage}</p>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, fi) => (
                    <li key={fi} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-400" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <button className={`w-full btn ${plan.popular ? 'btn-primary' : 'btn-secondary'}`}>
                  Get Started
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl font-bold mb-6">Ready to get started?</h2>
          <p className="text-gray-400 text-lg mb-8">Join thousands of users storing files on TeleDrive</p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
            />
            <button className="btn btn-primary flex items-center justify-center gap-2">
              Sign Up <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <p className="text-gray-500 text-sm mt-4">No credit card required</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-6 text-center text-gray-400">
        <p>&copy; 2024 TeleDrive. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
