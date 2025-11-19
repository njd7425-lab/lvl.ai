import { env } from "../../config/env";
import User from "../../models/User";
import Task, { TaskStatus, TaskPriority } from "../../models/Task";
import mongoose from "mongoose";

// Import AI providers
import { askLVLBot, generateTaskSuggestions, analyzeTask, generateMotivationalMessage } from "../langchain";

// ---------- CONFIGURATION ----------
export type AIProvider = 'langchain' | 'openrouter';

// Determine which AI provider to use based on available API keys
export function getPreferredAIProvider(): AIProvider {
  if (env.DEEPSEEK_API_KEY) {
    return 'langchain'; // Direct DeepSeek API via LangChain
  } else if (env.OPENROUTER_API_KEY) {
    return 'openrouter'; // DeepSeek via OpenRouter
  } else {
    throw new Error('No AI provider configured. Please set either DEEPSEEK_API_KEY or OPENROUTER_API_KEY');
  }
}

// ---------- TYPES ----------
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
  priority: TaskPriority;
  status: TaskStatus;
  taskTime?: Date;
  dueDate?: Date;
  completedAt?: Date;
  points: number;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  isOverdue?: boolean;
}

export interface RetrievedContext {
  user: UserContext;
  tasks: TaskContext[];
  stats: {
    totalTasks: number;
    pendingTasks: number;
    inProgressTasks: number;
    completedTasks: number;
    overdueTasks: number;
  };
}

// ---------- AI PROVIDER FUNCTIONS ----------

/**
 * Enhanced OpenRouter function for organizer agent
 */
async function callOpenRouterWithContext(systemPrompt: string, userMessage: string, options?: { temperature?: number; maxTokens?: number }): Promise<string> {
  try {
    // Import OpenAI dynamically to avoid issues if not configured
    const OpenAI = (await import("openai")).default;
    
    const client = new OpenAI({
      apiKey: env.OPENROUTER_API_KEY,
      baseURL: "https://openrouter.ai/api/v1",
    });

    const response = await client.chat.completions.create({
      model: "deepseek/deepseek-chat",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userMessage,
        },
      ],
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 1000,
    });

    const aiResponse = response.choices[0]?.message?.content;
    
    if (!aiResponse) {
      throw new Error("No response from OpenRouter AI model");
    }

    return aiResponse;
  } catch (error) {
    console.error("Error calling OpenRouter:", error);
    throw error;
  }
}

// ---------- DATA RETRIEVAL FUNCTIONS ----------

/**
 * Retrieve user data from database
 */
export async function retrieveUserData(userId: string): Promise<UserContext | null> {
  try {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error("Invalid user ID format");
    }

    const user = await User.findById(userId).select('-password -emailVerificationToken -passwordResetToken');
    
    if (!user) {
      return null;
    }

    return {
      userId: (user._id as mongoose.Types.ObjectId).toString(),
      name: user.name,
      email: user.email,
      level: user.level,
      xp: user.xp,
      totalTasksCompleted: user.totalTasksCompleted,
      preferences: {
        timezone: user.preferences.timezone,
        dailyGoalXP: user.preferences.dailyGoalXP,
      },
    };
  } catch (error) {
    console.error("Error retrieving user data:", error);
    throw error;
  }
}

/**
 * Retrieve all tasks for a user
 */
export async function retrieveUserTasks(userId: string): Promise<TaskContext[]> {
  try {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error("Invalid user ID format");
    }

    const tasks = await Task.find({ userId }).sort({ createdAt: -1 });

    return tasks.map(task => {
      const isOverdue = task.dueDate && task.dueDate < new Date() && task.status !== TaskStatus.COMPLETED;
      
      const taskContext: TaskContext = {
        id: (task._id as mongoose.Types.ObjectId).toString(),
        title: task.title,
        priority: task.priority,
        status: task.status,
        points: task.points,
        tags: task.tags,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
      };

      // Add optional properties only if they exist
      if (task.description !== undefined) {
        taskContext.description = task.description;
      }
      if (task.taskTime !== undefined) {
        taskContext.taskTime = task.taskTime;
      }
      if (task.dueDate !== undefined) {
        taskContext.dueDate = task.dueDate;
      }
      if (task.completedAt !== undefined) {
        taskContext.completedAt = task.completedAt;
      }
      if (isOverdue !== undefined) {
        taskContext.isOverdue = isOverdue;
      }

      return taskContext;
    });
  } catch (error) {
    console.error("Error retrieving user tasks:", error);
    throw error;
  }
}

