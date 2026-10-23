import React, { useState, useEffect } from 'react';

export default function RolesPermissionsManager({ user }) {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [message, setMessage] = useState('');

  const availablePermissions = ['manage_amenities', 'publish_access_code', 'view_bookings', 'manage_staff'];

  useEffect(() => {
    fetchRolesAndPermissions();
  }, [user]);

  const fetchRolesAndPermissions = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/tenant-roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: user.org_id }),
      });
      const data = await res.json();
      if (res.ok) {
        setRoles(data.roles || []);
        setPermissions(data.permissions || []);
      }
    } catch (err) {
      console.error('Failed to load roles', err);
    }
  };

  const togglePermission = asyncRole => async (roleId, permKey, currentStatus) => {
    const newStatus = !currentStatus;
    try {
      const res = await fetch('http://localhost:5000/api/update-permission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: user.org_id, role_id: roleId, permission_key: permKey, allowed: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update');
      fetchRolesAndPermissions();
    } catch (err) {
      setMessage('Error updating permission.');
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow border border-slate-200 mb-6">
      <h3 className="text-lg font-bold text-slate-800 mb-2">Roles & Permissions Panel</h3>
      <p className="text-xs text-slate-500 mb-4">Assign or revoke specific operational permissions for internal staff roles.</p>

      {message && <div className="bg-indigo-50 text-indigo-700 p-2 rounded text-xs mb-3">{message}</div>}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-50 text-slate-700 font-semibold border-b">
            <tr>
              <th className="p-3">Role Name</th>
              <th className="p-3">Description</th>
              {availablePermissions.map(perm => (
                <th key={perm} className="p-3 capitalize">{perm.replace('_', ' ')}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {roles.map(role => (
              <tr key={role.id} className="border-b hover:bg-slate-50">
                <td className="p-3 font-bold text-slate-800">{role.role_name}</td>
                <td className="p-3 text-slate-500">{role.description}</td>
                {availablePermissions.map(permKey => {
                  const permRecord = permissions.find(p => p.role_id === role.id && p.permission_key === permKey);
                  const isAllowed = permRecord ? permRecord.allowed : true;

                  return (
                    <td key={permKey} className="p-3">
                      <input 
                        type="checkbox"
                        checked={isAllowed}
                        onChange={() => togglePermission()(role.id, permKey, isAllowed)}
                        className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}