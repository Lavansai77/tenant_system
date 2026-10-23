import React, { useState, useEffect } from 'react';

export default function AccessCodeManager({ user }) {
  const [accessCode, setAccessCode] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAccessCode();
  }, [user]);

  const fetchAccessCode = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/get-access-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: user.org_id }),
      });
      const data = await res.json();
      if (data.active_access_code) {
        setAccessCode(data.active_access_code);
      }
    } catch (err) {
      console.error('Failed to load access code', err);
    }
  };

  const generateCode = () => {
    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    setAccessCode(newCode);
  };

  const handlePublish = async () => {
    if (!accessCode || accessCode.length !== 6) {
      setMessage('Access code must be 6 digits.');
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('http://localhost:5000/api/publish-access-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          org_id: user.org_id, 
          access_code: accessCode, 
          actor_email: user.email 
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to publish access code.');

      setMessage('Active access code published successfully!');
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow border border-slate-200 mb-6">
      <h3 className="text-lg font-bold text-slate-800 mb-2">Organization Access Code Management</h3>
      <p className="text-xs text-slate-500 mb-4">
        This 6-digit access code is required by employees and visitors to confirm booking slots.
      </p>

      {message && (
        <div className={`p-3 rounded-lg text-xs mb-4 ${message.startsWith('Error') || message.includes('denied') ? 'bg-red-50 text-red-700' : 'bg-indigo-50 text-indigo-700'}`}>
          {message}
        </div>
      )}

      <div className="flex items-center gap-4">
        <input 
          type="text" 
          value={accessCode} 
          maxLength={6}
          onChange={(e) => setAccessCode(e.target.value)}
          placeholder="6-Digit Code" 
          className="border border-slate-300 p-3 rounded-xl text-lg font-mono font-bold tracking-widest text-center w-48 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        />

        <button 
          onClick={generateCode}
          className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold px-4 py-3 rounded-xl transition"
        >
          Generate New Code
        </button>

        <button 
          onClick={handlePublish}
          disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-6 py-3 rounded-xl shadow transition disabled:opacity-50"
        >
          {loading ? 'Publishing...' : 'Publish Access Code'}
        </button>
      </div>
    </div>
  );
}