/**
 * Retrieve complete context for RAG (user + tasks + stats)
 */
export async function retrieveCompleteContext(userId: string): Promise<RetrievedContext> {
  try {
    const [user, tasks] = await Promise.all([
      retrieveUserData(userId),
      retrieveUserTasks(userId),
    ]);

    if (!user) {
      throw new Error("User not found");
    }

    // Calculate statistics
    const stats = {
      totalTasks: tasks.length,
      pendingTasks: tasks.filter(t => t.status === TaskStatus.PENDING).length,
      inProgressTasks: tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length,
      completedTasks: tasks.filter(t => t.status === TaskStatus.COMPLETED).length,
      overdueTasks: tasks.filter(t => t.isOverdue).length,
    };

    return {
      user,
      tasks,
      stats,
    };
  } catch (error) {
    console.error("Error retrieving complete context:", error);
    throw error;
  }
}

// ---------- CONTEXT FORMATTING ----------

/**
 * Format retrieved context into a readable prompt for the AI
 */
export function formatContextForPrompt(context: RetrievedContext): string {
  const { user, tasks, stats } = context;

  let prompt = `# USER PROFILE\n`;
  prompt += `Name: ${user.name}\n`;
  prompt += `Level: ${user.level} | XP: ${user.xp}\n`;
  prompt += `Completed Tasks: ${user.totalTasksCompleted}\n`;
  prompt += `Daily Goal: ${user.preferences.dailyGoalXP} XP\n`;
  prompt += `Timezone: ${user.preferences.timezone}\n\n`;

  prompt += `# TASK STATISTICS\n`;
  prompt += `Total Tasks: ${stats.totalTasks}\n`;
  prompt += `Pending: ${stats.pendingTasks} | In Progress: ${stats.inProgressTasks}\n`;
  prompt += `Completed: ${stats.completedTasks} | Overdue: ${stats.overdueTasks}\n\n`;

  prompt += `# TASK LIST\n`;
  
  if (tasks.length === 0) {
    prompt += `No tasks found.\n`;
  } else {
    // Group tasks by status
    const pendingTasks = tasks.filter(t => t.status === TaskStatus.PENDING);
    const inProgressTasks = tasks.filter(t => t.status === TaskStatus.IN_PROGRESS);
    const completedTasks = tasks.filter(t => t.status === TaskStatus.COMPLETED);

    if (pendingTasks.length > 0) {
      prompt += `## PENDING TASKS (${pendingTasks.length})\n`;
      pendingTasks.forEach((task, idx) => {
        prompt += formatTask(task, idx + 1);
      });
      prompt += `\n`;
    }

    if (inProgressTasks.length > 0) {
      prompt += `## IN PROGRESS TASKS (${inProgressTasks.length})\n`;
      inProgressTasks.forEach((task, idx) => {
        prompt += formatTask(task, idx + 1);
      });
      prompt += `\n`;
    }

    if (completedTasks.length > 0) {
      prompt += `## COMPLETED TASKS (${completedTasks.length})\n`;
      completedTasks.slice(0, 10).forEach((task, idx) => {
        prompt += formatTask(task, idx + 1);
      });
      if (completedTasks.length > 10) {
        prompt += `... and ${completedTasks.length - 10} more completed tasks\n`;
      }
      prompt += `\n`;
    }
  }

  return prompt;
}

/**
 * Format a single task for the prompt
 */
function formatTask(task: TaskContext, index: number): string {
  let taskStr = `${index}. [${task.priority.toUpperCase()}] ${task.title}\n`;
  
  if (task.description) {
    taskStr += `   Description: ${task.description}\n`;
  }
  
  if (task.dueDate) {
    const dueStr = task.dueDate.toISOString().split('T')[0];
    taskStr += `   Due: ${dueStr}`;
    if (task.isOverdue) {
      taskStr += ` ⚠️ OVERDUE`;
    }
    taskStr += `\n`;
  }
  
  if (task.tags && task.tags.length > 0) {
    taskStr += `   Tags: ${task.tags.join(', ')}\n`;
  }
  
  taskStr += `   Points: ${task.points} XP\n`;
  
  return taskStr;
}

// ---------- AI INTERACTION ----------

