import React, { useState } from 'react';

export default function PublicWorkspaceCatalog({ orgId }) {
  const [bookingModal, setBookingModal] = useState(null);
  const [bookingData, setBookingData] = useState({ user_name: '', user_email: '', slot_time: '', access_code: '' });
  const [statusMsg, setStatusMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const defaultAmenities = [
    { id: 1, name: 'Executive Conference Room', description: 'Fully equipped boardroom with 4K display & video conferencing.', location: 'Floor 3, Wing A', rate_per_hour: 45.00 },
    { id: 2, name: 'Private Interview Cabin', description: 'Quiet acoustic cabin ideal for candidate screening.', location: 'Floor 2, Wing B', rate_per_hour: 20.00 },
    { id: 3, name: 'Hot Desk Space', description: 'Ergonomic workstation with high-speed fiber internet.', location: 'Ground Floor Open Bay', rate_per_hour: 15.00 }
  ];

  const handleBookSubmit = async (e) => {
    e.preventDefault();
    setStatusMsg('');
    setLoading(true);

    try {
      const res = await fetch('http://localhost:5000/api/book-slot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...bookingData,
          amenity_id: bookingModal.id,
          org_id: orgId || 'acme'
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setStatusMsg('Slot booked successfully!');
      setTimeout(() => {
        setBookingModal(null);
        setStatusMsg('');
        setBookingData({ user_name: '', user_email: '', slot_time: '', access_code: '' });
      }, 1500);
    } catch (err) {
      setStatusMsg(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-extrabold text-slate-900">Workspace & Amenity Catalog</h2>
        <p className="text-sm text-slate-500 mt-1">Select an amenity and book a slot using your 6-digit access code.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {defaultAmenities.map((item) => (
          <div key={item.id} className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full uppercase">
                {item.location}
              </span>
              <h3 className="text-lg font-bold text-slate-800 mt-3">{item.name}</h3>
              <p className="text-xs text-slate-500 mt-2">{item.description}</p>
            </div>
            <div className="mt-6 pt-4 border-t flex items-center justify-between">
              <span className="text-lg font-extrabold text-slate-900">${item.rate_per_hour}/hr</span>
              <button 
                onClick={() => setBookingModal(item)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition"
              >
                Book Slot
              </button>
            </div>
          </div>
        ))}
      </div>

      {bookingModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Book {bookingModal.name}</h3>
            <p className="text-xs text-slate-500 mb-4">Provide details and your organization's 6-digit access code.</p>

            {statusMsg && (
              <div className={`p-3 rounded-lg text-xs mb-4 ${statusMsg.startsWith('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                {statusMsg}
              </div>
            )}

            <form onSubmit={handleBookSubmit} className="space-y-3">
              <input 
                type="text" 
                placeholder="Your Full Name" 
                value={bookingData.user_name}
                onChange={(e) => setBookingData({ ...bookingData, user_name: e.target.value })}
                required
                className="w-full border border-slate-300 p-2.5 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <input 
                type="email" 
                placeholder="Your Email" 
                value={bookingData.user_email}
                onChange={(e) => setBookingData({ ...bookingData, user_email: e.target.value })}
                required
                className="w-full border border-slate-300 p-2.5 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <input 
                type="datetime-local" 
                value={bookingData.slot_time}
                onChange={(e) => setBookingData({ ...bookingData, slot_time: e.target.value })}
                required
                className="w-full border border-slate-300 p-2.5 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <input 
                type="text" 
                maxLength={6}
                placeholder="6-Digit Access Code" 
                value={bookingData.access_code}
                onChange={(e) => setBookingData({ ...bookingData, access_code: e.target.value })}
                required
                className="w-full border border-slate-300 p-2.5 rounded-xl text-xs font-mono tracking-widest text-center focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />

              <div className="flex gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setBookingModal(null)}
                  className="w-1/2 bg-slate-100 text-slate-700 text-xs font-semibold py-2.5 rounded-xl hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-1/2 bg-indigo-600 text-white text-xs font-semibold py-2.5 rounded-xl hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  {loading ? 'Validating...' : 'Confirm Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}