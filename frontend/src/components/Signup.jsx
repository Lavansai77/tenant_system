import React, { useState } from 'react';

export default function Signup({ onSignupSuccess, onSwitchToLogin }) {
  const [formData, setFormData] = useState({
    org_id: '',
    org_name: '',
    email: '',
    password: '',
    confirm_password: '',
    subscription_plan: 'Free Trial'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('http://localhost:5000/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Signup failed.');

      alert('Organization registered and physical database created successfully!');
      if (onSignupSuccess) onSignupSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-12 bg-white p-8 rounded-2xl shadow-xl border border-slate-200">
      <div className="text-center mb-6">
        <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
          Tenant Onboarding
        </span>
        <h2 className="text-2xl font-extrabold text-slate-900 mt-2">Register Organization</h2>
        <p className="text-xs text-slate-500 mt-1">Creates a dedicated physical database in Neon.</p>
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
            className="w-full border border-slate-300 p-3 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" 
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Organization Name</label>
          <input 
            type="text" 
            value={formData.org_name} 
            onChange={(e) => setFormData({ ...formData, org_name: e.target.value })} 
            required 
            placeholder="Acme Corp" 
            className="w-full border border-slate-300 p-3 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" 
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Admin Email</label>
          <input 
            type="email" 
            value={formData.email} 
            onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
            required 
            placeholder="admin@acme.com" 
            className="w-full border border-slate-300 p-3 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" 
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
            className="w-full border border-slate-300 p-3 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" 
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm Password</label>
          <input 
            type="password" 
            value={formData.confirm_password} 
            onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })} 
            required 
            placeholder="••••••••" 
            className="w-full border border-slate-300 p-3 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" 
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Subscription Tier</label>
          <select
            value={formData.subscription_plan}
            onChange={(e) => setFormData({ ...formData, subscription_plan: e.target.value })}
            className="w-full border border-slate-300 p-3 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="Free Trial">Free Trial (14 Days)</option>
            <option value="Growth Plan">Growth Plan</option>
            <option value="Enterprise">Enterprise Tier</option>
          </select>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl shadow transition duration-200 text-sm disabled:opacity-50"
        >
          {loading ? 'Creating Physical DB...' : 'Create Workspace'}
        </button>
      </form>

      <div className="mt-4 text-center">
        <button 
          onClick={onSwitchToLogin}
          className="text-xs text-indigo-600 font-semibold hover:underline"
        >
          Already have an account? Log in
        </button>
      </div>
    </div>
  );
}