/**
 * Chat with the organizer agent using retrieved context
 */
export async function chatWithOrganizer(
  userId: string,
  userMessage: string,
  options?: {
    temperature?: number;
    maxTokens?: number;
    provider?: AIProvider; // Allow override of provider selection
  }
): Promise<string> {
  try {
    // 1. Retrieve context
    console.log(`Retrieving context for user: ${userId}`);
    const context = await retrieveCompleteContext(userId);
    
    // 2. Format context
    const contextPrompt = formatContextForPrompt(context);
    
    // 3. Build system prompt
    const systemPrompt = `You are an intelligent task organization assistant for LVL.AI, a gamified task management platform.

You have access to the user's complete profile and task data. Use this information to provide personalized, actionable advice on task organization, prioritization, and productivity.

CAPABILITIES:
- Analyze task lists and identify patterns
- Suggest task prioritization strategies
- Recommend task breakdown for complex items
- Identify overdue tasks and suggest recovery plans
- Provide time management insights
- Suggest task groupings by tags/categories
- Motivate users based on their progress

GUIDELINES:
- Be specific and reference actual tasks when relevant
- Consider the user's level, XP, and goals
- Acknowledge overdue tasks with empathy
- Suggest realistic, achievable action plans
- Use the gamification elements (XP, levels) for motivation
- Keep responses concise but informative

CONTEXT:
${contextPrompt}`;

    // 4. Determine AI provider
    const provider = options?.provider || getPreferredAIProvider();
    console.log(`Using AI provider: ${provider}`);

    // 5. Call appropriate AI provider
    let aiResponse: string;
    
    if (provider === 'langchain') {
      // Use LangChain with direct DeepSeek API
      const langchainOptions: { temperature?: number } = {};
      if (options?.temperature !== undefined) {
        langchainOptions.temperature = options.temperature;
      }
      aiResponse = await askLVLBot(systemPrompt, userMessage, langchainOptions);
    } else {
      // Use OpenRouter with DeepSeek model
      const openrouterOptions: { temperature?: number; maxTokens?: number } = {};
      if (options?.temperature !== undefined) {
        openrouterOptions.temperature = options.temperature;
      }
      if (options?.maxTokens !== undefined) {
        openrouterOptions.maxTokens = options.maxTokens;
      }
      aiResponse = await callOpenRouterWithContext(systemPrompt, userMessage, openrouterOptions);
    }

    console.log(`Response received successfully from ${provider}`);
    return aiResponse;
  } catch (error) {
    console.error("Error in chatWithOrganizer:", error);
    throw error;
  }
}

/**
 * Get task organization suggestions
 */
export async function getOrganizationSuggestions(userId: string, options?: { provider?: AIProvider }): Promise<string> {
  const prompt = `Analyze my current tasks and provide specific suggestions on how I should organize and prioritize them. Consider:
1. What tasks should I focus on today?
2. Are there any overdue tasks that need immediate attention?
3. How should I group or sequence my tasks?
4. Any tasks that could be broken down into smaller steps?`;

  return chatWithOrganizer(userId, prompt, { 
    temperature: 0.6,
    ...(options?.provider && { provider: options.provider })
  });
}

/**
 * Get daily task plan
 */
export async function getDailyTaskPlan(userId: string, options?: { provider?: AIProvider }): Promise<string> {
  const prompt = `Create a daily task plan for me. Based on my current tasks, XP goals, and priorities, suggest which tasks I should focus on today and in what order.`;

  return chatWithOrganizer(userId, prompt, { 
    temperature: 0.6,
    ...(options?.provider && { provider: options.provider })
  });
}

/**
 * Analyze productivity patterns
 */
export async function analyzeProductivity(userId: string, options?: { provider?: AIProvider }): Promise<string> {
  const prompt = `Analyze my task completion patterns and productivity. What insights can you provide about my task management habits? What areas could I improve?`;

  return chatWithOrganizer(userId, prompt, { 
    temperature: 0.7,
    ...(options?.provider && { provider: options.provider })
  });
}

/**
 * Get motivation and encouragement
 */
export async function getMotivation(userId: string, options?: { provider?: AIProvider }): Promise<string> {
  const prompt = `Based on my current progress and tasks, give me some motivation and encouragement to stay productive!`;

  return chatWithOrganizer(userId, prompt, { 
    temperature: 0.8,
    ...(options?.provider && { provider: options.provider })
  });
}

