const fs = require('fs');
const path = require('path');

// 1. Generate SalesTasksView.jsx
const viewPath = path.join(__dirname, 'src', 'views', 'SalesTasksView.jsx');
const viewContent = `import React, { useState, useEffect } from 'react';
import { STYLE } from '../constants/theme';
import { api } from '../services/api';
import { Header } from '../components/layout/Header';

export const SalesTasksView = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await api.get('/sales-tasks');
      if (res.success) setTasks(res.tasks || []);
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      const res = await api.put(\`/sales-tasks/\${id}/status\`, { status });
      if (res.success) {
        setTasks(tasks.map(t => t.id === id ? { ...t, status: res.task.status } : t));
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'completed': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'processing': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default: return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'; // pending
    }
  };

  const formatTaskType = (type) => {
    switch(type) {
      case 'hot_lead': return 'Hot Lead';
      case 'call': return 'Scheduled Call';
      case 'followup': return 'Follow-up';
      case 'overdue': return 'Overdue Task';
      default: return type;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full relative z-0 overflow-hidden bg-[#0A0C10] font-sans">
      <Header title="Sales Task" />
      <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 custom-scrollbar">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex justify-between items-center mb-6">
             <h2 className="text-xl font-bold text-white tracking-tight">Today's Digest</h2>
             <button onClick={fetchTasks} className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-medium rounded-lg transition-colors text-sm">
                Refresh Tasks
             </button>
          </div>

          <div className="bg-[#11141A] rounded-xl border border-white/5 overflow-hidden shadow-2xl">
            {loading ? (
              <div className="p-12 text-center text-white/50">Loading your tasks...</div>
            ) : tasks.length === 0 ? (
              <div className="p-12 text-center text-white/50 flex flex-col items-center gap-3">
                 <svg className="w-12 h-12 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                 </svg>
                 <span>No tasks assigned for today. You're all caught up!</span>
              </div>
            ) : (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 bg-[#161B22]">
                      <th className="px-6 py-4 text-xs font-semibold text-white/50 uppercase tracking-wider">Lead</th>
                      <th className="px-6 py-4 text-xs font-semibold text-white/50 uppercase tracking-wider">Contact</th>
                      <th className="px-6 py-4 text-xs font-semibold text-white/50 uppercase tracking-wider">Task Type</th>
                      <th className="px-6 py-4 text-xs font-semibold text-white/50 uppercase tracking-wider text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {tasks.map((task) => (
                      <tr key={task.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-white">{task.name || 'Unknown Lead'}</div>
                          <div className="text-xs text-white/40 mt-1 capitalize">{task.lead_status}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white/60">
                          <div>{task.phone || '-'}</div>
                          <div className="text-xs mt-1">{task.email || ''}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-white/80 font-medium">
                            {formatTaskType(task.task_type)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                           <select 
                             value={task.status}
                             onChange={(e) => updateStatus(task.id, e.target.value)}
                             className={\`text-xs font-semibold px-3 py-1.5 rounded-full border outline-none cursor-pointer transition-colors \${getStatusColor(task.status)}\`}
                             style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', textAlign: 'center' }}
                           >
                             <option value="pending" className="bg-[#11141A] text-yellow-400">Pending</option>
                             <option value="processing" className="bg-[#11141A] text-blue-400">Processing</option>
                             <option value="completed" className="bg-[#11141A] text-green-400">Completed</option>
                           </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
`;
fs.writeFileSync(viewPath, viewContent, 'utf8');
console.log('Created SalesTasksView.jsx');

// 2. Update App.jsx
const appPath = path.join(__dirname, 'src', 'App.jsx');
let appContent = fs.readFileSync(appPath, 'utf8');
if (!appContent.includes('SalesTasksView')) {
  appContent = appContent.replace("import { Dashboard } from './views/Dashboard.jsx';", "import { Dashboard } from './views/Dashboard.jsx';\nimport { SalesTasksView } from './views/SalesTasksView.jsx';");
  appContent = appContent.replace('<Route path="/leads"', '<Route path="/sales-tasks" element={<SalesTasksView />} />\n                <Route path="/leads"');
  fs.writeFileSync(appPath, appContent, 'utf8');
  console.log('Updated App.jsx');
}

// 3. Update Sidebar.jsx
const sidebarPath = path.join(__dirname, 'src', 'components', 'layout', 'Sidebar.jsx');
let sidebarContent = fs.readFileSync(sidebarPath, 'utf8');
if (!sidebarContent.includes('/sales-tasks')) {
  // Find where to insert - right after leads
  const searchStr = `{ path: '/leads', icon: Users, label: 'Leads' },`;
  const insertStr = `{ path: '/leads', icon: Users, label: 'Leads' },\n  { path: '/sales-tasks', icon: CheckSquare, label: 'Sales Task' },`;
  
  if(sidebarContent.includes(searchStr)) {
      sidebarContent = sidebarContent.replace(searchStr, insertStr);
      // Ensure CheckSquare is imported
      if (!sidebarContent.includes('CheckSquare')) {
          sidebarContent = sidebarContent.replace('Users,', 'Users, CheckSquare,');
      }
      fs.writeFileSync(sidebarPath, sidebarContent, 'utf8');
      console.log('Updated Sidebar.jsx');
  } else {
      console.log('Could not automatically inject into Sidebar.jsx. Please review.');
  }
}
