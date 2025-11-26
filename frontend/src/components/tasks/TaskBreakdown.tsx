'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { organizerAgentAPI } from '@/lib/api/agents/organizerAgent';
import { 
  SparklesIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface TaskBreakdownProps {
  onBreakdownComplete?: (breakdown: string) => void;
}

export function TaskBreakdown({ onBreakdownComplete }: TaskBreakdownProps) {
  const [taskDescription, setTaskDescription] = useState('');
  const [breakdown, setBreakdown] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const handleBreakdown = async () => {
    if (!taskDescription.trim()) {
      setError('Please enter a task description');
      return;
    }

    setLoading(true);
    setError(null);
    setBreakdown('');

    try {
      const response = await organizerAgentAPI.breakdownTask(taskDescription);
      setBreakdown(response.breakdown);
      if (onBreakdownComplete) {
        onBreakdownComplete(response.breakdown);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to break down task');
      console.error('Task breakdown error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setTaskDescription('');
    setBreakdown('');
    setError(null);
    setShowForm(false);
  };

  if (!showForm && !breakdown) {
    return (
      <Button
        variant="outline"
        onClick={() => setShowForm(true)}
        className="flex items-center gap-2"
      >
        <SparklesIcon className="h-4 w-4" />
        AI Task Breakdown
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <SparklesIcon className="h-5 w-5 text-primary" />
              AI Task Breakdown
            </CardTitle>
            <CardDescription>
              Break down complex tasks into smaller, actionable subtasks
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
          >
            <XMarkIcon className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!breakdown ? (
          <>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Task Description
              </label>
              <Input
                type="text"
                placeholder="e.g., Plan and execute a marketing campaign for Q2"
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !loading) {
                    handleBreakdown();
                  }
                }}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Describe the task you want to break down into smaller steps
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-error text-sm">
                <ExclamationTriangleIcon className="h-4 w-4" />
                <p>{error}</p>
              </div>
            )}

            <Button
              onClick={handleBreakdown}
              disabled={loading || !taskDescription.trim()}
              className="w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <SparklesIcon className="h-4 w-4" />
                  Break Down Task
                </>
              )}
            </Button>
          </>
        ) : (
          <>
            <div className="bg-muted/30 p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircleIcon className="h-5 w-5 text-success" />
                <h4 className="font-semibold text-foreground">Breakdown Result</h4>
              </div>
              <div className="whitespace-pre-wrap text-foreground text-sm">
                {breakdown}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(breakdown);
                }}
                size="sm"
              >
                Copy Breakdown
              </Button>
              <Button
                variant="outline"
                onClick={handleReset}
                size="sm"
              >
                Start Over
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default TaskBreakdown;