/**
 * Task recommendation interface
 */
export interface TaskRecommendation {
  taskId: string;
  taskTitle: string;
  currentDueDate?: Date | null;
  suggestedDueDate?: Date | null;
  currentPriority: string;
  suggestedPriority?: string;
  reason: string;
}

/**
 * Workload optimization result
 */
export interface WorkloadOptimizationResult {
  analysis: string;
  recommendations: TaskRecommendation[];
  summary: string;
}

/**
 * Optimize workload distribution
 * High Impact: Analyzes current workload and suggests optimal task distribution
 */
export async function optimizeWorkload(userId: string, options?: { provider?: AIProvider; days?: number; maxTasks?: number }): Promise<WorkloadOptimizationResult> {
  const days = options?.days || 7; // Default to 7 days
  const maxTasks = options?.maxTasks || 15; // Limit to 15 tasks max to prevent timeout
  
  // Get user tasks for context
  const tasks = await retrieveUserTasks(userId);
  let pendingTasks = tasks.filter(t => t.status === TaskStatus.PENDING || t.status === TaskStatus.IN_PROGRESS);
  
  // Sort by priority and due date, then limit
  pendingTasks = pendingTasks
    .sort((a, b) => {
      // Sort by priority first (urgent > high > medium > low)
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      const priorityDiff = (priorityOrder[b.priority as keyof typeof priorityOrder] || 0) - 
                           (priorityOrder[a.priority as keyof typeof priorityOrder] || 0);
      if (priorityDiff !== 0) return priorityDiff;
      
      // Then by due date (earliest first)
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return 0;
    })
    .slice(0, maxTasks); // Limit to maxTasks
  
  const taskList = pendingTasks.map((task, idx) => {
    const dueDateStr = task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : 'No due date';
    const taskId = String(task.id);
    return `${idx + 1}. [ID: ${taskId}] "${task.title}" - Priority: ${task.priority}, Due: ${dueDateStr}`;
  }).join('\n');
  
  if (pendingTasks.length === 0) {
    return {
      analysis: 'No pending tasks found to optimize.',
      recommendations: [],
      summary: '',
    };
  }

  const prompt = `Analyze these ${pendingTasks.length} tasks and redistribute them to balance workload over the next ${days} days.

TASKS:
${taskList}

You MUST respond with ONLY this JSON format (no other text):
{
  "recommendations": [
    {
      "taskId": "exact_id_from_list",
      "taskTitle": "exact title",
      "currentDueDate": "YYYY-MM-DD or null",
      "suggestedDueDate": "YYYY-MM-DD",
      "currentPriority": "low/medium/high/urgent",
      "suggestedPriority": "low/medium/high/urgent",
      "reason": "reason"
    }
  ]
}

CRITICAL RULES:
- Find tasks on overloaded days (5+ tasks) and move some to lighter days (1-2 tasks)
- Schedule tasks with "No due date" to balance workload
- Prioritize overdue tasks (negative days)
- Suggested dates must be YYYY-MM-DD format within next ${days} days
- Include at least 5-10 recommendations if there are imbalances
- Return ONLY the JSON, no markdown, no code blocks, no explanations`;

  const aiResponse = await chatWithOrganizer(userId, prompt, { 
    temperature: 0.2, // Lower temperature for more structured output
    maxTokens: 2000, // Reduced tokens to prevent timeout
    ...(options?.provider && { provider: options.provider })
  });

  // Try to extract JSON from the response
  let recommendations: TaskRecommendation[] = [];
  let analysis = aiResponse;
  let summary = '';

  try {
    console.log('AI Response length:', aiResponse.length);
    console.log('AI Response preview:', aiResponse.substring(0, 500));
    
    // Try to find JSON in the response (more flexible patterns)
    let jsonString = '';
    let jsonMatch = null;
    
    // Pattern 1: Look for JSON wrapped in code blocks
    const codeBlockPattern = /```(?:json)?\s*(\{[\s\S]*?\})\s*```/;
    const codeBlockMatch = aiResponse.match(codeBlockPattern);
    if (codeBlockMatch && codeBlockMatch[1]) {
      jsonString = codeBlockMatch[1];
      jsonMatch = codeBlockMatch[0];
    }
    
    // Pattern 2: Look for JSON object starting with { and containing "recommendations"
    if (!jsonString) {
      const jsonObjectPattern = /\{[\s\S]*?"recommendations"[\s\S]*?\}/;
      const jsonObjectMatch = aiResponse.match(jsonObjectPattern);
      if (jsonObjectMatch) {
        jsonString = jsonObjectMatch[0];
        jsonMatch = jsonObjectMatch[0];
      }
    }
    
    // Pattern 3: Try to find any JSON object
    if (!jsonString) {
      const anyJsonPattern = /\{[\s\S]*\}/;
      const anyJsonMatch = aiResponse.match(anyJsonPattern);
      if (anyJsonMatch) {
        jsonString = anyJsonMatch[0];
        jsonMatch = anyJsonMatch[0];
      }
    }

    if (jsonString) {
      // Clean up the JSON string
      jsonString = jsonString.trim();
      // Remove any markdown code block markers
      jsonString = jsonString.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
      
      console.log('Extracted JSON string length:', jsonString.length);
      console.log('Extracted JSON preview:', jsonString.substring(0, 300));

      const jsonData = JSON.parse(jsonString);
      if (jsonData.recommendations && Array.isArray(jsonData.recommendations)) {
        console.log(`Found ${jsonData.recommendations.length} recommendations in JSON`);
        
        // Map recommendations and validate task IDs exist
        const validTaskIds = new Set(pendingTasks.map(t => String(t.id)));
        console.log(`Valid task IDs: ${Array.from(validTaskIds).slice(0, 5).join(', ')}...`);

        recommendations = jsonData.recommendations
          .filter((rec: any) => {
            const taskId = String(rec.taskId || '');
            const isValid = validTaskIds.has(taskId);
            if (!isValid) {
              console.warn(`Invalid task ID in recommendation: ${taskId}. Valid IDs: ${Array.from(validTaskIds).slice(0, 3).join(', ')}...`);
            }
            return isValid;
          })
          .map((rec: any) => {
            // Find the original task to get current values
            const originalTask = pendingTasks.find(t => String(t.id) === String(rec.taskId));

            if (!originalTask) {
              console.warn(`Original task not found for ID: ${rec.taskId}`);
              return null;
            }

            // Parse dates
            let currentDueDate: Date | null = null;
            let suggestedDueDate: Date | null = null;
            
            if (originalTask.dueDate) {
              currentDueDate = originalTask.dueDate instanceof Date ? originalTask.dueDate : new Date(originalTask.dueDate);
            }
            
            if (rec.suggestedDueDate) {
              try {
                suggestedDueDate = new Date(rec.suggestedDueDate);
                if (isNaN(suggestedDueDate.getTime())) {
                  console.warn(`Invalid suggested date: ${rec.suggestedDueDate}`);
                  suggestedDueDate = null;
                }
              } catch (e) {
                console.warn(`Error parsing suggested date: ${rec.suggestedDueDate}`, e);
                suggestedDueDate = null;
              }
            }
            
            // Normalize dates for comparison (YYYY-MM-DD)
            const currentDateStr = currentDueDate ? currentDueDate.toISOString().split('T')[0] : null;
            const suggestedDateStr = suggestedDueDate ? suggestedDueDate.toISOString().split('T')[0] : null;
            const hasDateChange = currentDateStr !== suggestedDateStr;
            
            const hasPriorityChange = rec.suggestedPriority && 
                                     String(rec.currentPriority || originalTask.priority).toLowerCase() !== 
                                     String(rec.suggestedPriority).toLowerCase();
            
            // Include if there's any change
            if (!hasDateChange && !hasPriorityChange) {
              console.log(`Skipping task ${rec.taskId} - no changes detected`);
              return null;
            }

            return {
              taskId: String(rec.taskId || originalTask.id),
              taskTitle: rec.taskTitle || originalTask.title || '',
              currentDueDate: currentDueDate,
              suggestedDueDate: suggestedDueDate,
              currentPriority: String(rec.currentPriority || originalTask.priority || 'medium'),
              suggestedPriority: rec.suggestedPriority ? String(rec.suggestedPriority) : undefined,
              reason: rec.reason || 'Balance workload distribution',
            };
          })
          .filter((rec: any) => rec !== null); // Remove null entries
        
        console.log(`After filtering: ${recommendations.length} valid recommendations`);

        // Extract analysis and summary (text before and after JSON)
        if (jsonMatch && jsonMatch[0]) {
          const parts = aiResponse.split(jsonMatch[0]);
          analysis = parts[0]?.trim() || '';
          summary = parts[1]?.trim() || '';
        }
      } else {
        console.warn('JSON data does not contain recommendations array');
      }
    } else {
      console.warn('No JSON found in AI response');
      console.warn('Response:', aiResponse.substring(0, 500));
    }
  } catch (parseError) {
    console.error('Error parsing AI response for recommendations:', parseError);
    console.error('AI Response that failed to parse:', aiResponse.substring(0, 500));
    // If parsing fails, return the full response as analysis
    analysis = aiResponse;
    recommendations = [];
  }

  console.log(`Optimization complete: ${recommendations.length} recommendations found`);

  return {
    analysis,
    recommendations,
    summary,
  };
}

