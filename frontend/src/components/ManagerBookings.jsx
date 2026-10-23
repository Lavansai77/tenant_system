import React, { useState, useEffect } from 'react';

export default function ManagerBookings({ user }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchBookings();
  }, [user]);

  const fetchBookings = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('http://localhost:5000/api/tenant-bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          org_id: user.org_id, 
          actor_email: user.email 
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch bookings.');
      setBookings(data.bookings || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow border border-slate-200 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-slate-800">Incoming Booking History</h3>
        <button 
          onClick={fetchBookings}
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition"
        >
          Refresh
        </button>
      </div>

      {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-xs mb-4">{error}</div>}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-50 text-slate-700 font-semibold border-b">
            <tr>
              <th className="p-3">Booking ID</th>
              <th className="p-3">User Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Amenity / Location</th>
              <th className="p-3">Slot Time</th>
              <th className="p-3">Access Code Used</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" className="p-4 text-center text-slate-400">Loading bookings...</td></tr>
            ) : bookings.length === 0 ? (
              <tr><td colSpan="7" className="p-4 text-center text-slate-400">No slot bookings recorded yet.</td></tr>
            ) : (
              bookings.map((b) => (
                <tr key={b.id} className="border-b hover:bg-slate-50">
                  <td className="p-3 font-mono">#{b.id}</td>
                  <td className="p-3 font-semibold text-slate-800">{b.user_name}</td>
                  <td className="p-3">{b.user_email}</td>
                  <td className="p-3 font-medium text-indigo-600">{b.amenity_name || 'Workspace'} ({b.location})</td>
                  <td className="p-3">{new Date(b.slot_time).toLocaleString()}</td>
                  <td className="p-3 font-mono font-bold">{b.access_code}</td>
                  <td className="p-3">
                    <span className="bg-green-50 text-green-700 font-semibold px-2 py-1 rounded-md text-[10px]">
                      {b.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}