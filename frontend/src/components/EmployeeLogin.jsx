import React, { useState } from 'react';

export default function EmployeeLogin({ onLoginSuccess, onSwitchToOrgLogin }) {
  const [formData, setFormData] = useState({ org_id: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('http://localhost:5000/api/employee-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Employee login failed.');

      onLoginSuccess(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-12 bg-white p-8 rounded-2xl shadow-xl border border-slate-200">
      <div className="text-center mb-6">
        <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
          Staff Portal
        </span>
        <h2 className="text-2xl font-extrabold text-slate-900 mt-2">Employee Sign In</h2>
        <p className="text-xs text-slate-500 mt-1">Access workspace management based on your assigned role.</p>
      </div>

      {error && <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-3 rounded-lg text-xs mb-4">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Organization ID</label>
          <input 
            type="text" 
            value={formData.org_id} 
            onChange={(e) => setFormData({ ...formData, org_id: e.target.value })} 
            required 
            placeholder="e.g. acme" 
            className="w-full border border-slate-300 p-3 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" 
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Staff Email</label>
          <input 
            type="email" 
            value={formData.email} 
            onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
            required 
            placeholder="employee@acme.com" 
            className="w-full border border-slate-300 p-3 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" 
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
          <input 
            type="password" 
            value={formData.password} 
            onChange={(e) => setFormData({ ...formData, password: e.target.value })} 
            required 
            placeholder="••••••••" 
            className="w-full border border-slate-300 p-3 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" 
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl shadow transition duration-200 text-sm disabled:opacity-50"
        >
          {loading ? 'Authenticating...' : 'Sign In as Employee'}
        </button>
      </form>

      <div className="mt-4 text-center">
        <button 
          onClick={onSwitchToOrgLogin}
          className="text-xs text-emerald-600 font-semibold hover:underline"
        >
          Organization Owner? Log in here
        </button>
      </div>
    </div>
  );
}