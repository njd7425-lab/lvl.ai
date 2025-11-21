/**
 * Organizer Agent API Client
 * Frontend API client for the AI-powered task organizer agent
 */

import { apiClient } from '../client';
import { ApiResponse } from '@/lib/types';

// ---------- TYPES ----------

export type AIProvider = 'langchain' | 'openrouter';

export interface ChatRequest {
  message: string;
  temperature?: number;
  maxTokens?: number;
  provider?: AIProvider;
}

export interface ChatResponse {
  success: boolean;
  response: string;
  metadata: {
    userId: string;
    timestamp: string;
    model: string;
  };
}

export interface OrganizationSuggestionsResponse {
  success: boolean;
  suggestions: string;
  metadata: {
    userId: string;
    timestamp: string;
    type: 'organization_suggestions';
  };
}

export interface DailyPlanResponse {
  success: boolean;
  plan: string;
  metadata: {
    userId: string;
    timestamp: string;
    type: 'daily_plan';
    date: string;
  };
}

export interface ProductivityAnalysisResponse {
  success: boolean;
  analysis: string;
  metadata: {
    userId: string;
    timestamp: string;
    type: 'productivity_analysis';
  };
}

export interface MotivationResponse {
  success: boolean;
  motivation: string;
  metadata: {
    userId: string;
    timestamp: string;
    type: 'motivation';
  };
}

export interface UserContext {
  userId: string;
  name: string;
  email: string;
  level: number;
  xp: number;
  totalTasksCompleted: number;
  preferences: {
    timezone: string;
    dailyGoalXP: number;
  };
}

export interface TaskContext {
  id: string;
  title: string;
  description?: string;
  priority: string;
  status: string;
  taskTime?: string;
  dueDate?: string;
  completedAt?: string;
  points: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  isOverdue?: boolean;
}

export interface ContextResponse {
  success: boolean;
  context: {
    user: UserContext;
    tasks: TaskContext[];
    stats: {
      totalTasks: number;
      pendingTasks: number;
      inProgressTasks: number;
      completedTasks: number;
      overdueTasks: number;
    };
  };
  formattedContext: string;
}

export interface ProviderTestResult {
  success: boolean;
  testResult: {
    provider: AIProvider;
    status: 'connected' | 'error';
    response?: string;
  };
  metadata: {
    timestamp: string;
    type: 'provider_test';
  };
}

export interface HealthCheckResponse {
  status: string;
  timestamp: string;
  service: string;
  model: string;
  providers: {
    langchain: boolean;
    openrouter: boolean;
  };
  features: string[];
}

// ---------- API FUNCTIONS ----------

/**
 * Chat with the organizer agent
 * @param request Chat request with message and optional parameters
 */
export async function chatWithOrganizer(request: ChatRequest): Promise<ChatResponse> {
  try {
    const response = await apiClient.client.post<ChatResponse>('/organizer/chat', request);
    return response.data;
  } catch (error: any) {
    console.error('Error chatting with organizer:', error);
    throw new Error(error.response?.data?.message || 'Failed to chat with organizer');
  }
}

/**
 * Get task organization suggestions
 */
export async function getOrganizationSuggestions(): Promise<OrganizationSuggestionsResponse> {
  try {
    const response = await apiClient.client.get<OrganizationSuggestionsResponse>('/organizer/suggestions');
    return response.data;
  } catch (error: any) {
    console.error('Error getting organization suggestions:', error);
    throw new Error(error.response?.data?.message || 'Failed to get organization suggestions');
  }
}

/**
 * Get daily task plan
 */
export async function getDailyTaskPlan(): Promise<DailyPlanResponse> {
  try {
    const response = await apiClient.client.get<DailyPlanResponse>('/organizer/daily-plan');
    return response.data;
  } catch (error: any) {
    console.error('Error getting daily task plan:', error);
    throw new Error(error.response?.data?.message || 'Failed to get daily task plan');
  }
}

/**
 * Get productivity analysis
 */
export async function getProductivityAnalysis(): Promise<ProductivityAnalysisResponse> {
  try {
    const response = await apiClient.client.get<ProductivityAnalysisResponse>('/organizer/productivity-analysis');
    return response.data;
  } catch (error: any) {
    console.error('Error getting productivity analysis:', error);
    throw new Error(error.response?.data?.message || 'Failed to get productivity analysis');
  }
}

/**
 * Get motivational message
 */
export async function getMotivation(): Promise<MotivationResponse> {
  try {
    const response = await apiClient.client.get<MotivationResponse>('/organizer/motivation');
    return response.data;
  } catch (error: any) {
    console.error('Error getting motivation:', error);
    throw new Error(error.response?.data?.message || 'Failed to get motivation');
  }
}

/**
 * Get user context (for debugging/testing)
 */
export async function getUserContext(): Promise<ContextResponse> {
  try {
    const response = await apiClient.client.get<ContextResponse>('/organizer/context');
    return response.data;
  } catch (error: any) {
    console.error('Error getting user context:', error);
    throw new Error(error.response?.data?.message || 'Failed to get user context');
  }
}

/**
 * Test AI provider connectivity
 * @param provider Optional provider to test ('langchain' or 'openrouter')
 */
export async function testAIProvider(provider?: AIProvider): Promise<ProviderTestResult> {
  try {
    const url = provider ? `/organizer/test-provider?provider=${provider}` : '/organizer/test-provider';
    const response = await apiClient.client.get<ProviderTestResult>(url);
    return response.data;
  } catch (error: any) {
    console.error('Error testing AI provider:', error);
    throw new Error(error.response?.data?.message || 'Failed to test AI provider');
  }
}

