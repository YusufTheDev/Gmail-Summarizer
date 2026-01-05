import React from 'react';
import { Mail, ArrowRight, CheckCircle } from 'lucide-react';
import heroBg from '../assets/hero_bg.png';
import aiProcess from '../assets/ai_process.png';
import logoIcon from '../assets/logo_icon.png';
import logoText from '../assets/logo_text.png';


const LandingPage = () => {
    const handleLogin = () => {
        window.location.href = "http://localhost:5000/login";
    };

    return (
        <div className="min-h-screen flex flex-col relative overflow-hidden">
            {/* Background Texture Overlay is handled globally in index.css (.texture-bg) */}

            {/* Navbar */}
            <nav className="w-full max-w-7xl mx-auto px-6 py-6 flex justify-between items-center z-10">
                <div className="flex items-center gap-3">
                    <img src={logoIcon} alt="Logo" className="w-10 h-10 object-contain" />
                    <img src={logoText} alt="NebulaFlux" className="h-8 object-contain" />
                </div>
                <button onClick={handleLogin} className="text-sm font-medium text-slate-600 hover:text-soft-purple transition-colors">
                    Sign In
                </button>
            </nav>

            {/* Hero Section */}
            <main className="flex-grow max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-center gap-12 z-10 mt-10 md:mt-0">

                {/* Hero Left: Copy */}
                <div className="flex-1 text-center md:text-left space-y-8">
                    <div className="inline-block px-4 py-1.5 rounded-full bg-light-blue/50 border border-light-blue text-slate-600 text-sm font-medium">
                        Values Your Time
                    </div>
                    <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 leading-[1.1]">
                        Reclaim Your <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-soft-purple to-indigo-500">
                            Inbox
                        </span>
                    </h1>
                    <p className="text-lg md:text-xl text-slate-500 max-w-lg mx-auto md:mx-0 leading-relaxed">
                        Experience the future of email. AI-powered summaries that turn chaos into clarity, saving you hours every week.
                    </p>

                    <div className="pt-4 flex flex-col md:flex-row items-center gap-4">
                        <button
                            onClick={handleLogin}
                            className="group relative px-8 py-4 bg-slate-900 text-white rounded-full font-semibold shadow-xl shadow-soft-purple/20 hover:shadow-soft-purple/40 hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-3 overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <span className="relative flex items-center gap-2">
                                <Mail size={20} />
                                Connect with Google
                                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </span>
                        </button>
                        <p className="text-sm text-slate-400">No credit card required</p>
                    </div>
                </div>

                {/* Hero Right: Image */}
                <div className="flex-1 relative w-full max-w-lg aspect-square">
                    <div className="absolute inset-0 bg-gradient-to-tr from-light-blue to-purple-100 rounded-full blur-3xl opacity-30 animate-pulse" />
                    <img
                        src={heroBg}
                        alt="Abstract Hourglass"
                        className="relative z-10 w-full h-full object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-700 ease-out"
                    />
                </div>
            </main>

            {/* Features Section */}
            <section className="w-full bg-white/40 backdrop-blur-md border-t border-white/50 mt-20 py-20 z-10">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-slate-900 mb-4">How It Works</h2>
                        <p className="text-slate-500">Simple, secure, and incredibly fast.</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div className="order-2 md:order-1 relative group">
                            <div className="absolute -inset-4 bg-gradient-to-r from-light-blue to-soft-purple opacity-20 blur-xl rounded-full group-hover:opacity-30 transition-opacity" />
                            <img
                                src={aiProcess}
                                alt="AI Processing"
                                className="relative rounded-2xl shadow-lg border border-white/50 w-full max-w-md mx-auto transform group-hover:rotate-1 transition-transform duration-500"
                            />
                        </div>

                        <div className="order-1 md:order-2 space-y-8">
                            {[
                                { title: "Connect Securely", desc: "We use official Google APIs. Your data never leaves the secure processing pipeline." },
                                { title: "AI Analysis", desc: "Our advanced models read and condense your unread emails into actionable insights." },
                                { title: "Save Time", desc: "Get a daily digest and clear your inbox in minutes, not hours." }
                            ].map((feature, idx) => (
                                <div key={idx} className="flex gap-4 items-start p-4 rounded-xl hover:bg-white/50 transition-colors">
                                    <div className="mt-1 text-soft-purple">
                                        <CheckCircle size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-semibold text-slate-800">{feature.title}</h3>
                                        <p className="text-slate-500 mt-2 leading-relaxed">{feature.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <footer className="py-8 text-center text-slate-400 text-sm z-10">
                © 2026 NebulaFlux.
            </footer>
        </div>
    );
};

export default LandingPage;
