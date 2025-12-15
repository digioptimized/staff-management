import React from 'react';
import './App.css';

const { useState, useEffect, createElement: h } = React;

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function App() {
  const [currentView, setCurrentView] = useState('login');
  const [currentStaff, setCurrentStaff] = useState({ name: '', department: '' });
  const [registeredStaffId, setRegisteredStaffId] = useState(null);
  const [teamItems, setTeamItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [assignedTeam, setAssignedTeam] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [staffData, setStaffData] = useState([]);
  const [teamStats, setTeamStats] = useState([]);
  const [adminPassword, setAdminPassword] = useState('');

  // Load teams from backend on mount
  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      const response = await fetch(`${API_URL}/teams`);
      const data = await response.json();
      setTeamItems(data);
    } catch (err) {
      console.error('Error fetching teams:', err);
    }
  };

  // Load admin data when admin view is active
  useEffect(() => {
    if (currentView === 'admin') {
      fetchStaffData();
      fetchStats();
    }
  }, [currentView]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    if (currentStaff.name.trim() && currentStaff.department) {
      try {
        // Register user in MongoDB on login
        const response = await fetch(`${API_URL}/staff/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: currentStaff.name,
            department: currentStaff.department
          })
        });

        const data = await response.json();
        
        if (data.success) {
          setRegisteredStaffId(data.staff._id);
          setCurrentView('selection');
        } else {
          setError('Failed to register. Please try again.');
        }
      } catch (err) {
        setError('Network error. Please check your connection.');
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    } else {
      setError('Please fill in all fields');
      setLoading(false);
    }
  };

  const showAdminLogin = () => {
    setCurrentView('adminLogin');
    setError('');
  };

  const handleAdminLogin = (e) => {
    e.preventDefault();
    setError('');
    
    if (adminPassword === 'admin123') {
      setIsAdmin(true);
      setCurrentView('admin');
      setAdminPassword('');
    } else {
      setError('Invalid admin password');
      setAdminPassword('');
    }
  };

  const handleTeamSelection = async (clickedItem) => {
    setLoading(true);
    setError('');
    
    try {
      // Update the staff record with team assignment
      const response = await fetch(`${API_URL}/staff`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: currentStaff.name,
          email: currentStaff.email,
          clickedItem: clickedItem.label,
          staffId: registeredStaffId
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // Set assigned team to show on confirmation page
        setAssignedTeam(data.assignedTeam);
        setCurrentView('confirmation');
      } else {
        setError('Failed to assign team. Please try again.');
      }
    } catch (err) {
      setError('Network error. Please check your connection.');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetApp = () => {
    setCurrentStaff({ name: '', email: '' });
    setError('');
    setAssignedTeam(null);
    setRegisteredStaffId(null);
    setCurrentView('login');
    setIsAdmin(false);
  };

  const deleteStaffMember = async (staffId) => {
    if (!window.confirm('Are you sure you want to delete this entry?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/staff/${staffId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        // Refresh staff data and stats
        fetchStaffData();
        fetchStats();
      } else {
        alert('Failed to delete entry');
      }
    } catch (err) {
      alert('Error deleting entry');
      console.error('Error:', err);
    }
  };

  // Admin functions
  const fetchStaffData = async () => {
    try {
      const response = await fetch(`${API_URL}/staff`);
      const data = await response.json();
      // Filter only staff with team assignments
      const assignedStaff = data.filter(staff => staff.teamId > 0);
      setStaffData(assignedStaff);
    } catch (err) {
      console.error('Error fetching staff:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/stats`);
      const data = await response.json();
      setTeamStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const clearAllData = async () => {
    if (window.confirm('Are you sure you want to clear all staff data?')) {
      try {
        await fetch(`${API_URL}/staff`, { method: 'DELETE' });
        fetchStaffData();
        fetchStats();
      } catch (err) {
        alert('Error clearing data');
      }
    }
  };

  const downloadCSV = () => {
    const headers = ['Name', 'Email', 'Clicked Item', 'Assigned Team', 'Team Name', 'Timestamp'];
    const csvContent = [
      headers.join(','),
      ...staffData.map(staff => [
        `"${staff.name}"`,
        `"${staff.email}"`,
        `"${staff.clickedItem}"`,
        staff.teamId,
        `"${staff.teamName}"`,
        `"${new Date(staff.timestamp).toLocaleString()}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `staff_teams_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const downloadExcel = () => {
    const headers = ['Name', 'Email', 'Clicked Item', 'Assigned Team', 'Team Name', 'Timestamp'];
    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
      <head><meta charset="UTF-8"></head>
      <body>
        <table border="1">
          <thead>
            <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${staffData.map(staff => `
              <tr>
                <td>${staff.name}</td>
                <td>${staff.email}</td>
                <td>${staff.clickedItem}</td>
                <td>${staff.teamId}</td>
                <td>${staff.teamName}</td>
                <td>${new Date(staff.timestamp).toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `staff_teams_${new Date().toISOString().split('T')[0]}.xls`;
    link.click();
  };

  // Render Login View
  const renderLogin = () => {
    return h('div', { className: 'view-container' },
      h('div', { className: 'login-card' },
        h('div', { className: 'login-header' },
          h('div', { className: 'logo-circle' },
            h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2' },
              h('path', { d: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2' }),
              h('circle', { cx: '9', cy: '7', r: '4' }),
              h('path', { d: 'M23 21v-2a4 4 0 0 0-3-3.87' }),
              h('path', { d: 'M16 3.13a4 4 0 0 1 0 7.75' })
            )
          ),
          h('h1', { className: 'app-title' }, 'Faculty Outing - Team Assignment Portal'),
          h('p', { className: 'subtitle' }, 'Staff Registration & Distribution System')
        ),
        error && h('div', { className: 'error-message' }, error),
        h('form', { onSubmit: handleLogin, className: 'login-form' },
          h('div', { className: 'form-group' },
            h('label', { htmlFor: 'name', className: 'form-label' },
              h('svg', { className: 'label-icon', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2' },
                h('path', { d: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2' }),
                h('circle', { cx: '12', cy: '7', r: '4' })
              ),
              'Full Name'
            ),
            h('input', {
              type: 'text',
              id: 'name',
              className: 'form-input',
              value: currentStaff.name,
              onChange: (e) => setCurrentStaff({ ...currentStaff, name: e.target.value }),
              required: true,
              placeholder: 'Enter your full name',
              autoComplete: 'name'
            })
          ),
          h('div', { className: 'form-group' },
            h('label', { htmlFor: 'department', className: 'form-label' },
              h('svg', { className: 'label-icon', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2' },
                h('path', { d: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' }),
                h('polyline', { points: '9,22 9,12 15,12 15,22' })
              ),
              'Department'
            ),
            h('select', {
              id: 'department',
              className: 'form-input',
              value: currentStaff.department,
              onChange: (e) => setCurrentStaff({ ...currentStaff, department: e.target.value }),
              required: true
            },
              h('option', { value: '', disabled: true }, 'Select your department'),
              h('option', { value: 'CSE' }, 'CSE - Computer Science & Engineering'),
              h('option', { value: 'CVL' }, 'CVL - Civil Engineering'),
              h('option', { value: 'AIDS' }, 'AIDS - Artificial Intelligence & Data Science'),
              h('option', { value: 'BME' }, 'BME - Biomedical Engineering'),
              h('option', { value: 'CME' }, 'CME - Chemical  Engineering'),
              
              h('option', { value: 'EEE' }, 'EEE - Electrical & Electronics Engineering'),
              h('option', { value: 'ECE' }, 'ECE - Electronics & Communication Engineering'),
              h('option', { value: 'S&H' }, 'S&H - Science & Humanities'),
              h('option', { value: 'MHT' }, 'MHT - Mechatronics'),
              h('option', { value: 'MAE' }, 'MAE - Mechanical Automation Engineering'),
              h('option', { value: 'MECH' }, 'MECH - Mechanical Engineering'),
              h('option', { value: 'IT' }, 'IT - Information Technology')
            )
          ),
          h('button', { type: 'submit', className: 'btn btn-primary btn-large' },
            loading ? 'Registering...' : 'Continue to Team Selection',
            !loading && h('svg', { className: 'btn-icon', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2' },
              h('line', { x1: '5', y1: '12', x2: '19', y2: '12' }),
              h('polyline', { points: '12,5 19,12 12,19' })
            )
          )
        ),
        h('div', { className: 'login-footer' },
          h('button', { onClick: showAdminLogin, className: 'admin-link', type: 'button' }, 'Administrator Access'),
          h('p', { className: 'footer-credit' }, 'Developed by CSE Department | Agni College of Technology')
        )
      )
    );
  };

  // Render Team Selection View
  const renderSelection = () => {
    return h('div', { className: 'view-container' },
      h('div', { className: 'selection-card' },
        h('h2', { className: 'welcome-text' }, `Welcome, ${currentStaff.name}!`),
        h('p', { className: 'instruction-text' }, 'Please select any option below. You will be randomly assigned to a team.'),
        error && h('div', { className: 'error-message' }, error),
        loading ? h('div', { className: 'loading' }, 'Assigning team...') :
        h('div', { className: 'team-grid' },
          teamItems.map(item =>
            h('div', {
              key: item.id,
              className: 'team-item',
              style: { borderColor: item.color },
              onClick: () => handleTeamSelection(item)
            },
              h('div', {
                className: 'team-color-circle',
                style: { backgroundColor: item.color }
              }),
              h('div', { className: 'team-label' }, item.label)
            )
          )
        ),
        h('button', { onClick: resetApp, className: 'btn btn-outline', disabled: loading }, 'Back to Login')
      )
    );
  };

  // Render Confirmation View
  const renderConfirmation = () => {
    return h('div', { className: 'view-container' },
      h('div', { className: 'confirmation-card' },
        h('div', { className: 'success-icon' }, '\u2713'),
        h('h2', null, 'Team Assignment Complete!'),
        h('div', { className: 'assignment-details' },
          h('p', null,
            h('strong', null, 'Name: '),
            currentStaff.name
          ),
          h('p', null,
            h('strong', null, 'Department: '),
            currentStaff.department
          ),
          assignedTeam && h('p', { className: 'team-assignment' },
            h('strong', null, 'Assigned to: '),
            h('span', {
              style: {
                color: assignedTeam.color,
                fontWeight: 'bold',
                fontSize: '1.3em'
              }
            }, `Team ${assignedTeam.label}`)
          )
        ),
        h('div', { className: 'success-message' },
          h('p', null, 'Your team assignment has been completed successfully!'),
          h('p', null, 'Please remember your team color for the event.')
        ),
        h('button', { onClick: resetApp, className: 'btn btn-primary btn-large' }, 'Complete')
      )
    );
  };

  // Render Admin View
  const renderAdmin = () => {
    return h('div', { className: 'view-container admin-container' },
      h('div', { className: 'admin-card' },
        h('h2', null, 'Administrator Dashboard'),
        h('div', { className: 'admin-stats' },
          h('div', { className: 'stat-card' },
            h('div', { className: 'stat-number' }, staffData.length),
            h('div', { className: 'stat-label' }, 'Total Staff')
          ),
          teamStats.map(team =>
            h('div', { key: team.id, className: 'stat-card', style: { borderColor: team.color } },
              h('div', { className: 'stat-number', style: { color: team.color } }, team.count),
              h('div', { className: 'stat-label' }, `Team ${team.label}`)
            )
          )
        ),
        h('div', { className: 'admin-actions' },
          h('button', { onClick: downloadCSV, className: 'btn btn-secondary' }, 'Download CSV'),
          h('button', { onClick: downloadExcel, className: 'btn btn-secondary' }, 'Download Excel'),
          h('button', { onClick: clearAllData, className: 'btn btn-danger' }, 'Clear All Data')
        ),
        h('div', { className: 'staff-list' },
          h('h3', null, 'Staff Assignments'),
          staffData.length === 0 ? h('p', { className: 'no-data' }, 'No staff registered yet.') :
          h('div', { className: 'table-container' },
            h('table', { className: 'staff-table' },
              h('thead', null,
                h('tr', null,
                  h('th', null, 'Name'),
                  h('th', null, 'Department'),
                  h('th', null, 'Team'),
                  h('th', null, 'Date'),
                  h('th', null, 'Action')
                )
              ),
              h('tbody', null,
                staffData.map((staff, index) =>
                  h('tr', { key: index },
                    h('td', null, staff.name),
                    h('td', null, staff.department),
                    h('td', null,
                      h('span', {
                        className: 'team-badge',
                        style: { backgroundColor: teamItems.find(t => t.id === staff.teamId)?.color }
                      }, staff.teamName)
                    ),
                    h('td', null, new Date(staff.timestamp).toLocaleDateString()),
                    h('td', null,
                      h('button', {
                        onClick: () => deleteStaffMember(staff._id),
                        className: 'btn-delete',
                        title: 'Delete this entry'
                      }, '✕')
                    )
                  )
                )
              )
            )
          )
        ),
        h('button', { onClick: resetApp, className: 'btn btn-outline' }, 'Logout')
      )
    );
  };

  // Render Admin Login View
  const renderAdminLogin = () => {
    return h('div', { className: 'view-container' },
      h('div', { className: 'login-card' },
        h('div', { className: 'login-header' },
          h('div', { className: 'logo-circle' },
            h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2' },
              h('rect', { x: '3', y: '11', width: '18', height: '11', rx: '2', ry: '2' }),
              h('path', { d: 'M7 11V7a5 5 0 0 1 10 0v4' })
            )
          ),
          h('h1', { className: 'app-title' }, 'Administrator Access'),
          h('p', { className: 'subtitle' }, 'Enter your password to continue')
        ),
        error && h('div', { className: 'error-message' }, error),
        h('form', { onSubmit: handleAdminLogin, className: 'login-form' },
          h('div', { className: 'form-group' },
            h('label', { className: 'form-label' },
              h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', className: 'label-icon' },
                h('rect', { x: '3', y: '11', width: '18', height: '11', rx: '2', ry: '2' }),
                h('path', { d: 'M7 11V7a5 5 0 0 1 10 0v4' })
              ),
              'Admin Password'
            ),
            h('input', {
              type: 'password',
              className: 'form-input',
              placeholder: 'Enter admin password',
              value: adminPassword,
              onChange: (e) => setAdminPassword(e.target.value),
              required: true,
              autoFocus: true
            })
          ),
          h('button', { type: 'submit', className: 'btn btn-primary btn-large' }, 'Login as Admin')
        ),
        h('div', { className: 'login-footer' },
          h('button', { onClick: resetApp, className: 'admin-link', type: 'button' }, 'Back to Staff Login')
        )
      )
    );
  };

  // Main render
  return h('div', { className: 'App' },
    currentView === 'login' && renderLogin(),
    currentView === 'adminLogin' && renderAdminLogin(),
    currentView === 'selection' && renderSelection(),
    currentView === 'confirmation' && renderConfirmation(),
    currentView === 'admin' && renderAdmin()
  );
}

export default App;
