import React, { useState } from 'react';
import Signup from './components/Signup';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import BookingPortal from './components/BookingPortal';
import BookingHistory from './components/BookingHistory';

export default function App() {
  const [currentView, setCurrentView] = useState('home'); // 'home', 'login', 'signup', 'dashboard', 'booking', 'history'
  
  // Persist user session across browser refreshes
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('workspace_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    localStorage.setItem('workspace_user', JSON.stringify(userData));
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('workspace_user');
    setCurrentView('home');
  };

  const handleUserUpdate = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('workspace_user', JSON.stringify(updatedUser));
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col justify-between">
      
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div 
            onClick={() => setCurrentView('home')} 
            className="font-extrabold text-xl text-indigo-600 cursor-pointer flex items-center space-x-2"
          >
            <span className="bg-indigo-600 text-white w-8 h-8 rounded-lg flex items-center justify-center text-sm shadow">🏢</span>
            <span>WorkSpace OS</span>
          </div>

          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setCurrentView('home')} 
              className={`text-sm font-semibold px-3 py-2 rounded-lg transition ${currentView === 'home' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-600 hover:text-indigo-600'}`}
            >
              Home
            </button>

            {user ? (
              <>
                <button 
                  onClick={() => setCurrentView('dashboard')} 
                  className={`text-sm font-semibold px-3 py-2 rounded-lg transition ${currentView === 'dashboard' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-600 hover:text-indigo-600'}`}
                >
                  Dashboard
                </button>
                <button 
                  onClick={() => setCurrentView('booking')} 
                  className={`text-sm font-semibold px-3 py-2 rounded-lg transition ${currentView === 'booking' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-600 hover:text-indigo-600'}`}
                >
                  Spaces Catalog
                </button>
                <button 
                  onClick={() => setCurrentView('history')} 
                  className={`text-sm font-semibold px-3 py-2 rounded-lg transition ${currentView === 'history' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-600 hover:text-indigo-600'}`}
                >
                  Booking History
                </button>
                <div className="h-5 w-px bg-slate-200 mx-1"></div>
                <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full">
                  {user.org_name}
                </span>
                <button 
                  onClick={handleLogout} 
                  className="bg-red-50 text-red-600 hover:bg-red-100 px-3.5 py-2 rounded-lg text-sm font-semibold transition"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={() => setCurrentView('login')} 
                  className={`text-sm font-semibold px-4 py-2 rounded-lg transition ${currentView === 'login' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:text-indigo-600'}`}
                >
                  Login
                </button>
                <button 
                  onClick={() => setCurrentView('signup')} 
                  className="bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow hover:bg-indigo-700 transition"
                >
                  Get Started
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-grow">
        {currentView === 'home' && (
          <div className="max-w-5xl mx-auto px-6 py-20 text-center">
            <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-3.5 py-1.5 rounded-full uppercase tracking-wider">
              Multi-Tenant Workplace Management
            </span>
            <h1 className="text-5xl font-extrabold text-slate-900 mt-6 tracking-tight leading-tight">
              Manage Workspaces & Dynamic Spaces with Enterprise Isolation
            </h1>
            <p className="text-lg text-slate-600 mt-4 max-w-2xl mx-auto">
              Secure multi-tenant architecture with automated PostgreSQL schema provisioning, role-based dashboards, and access-code verified bookings.
            </p>
            <div className="mt-8 flex justify-center space-x-4">
              <button 
                onClick={() => setCurrentView('signup')} 
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 py-3.5 rounded-xl shadow-lg transition"
              >
                Register Organization
              </button>
              <button 
                onClick={() => setCurrentView('login')} 
                className="bg-white hover:bg-slate-100 text-slate-700 font-bold px-8 py-3.5 rounded-xl border border-slate-300 shadow-sm transition"
              >
                Organization Login
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 text-left">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="text-2xl mb-3">🏢</div>
                <h3 className="font-bold text-slate-900 text-lg">Dynamic Schema Tenant Isolation</h3>
                <p className="text-sm text-slate-500 mt-1">Every organization gets an isolated database schema provisioned instantly upon signup.</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="text-2xl mb-3">🔑</div>
                <h3 className="font-bold text-slate-900 text-lg">6-Digit Secure Access Codes</h3>
                <p className="text-sm text-slate-500 mt-1">Operations managers can publish permanent access codes required for slot bookings.</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="text-2xl mb-3">🗂️</div>
                <h3 className="font-bold text-slate-900 text-lg">Staff Directory & Roles</h3>
                <p className="text-sm text-slate-500 mt-1">Manage operations managers, receptionists, and staff per tenant database.</p>
              </div>
            </div>
          </div>
        )}

        {currentView === 'signup' && <Signup onSignupSuccess={() => setCurrentView('login')} />}
        
        {currentView === 'login' && <Login onLoginSuccess={handleLoginSuccess} />}
        
        {currentView === 'dashboard' && (
          user ? <Dashboard user={user} onUserUpdate={handleUserUpdate} /> : (
            <div className="text-center py-20">
              <p className="text-red-500 font-semibold">Please log in to view your dashboard.</p>
              <button onClick={() => setCurrentView('login')} className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold">Go to Login</button>
            </div>
          )
        )}

        {currentView === 'booking' && (
          user ? <BookingPortal user={user} /> : (
            <div className="max-w-md mx-auto bg-white p-8 rounded-2xl shadow-xl border border-slate-200 text-center mt-20">
              <div className="text-3xl mb-3">🔒</div>
              <h3 className="text-xl font-bold text-slate-900">Authentication Required</h3>
              <p className="text-slate-500 text-sm mt-2">You must be logged into your organization account to access the workspace catalog.</p>
              <button 
                onClick={() => setCurrentView('login')} 
                className="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl shadow transition"
              >
                Log In Now
              </button>
            </div>
          )
        )}

        {currentView === 'history' && (
          user ? <BookingHistory user={user} /> : (
            <div className="max-w-md mx-auto bg-white p-8 rounded-2xl shadow-xl border border-slate-200 text-center mt-20">
              <div className="text-3xl mb-3">🔒</div>
              <h3 className="text-xl font-bold text-slate-900">Authentication Required</h3>
              <p className="text-slate-500 text-sm mt-2">You must be logged into your organization account to view booking history.</p>
              <button 
                onClick={() => setCurrentView('login')} 
                className="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl shadow transition"
              >
                Log In Now
              </button>
            </div>
          )
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        &copy; 2026 WorkSpace OS Multi-Tenant System. All rights reserved.
      </footer>
    </div>
  );
}