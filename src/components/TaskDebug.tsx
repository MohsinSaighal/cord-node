import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { AlertCircle, CheckCircle, RefreshCw, Database, Bug, PenTool as Tool } from 'lucide-react';

interface TaskDebugProps {
  userId: string;
  taskId?: string;
}

const TaskDebug: React.FC<TaskDebugProps> = ({ userId, taskId }) => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [action, setAction] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<string>(taskId || '');
  const [availableTasks, setAvailableTasks] = useState<any[]>([]);

  React.useEffect(() => {
    if (taskId) {
      setSelectedTask(taskId);
    }
    loadAvailableTasks();
  }, [taskId]);

  const loadAvailableTasks = async () => {
    try {
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title, type')
        .order('type', { ascending: true })
        .order('title', { ascending: true });
      
      if (tasks) {
        setAvailableTasks(tasks);
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  const debugTask = async () => {
    if (!selectedTask) {
      setResults({ error: 'Please select a task to debug' });
      return;
    }

    setLoading(true);
    setAction('debug');
    try {
      const { data, error } = await supabase.rpc('debug_task_completion', {
        p_user_id: userId,
        p_task_id: selectedTask
      });
      
      if (error) throw error;
      setResults(data);
    } catch (error) {
      console.error('Error debugging task:', error);
      setResults({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const resetTask = async () => {
    if (!selectedTask) {
      setResults({ error: 'Please select a task to reset' });
      return;
    }

    if (!window.confirm(`Are you sure you want to reset the "${selectedTask}" task? This will remove all progress and completion status.`)) {
      return; // User cancelled the reset
    }

    setLoading(true);
    setAction('reset');
    try {
      const { data, error } = await supabase.rpc('reset_user_task', {
        p_user_id: userId,
        p_task_id: selectedTask
      });
      
      if (error) throw error;
      setResults(data);
    } catch (error) {
      console.error('Error resetting task:', error);
      setResults({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const fixSocialMasterTask = async () => {
    setLoading(true);
    setAction('fix');
    try {
      const { data, error } = await supabase.rpc('fix_social_master_task_progress', { 
        p_user_id: userId
      });
      
      if (error) throw error;
      setResults(data);
    } catch (error) {
      console.error('Error fixing social master task:', error);
      setResults({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const getTaskColor = (type: string) => {
    switch (type) {
      case 'daily': return 'bg-green-600/20 text-green-400';
      case 'weekly': return 'bg-blue-600/20 text-blue-400';
      case 'social': return 'bg-pink-600/20 text-pink-400';
      case 'achievement': return 'bg-purple-600/20 text-purple-400';
      default: return 'bg-gray-600/20 text-gray-400';
    }
  };

  return (
    <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-gray-800 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center">
          <Bug className="w-4 h-4 mr-2 text-red-400" />
          Task System Diagnostics
        </h3>
        <div className="flex space-x-2">
          <button
            onClick={debugTask}
            disabled={loading || !selectedTask}
            className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            Debug Task
          </button>
          <button
            onClick={resetTask}
            disabled={loading || !selectedTask}
            className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            Reset Task
          </button>
          <button
            onClick={fixSocialMasterTask}
            disabled={loading}
            className="px-3 py-1 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            Fix Social Master
          </button>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">Select Task</label>
        <select
          value={selectedTask}
          onChange={(e) => setSelectedTask(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
        >
          <option value="">-- Select a task --</option>
          {availableTasks.map(task => (
            <option key={task.id} value={task.id}>
              {task.title} ({task.type})
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="flex items-center justify-center p-4">
          <RefreshCw className="w-5 h-5 animate-spin text-blue-400 mr-2" />
          <span className="text-blue-400">
            {action === 'debug' && 'Debugging task...'}
            {action === 'reset' && 'Resetting task...'}
            {action === 'fix' && 'Fixing social master task...'}
          </span>
        </div>
      )}

      {results && !loading && (
        <div className="bg-gray-800 rounded-lg p-4 overflow-auto max-h-64">
          {results.error ? (
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-red-400 font-medium">Error</div>
                <div className="text-gray-300 text-sm">{results.error}</div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start space-x-2 mb-3">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-green-400 font-medium">Success</div>
                  {action === 'debug' && (
                    <div className="text-gray-300 text-sm">
                      Task: {results.task_info?.title} ({results.task_info?.type})
                      <br />
                      Completed: {results.task_completion?.completed ? 'Yes' : 'No'}
                      <br />
                      Progress: {results.task_completion?.progress || 0} / {results.task_info?.max_progress}
                      <br />
                      Can Complete: {results.can_complete?.can_complete ? 'Yes' : 'No'}
                      {!results.can_complete?.can_complete && (
                        <span className="text-yellow-400"> - {results.can_complete?.reason}</span>
                      )}
                    </div>
                  )}
                  {action === 'reset' && (
                    <div className="text-gray-300 text-sm">
                      Task {results.task_id} has been reset for user {results.user_id}
                    </div>
                  )}
                  {action === 'fix' && (
                    <div className="text-gray-300 text-sm">
                      Social master task updated. New progress: {results.new_progress} / 4
                      <br />
                      Completed social tasks: {results.completed_social_tasks}
                    </div>
                  )}
                </div>
              </div>
              <pre className="text-xs text-gray-400 overflow-auto">
                {JSON.stringify(results, null, 2)}
              </pre>
            </>
          )}
        </div>
      )}

      <div className="mt-3 text-xs text-gray-500">
        This component is for testing and debugging the task system. It allows you to diagnose issues with task completion, reset tasks, and fix the social-media-master task progress.
      </div>
    </div>
  );
};

export default TaskDebug;