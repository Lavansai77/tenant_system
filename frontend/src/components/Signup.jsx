import React, { useState } from 'react';

export default function Signup({ switchToLogin }) {
  const [formData, setFormData] = useState({
    org_id: '', org_name: '', email: '', password: '', confirmPassword: '', termsAccepted: false,
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!/^[a-zA-Z0-9]+$/.test(formData.org_id)) {
      return setError('Organization ID must contain letters and numbers only.');
    }

    try {
      const res = await fetch('http://localhost:5000/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess('Organization registered successfully! You can now log in.');
      setTimeout(switchToLogin, 2000);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow border mt-10">
      <h2 className="text-2xl font-bold mb-6 text-center text-indigo-600">Organization Signup</h2>
      {error && <p className="bg-red-100 text-red-700 p-2 rounded mb-4 text-sm">{error}</p>}
      {success && <p className="bg-green-100 text-green-700 p-2 rounded mb-4 text-sm">{success}</p>}
      
      <form onSubmit={handleSignup} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Organization ID (Alphanumeric)</label>
          <input type="text" name="org_id" value={formData.org_id} onChange={handleChange} required className="w-full border p-2 rounded mt-1" />
        </div>
        <div>
          <label className="block text-sm font-medium">Organization Name</label>
          <input type="text" name="org_name" value={formData.org_name} onChange={handleChange} required className="w-full border p-2 rounded mt-1" />
        </div>
        <div>
          <label className="block text-sm font-medium">Admin Email</label>
          <input type="email" name="email" value={formData.email} onChange={handleChange} required className="w-full border p-2 rounded mt-1" />
        </div>
        <div>
          <label className="block text-sm font-medium">Password</label>
          <input type="password" name="password" value={formData.password} onChange={handleChange} required className="w-full border p-2 rounded mt-1" />
        </div>
        <div>
          <label className="block text-sm font-medium">Confirm Password</label>
          <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required className="w-full border p-2 rounded mt-1" />
        </div>
        <div className="flex items-center space-x-2">
          <input type="checkbox" name="termsAccepted" checked={formData.termsAccepted} onChange={handleChange} id="terms" required />
          <label htmlFor="terms" className="text-sm">I agree to the terms and conditions</label>
        </div>
        <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 transition">Register Organization</button>
      </form>
    </div>
  );
}
