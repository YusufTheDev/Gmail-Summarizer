import React from 'react';
import { Mail } from 'lucide-react';
import '../App.css';

const Login = () => {
    const handleLogin = () => {
        window.location.href = "http://localhost:5000/login";
    };

    return (
        <div className="login-container">
            <div className="glass-card">
                <h1 className="login-title">Gmail Summarizer</h1>
                <p className="login-subtitle">Connect your account to get AI-powered email summaries instantly.</p>

                <button onClick={handleLogin} className="google-btn">
                    <Mail size={20} />
                    Continue with Google
                </button>
            </div>
        </div>
    );
};

export default Login;
