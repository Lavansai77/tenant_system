import React, { useState, useEffect } from 'react';

export default function Dashboard({ user, onUserUpdate }) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'access-code', 'employees', 'settings'
  const [accessCode, setAccessCode] = useState(null);
  const [loadingCode, setLoadingCode] = useState(false);
  
  // Employees state
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [employeeForm, setEmployeeForm] = useState({ name: '', email: '', role: 'Operations Manager', phone: '' });
  const [addingEmployee, setAddingEmployee] = useState(false);

  // Settings / Update form state
  const [updateForm, setUpdateForm] = useState({
    org_name: user?.org_name || '',
    email: user?.email || ''
  });
  const [updating, setUpdating] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch stored permanent access code on mount
  useEffect(() => {
    const fetchExistingCode = async () => {
      if (!user?.org_id) return;
      try {
        const res = await fetch('http://localhost:5000/api/get-access-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ org_id: user.org_id }),
        });
        const data = await res.json();
        if (res.ok && data.active_access_code) {
          setAccessCode(data.active_access_code);
        }
      } catch (err) {
        console.error('Failed to load active access code', err);
      }
    };
    fetchExistingCode();
  }, [user]);

  // Fetch employees when tab is selected
  useEffect(() => {
    if (activeTab === 'employees' && user?.org_id) {
      fetchEmployees();
    }
  }, [activeTab, user]);

  const fetchEmployees = async () => {
    setLoadingEmployees(true);
    try {
      const res = await fetch('http://localhost:5000/api/tenant-employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: user.org_id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEmployees(data.employees || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setAddingEmployee(true);

    try {
      const res = await fetch('http://localhost:5000/api/add-employee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: user.org_id,
          ...employeeForm
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccess('🎉 Employee added and stored in your organization database!');
      setEmployeeForm({ name: '', email: '', role: 'Operations Manager', phone: '' });
      fetchEmployees();
    } catch (err) {
      setError(err.message);
    } finally {
      setAddingEmployee(false);
    }
  };

  const generateAccessCode = async () => {
    if (!user?.org_id) {
      setError('Organization session missing. Please log in again.');
      return;
    }

    setLoadingCode(true);
    setError('');
    setSuccess('');
    try {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      const res = await fetch('http://localhost:5000/api/publish-access-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          org_id: user.org_id, 
          access_code: code 
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setAccessCode(code);
      setSuccess('🎉 Access code generated and permanently stored in the database!');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingCode(false);
    }
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setUpdating(true);

    try {
      const res = await fetch('http://localhost:5000/api/update-organization', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: user.org_id,
          org_name: updateForm.org_name,
          email: updateForm.email
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (onUserUpdate) {
        onUserUpdate({
          ...user,
          org_name: data.user.org_name,
          email: data.user.email
        });
      }

      setSuccess('✅ Organization details updated successfully!');
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-8">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <span className="bg-indigo-50 text-indigo-700 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider">Tenant Workspace</span>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-1">{user?.org_name} Dashboard</h1>
          <p className="text-slate-500 text-sm">{user?.email} • <span className="font-semibold text-indigo-600">{user?.subscription_plan}</span></p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl flex-wrap gap-1">
          <button 
            onClick={() => setActiveTab('overview')} 
            className={`px-3 py-2 rounded-lg text-sm font-semibold transition ${activeTab === 'overview' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Overview
          </button>
          <button 
            onClick={() => setActiveTab('access-code')} 
            className={`px-3 py-2 rounded-lg text-sm font-semibold transition ${activeTab === 'access-code' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Access Code
          </button>
          <button 
            onClick={() => setActiveTab('employees')} 
            className={`px-3 py-2 rounded-lg text-sm font-semibold transition ${activeTab === 'employees' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Staff & Roles
          </button>
          <button 
            onClick={() => setActiveTab('settings')} 
            className={`px-3 py-2 rounded-lg text-sm font-semibold transition ${activeTab === 'settings' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Settings
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-md mb-6 text-sm shadow-sm">{error}</div>}
      {success && <div className="bg-emerald-50 border-l-4 border-emerald-500 text-emerald-700 p-4 rounded-md mb-6 text-sm shadow-sm font-medium">{success}</div>}

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-slate-500 text-sm font-semibold uppercase tracking-wider">Organization ID</h3>
            <p className="text-2xl font-mono font-bold text-slate-800 mt-2">{user?.org_id}</p>
            <p className="text-xs text-slate-400 mt-1">Tenant schema: org_{user?.org_id}</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-slate-500 text-sm font-semibold uppercase tracking-wider">Active Access Code</h3>
            <p className="text-2xl font-mono font-bold text-indigo-600 mt-2">{accessCode || 'Not Set'}</p>
            <p className="text-xs text-slate-400 mt-1">Required for slot reservations</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-slate-500 text-sm font-semibold uppercase tracking-wider">Active Plan</h3>
            <p className="text-xl font-bold text-emerald-600 mt-2">{user?.subscription_plan}</p>
            <p className="text-xs text-slate-400 mt-1">Full isolation enabled</p>
          </div>
        </div>
      )}

      {/* Access Code Management Tab */}
      {activeTab === 'access-code' && (
        <div className="max-w-xl mx-auto bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center">
          <span className="text-3xl">🔑</span>
          <h2 className="text-2xl font-bold text-slate-900 mt-3">Permanent Access Code</h2>
          <p className="text-slate-500 text-sm mt-1">Permanently stored in your master organization record.</p>
          
          <div className="my-8 py-6 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Stored Passcode</span>
            <span className="text-5xl font-mono font-extrabold tracking-widest text-indigo-600">
              {accessCode || '------'}
            </span>
          </div>

          <button 
            onClick={generateAccessCode}
            disabled={loadingCode}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3.5 rounded-xl shadow transition"
          >
            {loadingCode ? 'Updating Code...' : accessCode ? 'Regenerate New Passcode' : 'Generate Permanent Passcode'}
          </button>
        </div>
      )}

      {/* Staff & Roles Tab */}
      {activeTab === 'employees' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-fit">
            <h3 className="font-bold text-lg text-slate-900 mb-1">Add Staff Member</h3>
            <p className="text-xs text-slate-500 mb-4">Saved directly to <span className="font-mono text-indigo-600">org_{user?.org_id}.employees</span></p>
            
            <form onSubmit={handleAddEmployee} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input 
                  type="text" 
                  value={employeeForm.name} 
                  onChange={(e) => setEmployeeForm({...employeeForm, name: e.target.value})} 
                  required 
                  placeholder="e.g., Alex Johnson"
                  className="w-full border border-slate-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" 
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <input 
                  type="email" 
                  value={employeeForm.email} 
                  onChange={(e) => setEmployeeForm({...employeeForm, email: e.target.value})} 
                  required 
                  placeholder="alex@company.com"
                  className="w-full border border-slate-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" 
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Role / Designation</label>
                <select 
                  value={employeeForm.role} 
                  onChange={(e) => setEmployeeForm({...employeeForm, role: e.target.value})}
                  className="w-full border border-slate-300 p-2.5 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="Operations Manager">Operations Manager</option>
                  <option value="Receptionist">Receptionist</option>
                  <option value="Facility Admin">Facility Admin</option>
                  <option value="Workspace Coordinator">Workspace Coordinator</option>
                  <option value="Security Lead">Security Lead</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                <input 
                  type="text" 
                  value={employeeForm.phone} 
                  onChange={(e) => setEmployeeForm({...employeeForm, phone: e.target.value})} 
                  placeholder="+1 (555) 000-0000"
                  className="w-full border border-slate-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" 
                />
              </div>

              <button 
                type="submit" 
                disabled={addingEmployee}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl text-sm shadow transition"
              >
                {addingEmployee ? 'Saving...' : 'Add Staff Member'}
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-bold text-lg text-slate-900">Organization Staff Directory</h3>
                <p className="text-xs text-slate-500">Total staff registered: {employees.length}</p>
              </div>
            </div>

            {loadingEmployees ? (
              <p className="text-slate-400 text-sm py-8 text-center">Loading staff records...</p>
            ) : employees.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <p className="text-slate-500 text-sm">No employees registered in this organization schema yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <th className="p-3">Name</th>
                      <th className="p-3">Role</th>
                      <th className="p-3">Email</th>
                      <th className="p-3">Phone</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                    {employees.map((emp) => (
                      <tr key={emp.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-semibold text-slate-900">{emp.name}</td>
                        <td className="p-3">
                          <span className="bg-indigo-50 text-indigo-700 font-semibold text-xs px-2.5 py-1 rounded-full">
                            {emp.role}
                          </span>
                        </td>
                        <td className="p-3 text-slate-500">{emp.email}</td>
                        <td className="p-3 text-slate-500 font-mono text-xs">{emp.phone || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="max-w-xl mx-auto bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-center mb-6">
            <span className="text-3xl">⚙️</span>
            <h2 className="text-2xl font-bold text-slate-900 mt-2">Organization Settings</h2>
            <p className="text-slate-500 text-sm mt-1">Update company details or contact information.</p>
          </div>

          <form onSubmit={handleUpdateSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Organization ID (Fixed)</label>
              <input 
                type="text" 
                disabled 
                value={user?.org_id || ''} 
                className="w-full bg-slate-100 border border-slate-200 p-3 rounded-lg text-slate-500 font-mono cursor-not-allowed" 
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Organization Name</label>
              <input 
                type="text" 
                value={updateForm.org_name} 
                onChange={(e) => setUpdateForm({...updateForm, org_name: e.target.value})} 
                required 
                className="w-full border border-slate-300 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" 
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Contact Email Address</label>
              <input 
                type="email" 
                value={updateForm.email} 
                onChange={(e) => setUpdateForm({...updateForm, email: e.target.value})} 
                required 
                className="w-full border border-slate-300 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" 
              />
            </div>

            <button 
              type="submit" 
              disabled={updating}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3.5 rounded-xl shadow transition duration-200 mt-2 disabled:opacity-50"
            >
              {updating ? 'Saving Changes...' : 'Save Updated Details'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}