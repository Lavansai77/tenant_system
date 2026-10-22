import React, { useState, useEffect } from 'react';

export default function BookingHistory({ user }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchBookings = async () => {
      if (!user?.org_id) return;
      try {
        const res = await fetch('http://localhost:5000/api/tenant-bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ org_id: user.org_id }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setBookings(data.bookings || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [user]);

  if (loading) {
    return <div className="text-center py-20 text-slate-500 font-medium">Loading booking history...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="mb-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
        <div>
          <span className="bg-indigo-50 text-indigo-700 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider">Tenant Records</span>
          <h2 className="text-2xl font-extrabold text-slate-900 mt-1">Organization Booking History</h2>
          <p className="text-slate-500 text-sm">All confirmed slot reservations and verified access codes for {user?.org_name}.</p>
        </div>
        <span className="text-xs bg-slate-100 text-slate-600 font-mono px-3 py-1.5 rounded-lg border border-slate-200">
          Total Bookings: {bookings.length}
        </span>
      </div>

      {error && <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-md mb-6 text-sm shadow-sm">{error}</div>}

      {bookings.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-slate-500 text-sm">No slot bookings recorded yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="p-4">Space / Amenity</th>
                <th className="p-4">Booked By</th>
                <th className="p-4">Email</th>
                <th className="p-4">Location</th>
                <th className="p-4">Slot Time</th>
                <th className="p-4">Access Code</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {bookings.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition">
                  <td className="p-4 font-semibold text-slate-900">{item.amenity_name || 'Workspace Space'}</td>
                  <td className="p-4">{item.user_name}</td>
                  <td className="p-4 text-slate-500">{item.user_email}</td>
                  <td className="p-4"><span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-mono">{item.location}</span></td>
                  <td className="p-4 font-mono text-xs">{new Date(item.slot_time).toLocaleString()}</td>
                  <td className="p-4 font-mono font-bold text-indigo-600">{item.access_code}</td>
                  <td className="p-4">
                    <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-full">
                      {item.status || 'Confirmed'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}