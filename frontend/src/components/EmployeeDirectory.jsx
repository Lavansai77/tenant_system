import React, { useState, useEffect } from 'react';

export default function EmployeeDirectory({ user }) {
  const [employees, setEmployees] = useState([]);
  const [formData, setFormData] = useState({ name: '', email: '', role: 'Operations Manager', phone: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchEmployees();
  }, [user]);

  const fetchEmployees = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/tenant-employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: user.org_id, actor_email: user.email }),
      });
      const data = await res.json();
      if (res.ok) setEmployees(data.employees || []);
    } catch (err) {
      console.error('Failed to load employees', err);
    }
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('http://localhost:5000/api/add-employee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...formData, 
          org_id: user.org_id, 
          actor_email: user.email 
        }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to add employee.');

      setFormData({ name: '', email: '', role: 'Operations Manager', phone: '' });
      fetchEmployees();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow border border-slate-200 mb-6">
      <h3 className="text-lg font-bold text-slate-800 mb-4">Staff & Employee Directory</h3>

      {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-xs mb-4">{error}</div>}

      <form onSubmit={handleAddEmployee} className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-6">
        <input 
          type="text" 
          placeholder="Name" 
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          className="border border-slate-300 p-2.5 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        />
        <input 
          type="email" 
          placeholder="Email" 
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
          className="border border-slate-300 p-2.5 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        />
        <select
          value={formData.role}
          onChange={(e) => setFormData({ ...formData, role: e.target.value })}
          className="border border-slate-300 p-2.5 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        >
          <option value="Operations Manager">Operations Manager</option>
          <option value="Receptionist">Receptionist</option>
          <option value="Facility Admin">Facility Admin</option>
        </select>
        <input 
          type="text" 
          placeholder="Phone" 
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          className="border border-slate-300 p-2.5 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        />
        <button 
          type="submit" 
          disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold py-2.5 rounded-xl transition disabled:opacity-50"
        >
          {loading ? 'Adding...' : 'Add Employee'}
        </button>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-50 text-slate-700 font-semibold border-b">
            <tr>
              <th className="p-3">ID</th>
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Role</th>
              <th className="p-3">Phone</th>
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-4 text-center text-slate-400">No employees added yet.</td>
              </tr>
            ) : (
              employees.map((emp) => (
                <tr key={emp.id} className="border-b hover:bg-slate-50">
                  <td className="p-3 font-mono">{emp.id}</td>
                  <td className="p-3 font-semibold text-slate-800">{emp.name}</td>
                  <td className="p-3">{emp.email}</td>
                  <td className="p-3">
                    <span className="bg-slate-100 text-slate-800 font-medium px-2 py-1 rounded-md text-[10px]">
                      {emp.role}
                    </span>
                  </td>
                  <td className="p-3">{emp.phone || 'N/A'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}