/**
 * Quick task breakdown (Low Impact)
 * Breaks down a task into smaller subtasks
 */
export async function breakdownTask(userId: string, taskDescription: string, options?: { provider?: AIProvider }): Promise<string> {
  const prompt = `Break down the following task into smaller, actionable subtasks. Make each subtask specific, measurable, and achievable:

Task: "${taskDescription}"

Provide:
1. A list of 3-7 subtasks that logically break down the main task
2. A suggested order for completing these subtasks
3. Estimated effort/complexity for each subtask (low/medium/high)
4. Any dependencies between subtasks

Format the response as a clear, numbered list that I can use to create individual tasks.`;

  return chatWithOrganizer(userId, prompt, { 
    temperature: 0.6,
    ...(options?.provider && { provider: options.provider })
  });
}

// ---------- ENHANCED FUNCTIONS USING EXISTING LANGCHAIN CAPABILITIES ----------

/**
 * Generate task suggestions for a specific goal (using existing LangChain function)
 */
export async function generateTaskSuggestionsForGoal(userInput: string, options?: { temperature?: number }): Promise<string> {
  try {
    return await generateTaskSuggestions(userInput, options);
  } catch (error) {
    console.error("Error generating task suggestions:", error);
    throw error;
  }
}

/**
 * Analyze a specific task (using existing LangChain function)
 */
