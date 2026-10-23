import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import EmployeeLogin from './components/EmployeeLogin';
import Signup from './components/Signup';
import AccessCodeManager from './components/AccessCodeManager';
import EmployeeDirectory from './components/EmployeeDirectory';
import ManagerBookings from './components/ManagerBookings';
import RolesPermissionsManager from './components/RolesPermissionsManager';
import PublicWorkspaceCatalog from './components/PublicWorkspaceCatalog';

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('login'); // 'login', 'employee-login', 'signup', 'public', 'dashboard'

  useEffect(() => {
    const savedUser = localStorage.getItem('tenant_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      setView('dashboard');
    }
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    localStorage.setItem('tenant_user', JSON.stringify(userData));
    setView('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('tenant_user');
    setUser(null);
    setView('login');
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 text-white p-2 rounded-xl font-extrabold text-sm tracking-wider">WP</div>
            <h1 className="font-extrabold text-lg text-slate-900">Workplace Hub</h1>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => setView('public')}
              className={`text-xs font-semibold px-4 py-2 rounded-xl border transition ${view === 'public' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              Public Catalog
            </button>

            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-xs bg-slate-100 px-3 py-1.5 rounded-lg text-slate-700 font-medium">
                  {user.is_employee ? (
                    <>Staff: <strong className="text-emerald-600">{user.name}</strong> ({user.role})</>
                  ) : (
                    <>Org: <strong className="text-indigo-600 uppercase">{user.org_id}</strong></>
                  )}
                </span>
                <button 
                  onClick={handleLogout}
                  className="bg-red-50 text-red-600 hover:bg-red-100 text-xs font-semibold px-4 py-2 rounded-xl transition"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button 
                  onClick={() => setView('login')}
                  className={`text-xs font-semibold px-3 py-2 rounded-xl transition ${view === 'login' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  Log In
                </button>
                <button 
                  onClick={() => setView('employee-login')}
                  className={`text-xs font-semibold px-3 py-2 rounded-xl transition ${view === 'employee-login' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  Staff Portal
                </button>
                <button 
                  onClick={() => setView('signup')}
                  className={`text-xs font-semibold px-3 py-2 rounded-xl transition ${view === 'signup' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        {view === 'login' && <Login onLoginSuccess={handleLoginSuccess} />}
        {view === 'employee-login' && <EmployeeLogin onLoginSuccess={handleLoginSuccess} onSwitchToOrgLogin={() => setView('login')} />}
        {view === 'signup' && <Signup onSignupSuccess={() => setView('login')} onSwitchToLogin={() => setView('login')} />}
        {view === 'public' && <PublicWorkspaceCatalog orgId={user?.org_id || 'acme'} />}
        {view === 'dashboard' && user && (
          <div>
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900">
                  {user.is_employee ? `${user.name}'s Workspace Portal` : `${user.org_name} Dashboard`}
                </h2>
                <p className="text-xs text-slate-500">
                  Physical DB: <strong className="text-indigo-600 font-mono">org_{user.org_id}</strong>
                  {user.is_employee && <span className="ml-2 text-emerald-600 font-semibold">• Role: {user.role}</span>}
                </p>
              </div>
              <button 
                onClick={() => setView('public')}
                className="bg-indigo-600 text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow hover:bg-indigo-700 transition"
              >
                Open Booking Portal
              </button>
            </div>

            <AccessCodeManager user={user} />
            <EmployeeDirectory user={user} />
            <ManagerBookings user={user} />
            <RolesPermissionsManager user={user} />
          </div>
        )}
      </main>
    </div>
  );
}