/**
 * Check organizer agent health (public endpoint)
 */
export async function checkHealth(): Promise<HealthCheckResponse> {
  try {
    const response = await apiClient.client.get<HealthCheckResponse>('/organizer/health');
    return response.data;
  } catch (error: any) {
    console.error('Error checking health:', error);
    throw new Error(error.response?.data?.message || 'Failed to check health');
  }
}

// ---------- NEW FEATURES ----------

/**
 * Task Recommendation
 */
export interface TaskRecommendation {
  taskId: string;
  taskTitle: string;
  currentDueDate?: string | null;
  suggestedDueDate?: string | null;
  currentPriority: string;
  suggestedPriority?: string;
  reason: string;
}

/**
 * Workload Optimization Response
 */
export interface WorkloadOptimizationResponse {
  success: boolean;
  analysis: string;
  recommendations: TaskRecommendation[];
  summary: string;
  metadata: {
    userId: string;
    timestamp: string;
    type: 'workload_optimization';
    days: number;
  };
}

/**
 * Apply Workload Optimization Response
 */
export interface ApplyWorkloadOptimizationResponse {
  success: boolean;
  updatedTasks?: string[];
  details?: string[];
  message: string;
}

/**
 * Task Breakdown Response
 */
export interface TaskBreakdownResponse {
  success: boolean;
  breakdown: string;
  metadata: {
    userId: string;
    timestamp: string;
    type: 'task_breakdown';
  };
}

/**
 * Optimize workload distribution (High Impact)
 * @param days Number of days to optimize for (default: 7)
 * @param maxTasks Maximum number of tasks to analyze (default: 15)
 */
export async function optimizeWorkload(days: number = 7, maxTasks: number = 15): Promise<WorkloadOptimizationResponse> {
  try {
    const response = await apiClient.client.get<WorkloadOptimizationResponse>(
      `/organizer/workload-optimization?days=${days}&maxTasks=${maxTasks}`,
      {
        timeout: 35000, // 35 second timeout
      }
    );
    return response.data;
  } catch (error: any) {
    console.error('Error optimizing workload:', error);
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      throw new Error('Request timed out. Try reducing the number of days or tasks.');
    }
    throw new Error(error.response?.data?.message || 'Failed to optimize workload');
  }
}

/**
 * Apply workload optimization changes
 * @param recommendations Array of task recommendations to apply
 */
export async function applyWorkloadOptimization(recommendations: TaskRecommendation[]): Promise<ApplyWorkloadOptimizationResponse> {
  try {
    const response = await apiClient.client.post<ApplyWorkloadOptimizationResponse>(
      '/organizer/apply-workload-optimization',
      { recommendations }
    );
    return response.data;
  } catch (error: any) {
    console.error('Error applying workload optimization:', error);
    throw new Error(error.response?.data?.message || 'Failed to apply workload optimization');
  }
}

/**
 * Break down a task into subtasks (Low Impact)
 * @param taskDescription The task to break down
 */
export async function breakdownTask(taskDescription: string): Promise<TaskBreakdownResponse> {
  try {
    const response = await apiClient.client.post<TaskBreakdownResponse>(
      '/organizer/breakdown-task',
      { taskDescription }
    );
    return response.data;
  } catch (error: any) {
    console.error('Error breaking down task:', error);
    throw new Error(error.response?.data?.message || 'Failed to break down task');
  }
}

// ---------- CONVENIENCE FUNCTIONS ----------

/**
 * Ask a quick question to the organizer
 * @param message The question to ask
 */
export async function askOrganizer(message: string): Promise<string> {
  const response = await chatWithOrganizer({ message });
  return response.response;
}

/**
 * Get suggestions with custom provider
 * @param provider Optional provider to use
 */
export async function getSuggestionsWithProvider(provider?: AIProvider): Promise<string> {
  // Since the suggestions endpoint doesn't accept provider directly,
  // we can use chat with a suggestion prompt
  if (provider) {
    const response = await chatWithOrganizer({
      message: `Analyze my current tasks and provide specific suggestions on how I should organize and prioritize them. Consider:
1. What tasks should I focus on today?
2. Are there any overdue tasks that need immediate attention?
3. How should I group or sequence my tasks?
4. Any tasks that could be broken down into smaller steps?`,
      temperature: 0.6,
      provider,
    });
    return response.response;
  }
  
  const response = await getOrganizationSuggestions();
  return response.suggestions;
}

/**
 * Check if AI provider is available
 */
export async function isProviderAvailable(provider: AIProvider): Promise<boolean> {
  try {
    const result = await testAIProvider(provider);
    return result.testResult.status === 'connected';
  } catch (error) {
    return false;
  }
}

/**
 * Get available providers
 */
export async function getAvailableProviders(): Promise<AIProvider[]> {
  try {
    const health = await checkHealth();
    const providers: AIProvider[] = [];
    
    if (health.providers.langchain) {
      providers.push('langchain');
    }
    if (health.providers.openrouter) {
      providers.push('openrouter');
    }
    
    return providers;
  } catch (error) {
    console.error('Error getting available providers:', error);
    return [];
  }
}

// ---------- EXPORTS ----------

export const organizerAgentAPI = {
  // Core functions
  chatWithOrganizer,
  getOrganizationSuggestions,
  getDailyTaskPlan,
  getProductivityAnalysis,
  getMotivation,
  optimizeWorkload,
  applyWorkloadOptimization,
  breakdownTask,
  getUserContext,
  testAIProvider,
  checkHealth,
  
  // Convenience functions
  askOrganizer,
  getSuggestionsWithProvider,
  isProviderAvailable,
  getAvailableProviders,
};

export default organizerAgentAPI;