export async function analyzeSpecificTask(taskDescription: string, options?: { temperature?: number }): Promise<string> {
  try {
    return await analyzeTask(taskDescription, options);
  } catch (error) {
    console.error("Error analyzing task:", error);
    throw error;
  }
}

/**
 * Generate motivational message for a specific task type (using existing LangChain function)
 */
export async function generateMotivationalMessageForTaskType(taskType: string, options?: { temperature?: number }): Promise<string> {
  try {
    return await generateMotivationalMessage(taskType, options);
  } catch (error) {
    console.error("Error generating motivational message:", error);
    throw error;
  }
}

/**
 * Test AI provider connectivity
 */
export async function testAIProvider(provider?: AIProvider): Promise<{ provider: AIProvider; status: string; response?: string }> {
  try {
    const selectedProvider = provider || getPreferredAIProvider();
    
    if (selectedProvider === 'langchain') {
      const response = await askLVLBot(
        "You are a helpful assistant.",
        "Say 'Hello from LangChain!' if you can hear me."
      );
      return {
        provider: 'langchain',
        status: 'connected',
        response
      };
    } else {
      const response = await callOpenRouterWithContext(
        "You are a helpful assistant.",
        "Say 'Hello from OpenRouter!' if you can hear me."
      );
      return {
        provider: 'openrouter',
        status: 'connected',
        response
      };
    }
  } catch (error) {
    console.error("Error testing AI provider:", error);
    return {
      provider: provider || getPreferredAIProvider(),
      status: 'error',
      response: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// ---------- EXPORTS ----------
export default {
  // Configuration
  getPreferredAIProvider,
  
  // Retrieval functions
  retrieveUserData,
  retrieveUserTasks,
  retrieveCompleteContext,
  
  // AI interaction (with provider selection)
  chatWithOrganizer,
  getOrganizationSuggestions,
  getDailyTaskPlan,
  analyzeProductivity,
  getMotivation,
  optimizeWorkload,
  breakdownTask,
  
  // Enhanced functions using existing LangChain capabilities
  generateTaskSuggestionsForGoal,
  analyzeSpecificTask,
  generateMotivationalMessageForTaskType,
  
  // Testing and utilities
  testAIProvider,
  formatContextForPrompt,
};

