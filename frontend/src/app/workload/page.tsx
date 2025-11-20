'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import ClientGuard from '@/components/ClientGuard';
import { organizerAgentAPI, TaskRecommendation } from '@/lib/api/agents/organizerAgent';
import { useRouter } from 'next/navigation';
import { 
  ChartBarIcon,
  SparklesIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  ArrowRightIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

export default function WorkloadOptimizationPage() {
  const router = useRouter();
  const [recommendations, setRecommendations] = useState<TaskRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [days, setDays] = useState(7);
  const [selectedRecommendations, setSelectedRecommendations] = useState<Set<string>>(new Set());

  const handleOptimize = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    setRecommendations([]);
    setSelectedRecommendations(new Set());

    try {
      const response = await organizerAgentAPI.optimizeWorkload(days);
      console.log('Optimization response:', response);
      console.log('Recommendations:', response.recommendations);
      
      // Only store recommendations, ignore analysis and summary text
      const recs = response.recommendations || [];
      setRecommendations(recs);
      
      // Select all recommendations by default
      if (recs.length > 0) {
        setSelectedRecommendations(new Set(recs.map(r => r.taskId)));
      } else {
        setError('No optimization recommendations found. Your workload may already be well-balanced, or there were no tasks to optimize.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to optimize workload');
      console.error('Workload optimization error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRecommendation = (taskId: string) => {
    const newSelected = new Set(selectedRecommendations);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedRecommendations(newSelected);
  };

  const handleApplyChanges = async () => {
    if (selectedRecommendations.size === 0) {
      setError('Please select at least one recommendation to apply');
      return;
    }

    setApplying(true);
    setError(null);
    setSuccess(null);

    try {
      const recommendationsToApply = recommendations.filter(r => selectedRecommendations.has(r.taskId));
      const response = await organizerAgentAPI.applyWorkloadOptimization(recommendationsToApply);
      
      setSuccess(`Successfully updated ${response.updatedTasks?.length || 0} task(s)`);
      
      // Refresh after 2 seconds and redirect to tasks
      setTimeout(() => {
        router.push('/tasks');
        router.refresh();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply changes');
      console.error('Apply optimization error:', err);
    } finally {
      setApplying(false);
    }
  };

  const formatDate = (dateStr: string | null | undefined | Date) => {
    if (!dateStr) return 'No date';
    try {
      const date = dateStr instanceof Date ? dateStr : new Date(dateStr);
      if (isNaN(date.getTime())) return 'Invalid date';
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
    } catch {
      return 'Invalid date';
    }
  };

  const normalizeDate = (date: string | null | undefined | Date): string | null => {
    if (!date) return null;
    try {
      const d = date instanceof Date ? date : new Date(date);
      if (isNaN(d.getTime())) return null;
      return d.toISOString().split('T')[0];
    } catch {
      return null;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'urgent': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  return (
    <ClientGuard>
      <Sidebar>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <ChartBarIcon className="h-8 w-8 text-primary" />
              Workload Optimization
            </h1>
            <p className="text-muted-foreground">
              AI-powered analysis to balance your workload and maximize productivity
            </p>
          </div>

          {/* Controls */}
          <Card>
            <CardHeader>
              <CardTitle>Optimization Settings</CardTitle>
              <CardDescription>
                Configure optimization parameters. We'll analyze up to 15 most important tasks to prevent timeouts.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Days to optimize: {days}
                  </label>
                  <input
                    type="range"
                    min="3"
                    max="14"
                    value={days}
                    onChange={(e) => setDays(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>3 days</span>
                    <span>14 days</span>
                  </div>
                </div>
                <div className="pt-2">
                  <p className="text-xs text-muted-foreground">
                    Note: Only the top 15 tasks (sorted by priority and due date) will be analyzed to ensure fast processing.
                  </p>
                </div>
                <div className="pt-2">
                  <Button
                    onClick={handleOptimize}
                    disabled={loading}
                    size="lg"
                    className="w-full flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <ArrowPathIcon className="h-5 w-5 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <SparklesIcon className="h-5 w-5" />
                        Optimize Workload
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Error Display */}
          {error && (
            <Card className="border-error">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-error">
                  <ExclamationTriangleIcon className="h-5 w-5" />
                  <p>{error}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Success Message */}
          {success && (
            <Card className="border-success">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-success">
                  <CheckCircleIcon className="h-5 w-5" />
                  <p>{success}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recommendations Table - Before/After Comparison */}
          {recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <SparklesIcon className="h-5 w-5 text-primary" />
                    Workload Optimization - Before & After
                  </div>
                  <Badge variant="secondary">
                    {selectedRecommendations.size} of {recommendations.length} selected
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Review the proposed changes to your tasks. Click a row to toggle selection, then apply changes.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-4 text-sm font-semibold">Task</th>
                        <th className="text-left p-4 text-sm font-semibold">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">BEFORE</span>
                          </div>
                        </th>
                        <th className="text-center p-4 text-sm font-semibold w-12"></th>
                        <th className="text-left p-4 text-sm font-semibold">
                          <div className="flex items-center gap-2">
                            <span className="text-primary">AFTER</span>
                          </div>
                        </th>
                        <th className="text-left p-4 text-sm font-semibold">Reason</th>
                        <th className="text-center p-4 text-sm font-semibold">Select</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recommendations.map((rec, idx) => {
                        const isSelected = selectedRecommendations.has(rec.taskId);
                        const currentDateNormalized = normalizeDate(rec.currentDueDate);
                        const suggestedDateNormalized = normalizeDate(rec.suggestedDueDate);
                        const dueDateChanged = currentDateNormalized !== suggestedDateNormalized;
                        const priorityChanged = rec.suggestedPriority && rec.currentPriority !== rec.suggestedPriority;
                        const hasChanges = dueDateChanged || priorityChanged;
                        
                        return (
                          <tr
                            key={rec.taskId}
                            onClick={() => handleToggleRecommendation(rec.taskId)}
                            className={`border-b cursor-pointer transition-colors ${
                              isSelected 
                                ? 'bg-primary/10 hover:bg-primary/20' 
                                : 'hover:bg-muted/50'
                            }`}
                          >
                            <td className="p-4">
                              <div className="font-medium text-foreground">{rec.taskTitle}</div>
                            </td>
                            <td className="p-4">
                              <div className="space-y-2">
                                <div>
                                  <div className="text-xs text-muted-foreground mb-1">Due Date</div>
                                  <div className="text-sm font-medium text-foreground">
                                    {formatDate(rec.currentDueDate)}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs text-muted-foreground mb-1">Priority</div>
                                  <Badge 
                                    variant={getPriorityColor(rec.currentPriority) as any}
                                    size="sm"
                                  >
                                    {rec.currentPriority}
                                  </Badge>
                                </div>
                              </div>
                            </td>
                            <td className="p-4 text-center">
                              {hasChanges && (
                                <ArrowRightIcon className="h-5 w-5 text-primary mx-auto" />
                              )}
                            </td>
                            <td className="p-4">
                              <div className="space-y-2">
                                <div>
                                  <div className="text-xs text-muted-foreground mb-1">Due Date</div>
                                  <div className={`text-sm font-medium ${
                                    dueDateChanged ? 'text-primary' : 'text-foreground'
                                  }`}>
                                    {formatDate(rec.suggestedDueDate)}
                                    {dueDateChanged && (
                                      <Badge variant="outline" size="sm" className="ml-2">
                                        Changed
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs text-muted-foreground mb-1">Priority</div>
                                  {priorityChanged && rec.suggestedPriority ? (
                                    <Badge 
                                      variant={getPriorityColor(rec.suggestedPriority) as any}
                                      size="sm"
                                    >
                                      {rec.suggestedPriority}
                                      <Badge variant="outline" size="sm" className="ml-2">
                                        Changed
                                      </Badge>
                                    </Badge>
                                  ) : (
                                    <Badge 
                                      variant={getPriorityColor(rec.currentPriority) as any}
                                      size="sm"
                                    >
                                      {rec.currentPriority}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="text-sm text-muted-foreground max-w-xs">
                                {rec.reason}
                              </div>
                            </td>
                            <td className="p-4 text-center">
                              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                isSelected 
                                  ? 'bg-primary border-primary' 
                                  : 'border-muted-foreground'
                              }`}>
                                {isSelected && (
                                  <CheckCircleIcon className="h-4 w-4 text-primary-foreground" />
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>


                {recommendations.length > 0 && (
                  <div className="mt-6 flex items-center justify-between gap-4">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedRecommendations(new Set(recommendations.map(r => r.taskId)));
                        }}
                      >
                        Select All
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedRecommendations(new Set());
                        }}
                      >
                        Deselect All
                      </Button>
                    </div>
                    <Button
                      onClick={handleApplyChanges}
                      disabled={applying || selectedRecommendations.size === 0}
                      className="flex items-center gap-2"
                    >
                      {applying ? (
                        <>
                          <ArrowPathIcon className="h-4 w-4 animate-spin" />
                          Applying...
                        </>
                      ) : (
                        <>
                          <CheckCircleIcon className="h-4 w-4" />
                          Apply Selected Changes ({selectedRecommendations.size})
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}


          {/* No Recommendations Message */}
          {recommendations.length === 0 && !loading && !error && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircleIcon className="h-5 w-5 text-success" />
                  No Changes Needed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <p className="mb-2">Your workload is already well-balanced!</p>
                  <p className="text-sm">The AI analyzed your tasks and found no optimizations needed at this time.</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Info Card */}
          {recommendations.length === 0 && !loading && !error && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClockIcon className="h-5 w-5" />
                  How It Works
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    <strong className="text-foreground">Workload Optimization</strong> uses AI to analyze your current tasks and suggest:
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>Optimal task distribution across days</li>
                    <li>Workload balancing to avoid overload</li>
                    <li>Priority-based scheduling recommendations</li>
                    <li>Time management suggestions</li>
                    <li>Risk assessment for overdue tasks</li>
                    <li>Actionable recommendations for task rescheduling</li>
                  </ul>
                  <p className="pt-2">
                    Click <strong className="text-foreground">&quot;Optimize Workload&quot;</strong> to get started!
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </Sidebar>
    </ClientGuard>
  );
}

