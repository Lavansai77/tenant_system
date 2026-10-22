import React, { useState, useEffect } from 'react';

export default function BookingPortal({ user }) {
  const [amenities, setAmenities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Controls which amenity modal is open when "Book Now" is clicked
  const [activeBookingAmenity, setActiveBookingAmenity] = useState(null);
  
  const [bookingForm, setBookingForm] = useState({
    slot_time: '',
    access_code: ''
  });

  useEffect(() => {
    const fetchAmenities = async () => {
      if (!user?.org_id) return;
      try {
        const res = await fetch('http://localhost:5000/api/tenant-amenities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ org_id: user.org_id }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setAmenities(data.amenities || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAmenities();
  }, [user]);

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const res = await fetch('http://localhost:5000/api/book-slot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: user.org_id,
          user_name: user.org_name + ' (Manager)',
          user_email: user.email,
          amenity_id: activeBookingAmenity.id,
          slot_time: bookingForm.slot_time,
          access_code: bookingForm.access_code
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccess(`🎉 Successfully booked ${activeBookingAmenity.name}! Access code verified.`);
      setBookingForm({ slot_time: '', access_code: '' });
      setActiveBookingAmenity(null);
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-slate-500 font-medium">Loading organization spaces...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto p-8">
      {/* Organization Header */}
      <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <span className="bg-indigo-50 text-indigo-700 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider">Workspace Catalog</span>
          <h2 className="text-2xl font-extrabold text-slate-900 mt-1">{user?.org_name} Spaces & Amenities</h2>
          <p className="text-slate-500 text-sm">Browse available flats, interview cabins, meeting rooms, and amenities below.</p>
        </div>
        <div className="text-right hidden sm:block">
          <span className="text-xs bg-slate-100 text-slate-600 font-mono px-3 py-1.5 rounded-lg border border-slate-200">
            Org ID: {user?.org_id}
          </span>
        </div>
      </div>

      {error && <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-md mb-6 text-sm shadow-sm">{error}</div>}
      {success && <div className="bg-emerald-50 border-l-4 border-emerald-500 text-emerald-700 p-4 rounded-md mb-6 text-sm shadow-sm font-medium">{success}</div>}

      {/* Amenities Grid */}
      {amenities.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-slate-500">No amenities found for this organization.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {amenities.map((item) => (
            <div 
              key={item.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-lg text-slate-800">{item.name}</h4>
                  <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full">${item.rate_per_hour}/hr</span>
                </div>
                <p className="text-sm text-slate-600 mb-4">{item.description}</p>
              </div>
              
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md font-mono">{item.location}</span>
                <button 
                  onClick={() => setActiveBookingAmenity(item)}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700 shadow transition"
                >
                  Book Now
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Booking Form Modal (Triggers ONLY when "Book Now" is clicked) */}
      {activeBookingAmenity && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-8 shadow-2xl border border-slate-100 relative animate-in fade-in zoom-in-95 duration-150">
            <button 
              onClick={() => setActiveBookingAmenity(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-xl font-bold w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"
            >
              &times;
            </button>

            <div className="mb-6">
              <span className="text-xs bg-indigo-50 text-indigo-700 font-semibold px-2.5 py-1 rounded-full">Secure Reservation</span>
              <h3 className="text-2xl font-bold text-slate-900 mt-2">Book: {activeBookingAmenity.name}</h3>
              <p className="text-xs text-slate-500 mt-1">{activeBookingAmenity.location} • ${activeBookingAmenity.rate_per_hour}/hr</p>
            </div>

            <form onSubmit={handleBookingSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Slot Date & Time</label>
                <input 
                  type="datetime-local" 
                  value={bookingForm.slot_time} 
                  onChange={(e) => setBookingForm({...bookingForm, slot_time: e.target.value})} 
                  required 
                  className="w-full border border-slate-300 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" 
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Organization Access Code</label>
                <input 
                  type="text" 
                  maxLength="6" 
                  value={bookingForm.access_code} 
                  onChange={(e) => setBookingForm({...bookingForm, access_code: e.target.value})} 
                  required 
                  placeholder="Enter 6-digit passcode" 
                  className="w-full border border-slate-300 p-3 rounded-lg tracking-widest font-mono text-center font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none" 
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setActiveBookingAmenity(null)} 
                  className="w-1/3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 rounded-xl transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="w-2/3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl shadow-md transition"
                >
                  Confirm Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}