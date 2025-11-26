'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import CreateTaskModal from '@/components/tasks/CreateTaskModal';
import EditTaskModal from '@/components/tasks/EditTaskModal';
import { TaskList } from '@/components/tasks/TaskList';
import { TaskBreakdown } from '@/components/tasks/TaskBreakdown';
import ClientGuard from '@/components/ClientGuard';
import { TaskPriority, TaskStatus, Task, ITask } from '@/lib/types';
import { TaskAPI } from '@/lib/api';
import { 
  PlusIcon, 
  MagnifyingGlassIcon, 
  FunnelIcon
} from '@heroicons/react/24/outline';


// Display type for local list
type DisplayTask = {
  id: string | number;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string;
  tags: string[];
  points: number;
};

export default function TasksPage() {
  // State for filtering
  const [searchQuery, setSearchQuery] = useState('');
  
  // State for task form
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // State for edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // State for tasks
  const [tasks, setTasks] = useState<DisplayTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch tasks on mount
  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await TaskAPI.getAllTasks();
      
      // Convert ITask[] to DisplayTask[]
      const displayTasks: DisplayTask[] = response.data.map((task: ITask) => ({
        id: task._id,
        title: task.title,
        description: task.description || '',
        priority: task.priority,
        status: task.status,
        dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
        tags: task.tags || [],
        points: task.points,
      }));

      setTasks(displayTasks);
    } catch (err: any) {
      console.error('Error fetching tasks:', err);
      setError(err.response?.data?.message || 'Failed to fetch tasks. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate task counts by category
  const taskCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: tasks.length,
    };

    tasks.forEach(task => {
      task.tags.forEach(tag => {
        const category = tag.toLowerCase();
        counts[category] = (counts[category] || 0) + 1;
      });
    });

    return counts;
  }, [tasks]);

  // Filter tasks based on search query
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch = searchQuery === '' || 
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
      return matchesSearch;
    });
  }, [tasks, searchQuery]);

  // Task creation handler
  const handleTaskCreated = (created: Task) => {
    const displayTask: DisplayTask = {
      id: created._id,
      title: created.title,
      description: created.description || '',
      priority: created.priority,
      status: created.status,
      dueDate: created.dueDate ? new Date(created.dueDate).toISOString().split('T')[0] : '',
      tags: created.tags || [],
      points: created.points,
    };
    
    setTasks((prev) => [displayTask, ...prev]);
    setShowTaskForm(false);
    setSelectedTags([]);
  };

  const handleCancelTaskForm = () => {
    setShowTaskForm(false);
    setSelectedTags([]);
  };

  const handleCancelEditForm = () => {
    setShowEditModal(false);
    setEditingTask(null);
  };

  const handleAddTask = (category?: string) => {
    if (category && category !== 'all') {
      setSelectedTags([category]);
    } else {
      setSelectedTags([]);
    }
    setShowTaskForm(true);
  };

  const handleTaskUpdated = (updated: Task) => {
    const displayTask: DisplayTask = {
      id: updated._id,
      title: updated.title,
      description: updated.description || '',
      priority: updated.priority,
      status: updated.status,
      dueDate: updated.dueDate ? new Date(updated.dueDate).toISOString().split('T')[0] : '',
      tags: updated.tags || [],
      points: updated.points,
    };
    
    // Update the task in the list
    setTasks((prev) => prev.map(task => 
      task.id === displayTask.id ? displayTask : task
    ));
    setShowEditModal(false);
    setEditingTask(null);
  };

  // Task action handlers
  const handleEditTask = async (taskId: string | number) => {
    try {
      // Fetch the full task details from the API
      const response = await TaskAPI.getTaskById(taskId.toString());
      
      // Parse dates for frontend use
      const task: Task = {
        ...response.data,
        taskTime: response.data.taskTime ? new Date(response.data.taskTime) : undefined,
        dueDate: response.data.dueDate ? new Date(response.data.dueDate) : undefined,
        completedAt: response.data.completedAt ? new Date(response.data.completedAt) : undefined,
        createdAt: new Date(response.data.createdAt),
        updatedAt: new Date(response.data.updatedAt),
      };
      
      setEditingTask(task);
      setShowEditModal(true);
    } catch (err: any) {
      console.error('Error fetching task for edit:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load task. Please try again.';
      setError(errorMessage);
      // Clear error after 5 seconds
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleCompleteTask = async (taskId: string | number) => {
    try {
      await TaskAPI.completeTask(taskId.toString());
      
      // Update local state
      setTasks(prev => prev.map(task => 
        task.id === taskId 
          ? { ...task, status: TaskStatus.COMPLETED }
          : task
      ));
    } catch (err: any) {
      console.error('Error completing task:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to complete task. Please try again.';
      setError(errorMessage);
      // Clear error after 5 seconds
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleDeleteTask = async (taskId: string | number) => {
    if (!confirm('Are you sure you want to delete this task?')) {
      return;
    }

    try {
      await TaskAPI.deleteTask(taskId.toString());
      
      // Update local state
      setTasks(prev => prev.filter(task => task.id !== taskId));
    } catch (err: any) {
      console.error('Error deleting task:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to delete task. Please try again.';
      setError(errorMessage);
      // Clear error after 5 seconds
      setTimeout(() => setError(null), 5000);
    }
  };

  const getEmptyMessage = () => {
    if (searchQuery) {
      return 'No tasks match your search.';
    }
    return 'No tasks yet. Click "Add Task" to create your first task!';
  };

  return (
    <ClientGuard>
      <Sidebar>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Tasks</h1>
            <p className="text-muted-foreground">Manage and track your daily tasks</p>
          </div>
          <div className="flex items-center gap-2">
            <TaskBreakdown />
            <Button 
              className="flex items-center gap-2"
              onClick={() => handleAddTask()}
            >
              <PlusIcon className="h-4 w-4" />
              Add Task
            </Button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <Card className="border-red-500">
            <CardContent className="p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-sm font-medium text-red-800">Error loading tasks</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-3"
                    onClick={fetchTasks}
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters and Search */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-1 items-center gap-4">
                <div className="relative flex-1 max-w-md">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search tasks..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button variant="outline" className="flex items-center gap-2">
                  <FunnelIcon className="h-4 w-4" />
                  Filters
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="default" size="sm">
                  {tasks.length} Total
                </Badge>
                <Badge variant="secondary" size="sm">
                  {tasks.filter(t => t.status === TaskStatus.PENDING).length} Pending
                </Badge>
                <Badge variant="success" size="sm">
                  {tasks.filter(t => t.status === TaskStatus.COMPLETED).length} Completed
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tag Filter */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="primary"
                size="sm"
                className="capitalize"
              >
                All ({taskCounts.all})
              </Button>
              {Object.entries(taskCounts)
                .filter(([tag]) => tag !== 'all')
                .map(([tag, count]) => (
                  <Button
                    key={tag}
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddTask(tag)}
                    className="capitalize"
                  >
                    {tag} ({count})
                  </Button>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Tasks List */}
        <TaskList
          tasks={filteredTasks}
          isLoading={isLoading}
          onEdit={handleEditTask}
          onComplete={handleCompleteTask}
          onDelete={handleDeleteTask}
          emptyMessage={getEmptyMessage()}
        />
      </div>

      {/* Task Form Modal */}
      <CreateTaskModal
        isOpen={showTaskForm}
        onClose={handleCancelTaskForm}
        initialTags={selectedTags}
        onCreated={handleTaskCreated}
      />

      {/* Edit Task Modal */}
      <EditTaskModal
        isOpen={showEditModal}
        onClose={handleCancelEditForm}
        task={editingTask}
        onUpdated={handleTaskUpdated}
      />
      </Sidebar>
    </ClientGuard>
  );
}
