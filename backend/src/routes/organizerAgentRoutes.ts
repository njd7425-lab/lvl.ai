import { Router, Request, Response } from 'express';
import organizerAgent from '../ai/agents/organizerAgent';
import authenticate from '../middleware/auth';
import { body, validationResult } from 'express-validator';
import Task from '@/models/Task';

const router = Router();

// Type for authenticated request
interface AuthenticatedRequest extends Request {
  user?: {
    _id: string;
    email: string;
    name: string;
  };
}

// ---------- VALIDATION MIDDLEWARE ----------

const chatValidation = [
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ max: 1000 })
    .withMessage('Message cannot exceed 1000 characters'),
];

// ---------- ROUTES ----------

/**
 * @route   POST /api/organizer/chat
 * @desc    Chat with the organizer agent
 * @access  Private
 */
router.post(
  '/chat',
  authenticate,
  chatValidation,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          errors: errors.array() 
        });
      }

      const userId = req.user?._id;
      const { message, temperature, maxTokens, provider } = req.body;

      if (!userId) {
        return res.status(401).json({ 
          success: false, 
          message: 'User not authenticated' 
        });
      }

      // Chat with organizer
      const options: { temperature?: number; maxTokens?: number; provider?: any } = {};
      if (temperature) options.temperature = parseFloat(temperature);
      if (maxTokens) options.maxTokens = parseInt(maxTokens);
      if (provider) options.provider = provider;
      
      const response = await organizerAgent.chatWithOrganizer(
        userId,
        message,
        Object.keys(options).length > 0 ? options : undefined
      );

      return res.json({
        success: true,
        response,
        metadata: {
          userId,
          timestamp: new Date(),
          model: 'deepseek/deepseek-chat',
        },
      });
    } catch (error) {
      console.error('Organizer chat error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get response from organizer',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * @route   GET /api/organizer/suggestions
 * @desc    Get task organization suggestions
 * @access  Private
 */
router.get(
  '/suggestions',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?._id;

      if (!userId) {
        return res.status(401).json({ 
          success: false, 
          message: 'User not authenticated' 
        });
      }

      const suggestions = await organizerAgent.getOrganizationSuggestions(userId);

      return res.json({
        success: true,
        suggestions,
        metadata: {
          userId,
          timestamp: new Date(),
          type: 'organization_suggestions',
        },
      });
    } catch (error) {
      console.error('Error getting suggestions:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get organization suggestions',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * @route   GET /api/organizer/daily-plan
 * @desc    Get daily task plan
 * @access  Private
 */
router.get(
  '/daily-plan',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?._id;

      if (!userId) {
        return res.status(401).json({ 
          success: false, 
          message: 'User not authenticated' 
        });
      }

      const plan = await organizerAgent.getDailyTaskPlan(userId);

      return res.json({
        success: true,
        plan,
        metadata: {
          userId,
          timestamp: new Date(),
          type: 'daily_plan',
          date: new Date().toISOString().split('T')[0],
        },
      });
    } catch (error) {
      console.error('Error getting daily plan:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get daily plan',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * @route   GET /api/organizer/productivity-analysis
 * @desc    Analyze productivity patterns
 * @access  Private
 */
router.get(
  '/productivity-analysis',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?._id;

      if (!userId) {
        return res.status(401).json({ 
          success: false, 
          message: 'User not authenticated' 
        });
      }

      const analysis = await organizerAgent.analyzeProductivity(userId);

      return res.json({
        success: true,
        analysis,
        metadata: {
          userId,
          timestamp: new Date(),
          type: 'productivity_analysis',
        },
      });
    } catch (error) {
      console.error('Error analyzing productivity:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to analyze productivity',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * @route   GET /api/organizer/motivation
 * @desc    Get motivational message
 * @access  Private
 */
router.get(
  '/motivation',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?._id;

      if (!userId) {
        return res.status(401).json({ 
          success: false, 
          message: 'User not authenticated' 
        });
      }

      const motivation = await organizerAgent.getMotivation(userId);

      return res.json({
        success: true,
        motivation,
        metadata: {
          userId,
          timestamp: new Date(),
          type: 'motivation',
        },
      });
    } catch (error) {
      console.error('Error getting motivation:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get motivation',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * @route   GET /api/organizer/context
 * @desc    Get user context (for debugging/testing)
 * @access  Private
 */
router.get(
  '/context',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?._id;

      if (!userId) {
        return res.status(401).json({ 
          success: false, 
          message: 'User not authenticated' 
        });
      }

      const context = await organizerAgent.retrieveCompleteContext(userId);

      return res.json({
        success: true,
        context,
        formattedContext: organizerAgent.formatContextForPrompt(context),
      });
    } catch (error) {
      console.error('Error getting context:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get context',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * @route   GET /api/organizer/test-provider
 * @desc    Test AI provider connectivity
 * @access  Private
 */
router.get(
  '/test-provider',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { provider } = req.query;
      
      const testResult = await organizerAgent.testAIProvider(provider as any);
      
      return res.json({
        success: true,
        testResult,
        metadata: {
          timestamp: new Date(),
          type: 'provider_test',
        },
      });
    } catch (error) {
      console.error('Error testing provider:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to test AI provider',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * @route   GET /api/organizer/workload-optimization
 * @desc    Optimize workload distribution
 * @access  Private
 */
router.get(
  '/workload-optimization',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?._id;
      const days = req.query['days'] ? parseInt(req.query['days'] as string) : 7;
      const maxTasks = req.query['maxTasks'] ? parseInt(req.query['maxTasks'] as string) : 15;

      if (!userId) {
        return res.status(401).json({ 
          success: false, 
          message: 'User not authenticated' 
        });
      }

      // Set timeout for the optimization (30 seconds)
      const optimizationPromise = organizerAgent.optimizeWorkload(userId, { days, maxTasks });
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Optimization timeout: Process took too long')), 30000)
      );

      const optimization = await Promise.race([optimizationPromise, timeoutPromise]) as Awaited<ReturnType<typeof organizerAgent.optimizeWorkload>>;

      return res.json({
        success: true,
        analysis: optimization.analysis,
        recommendations: optimization.recommendations,
        summary: optimization.summary,
        metadata: {
          userId: userId,
          timestamp: new Date(),
          type: 'workload_optimization',
          days: days,
          maxTasks: maxTasks,
        },
      });
    } catch (error) {
      console.error('Error optimizing workload:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorDetails = error instanceof Error && error.stack ? error.stack : undefined;
      
      // Log full error for debugging
      console.error('Full error details:', {
        message: errorMessage,
        stack: errorDetails,
        userId: req.user?._id,
        days: req.query['days'] ? parseInt(req.query['days'] as string) : 7,
      });
      
      return res.status(500).json({
        success: false,
        message: 'Failed to optimize workload',
        error: errorMessage,
        ...(process.env['NODE_ENV'] === 'development' && { details: errorDetails }),
      });
    }
  }
);

/**
 * @route   POST /api/organizer/apply-workload-optimization
 * @desc    Apply workload optimization changes to tasks
 * @access  Private
 */
router.post(
  '/apply-workload-optimization',
  authenticate,
  [
    body('recommendations').isArray().withMessage('Recommendations must be an array'),
    body('recommendations.*.taskId').notEmpty().withMessage('Task ID is required'),
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          errors: errors.array() 
        });
      }

      const userId = req.user?._id;
      const { recommendations } = req.body;

      if (!userId) {
        return res.status(401).json({ 
          success: false, 
          message: 'User not authenticated' 
        });
      }

      const updatedTasks = [];
      const errors_list: string[] = [];

      // Apply each recommendation
      for (const rec of recommendations) {
        try {
          const task = await Task.findOne({
            _id: rec.taskId,
            userId: userId
          });

          if (!task) {
            errors_list.push(`Task ${rec.taskId} not found`);
            continue;
          }

          const updateData: any = {};
          
          if (rec.suggestedDueDate) {
            updateData.dueDate = new Date(rec.suggestedDueDate);
          }
          
          if (rec.suggestedPriority) {
            updateData.priority = rec.suggestedPriority;
          }

          if (Object.keys(updateData).length > 0) {
            const updatedTask = await Task.findByIdAndUpdate(
              rec.taskId,
              updateData,
              { new: true }
            );
            updatedTasks.push(updatedTask);
          }
        } catch (taskError) {
          errors_list.push(`Failed to update task ${rec.taskId}: ${taskError instanceof Error ? taskError.message : 'Unknown error'}`);
        }
      }

      return res.json({
        success: true,
        updated: updatedTasks.length,
        errors: errors_list.length > 0 ? errors_list : undefined,
        message: `Successfully updated ${updatedTasks.length} task(s)`,
      });
    } catch (error) {
      console.error('Error applying workload optimization:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to apply workload optimization',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * @route   POST /api/organizer/breakdown-task
 * @desc    Break down a task into subtasks
 * @access  Private
 */
router.post(
  '/breakdown-task',
  authenticate,
  [
    body('taskDescription')
      .trim()
      .notEmpty()
      .withMessage('Task description is required')
      .isLength({ max: 500 })
      .withMessage('Task description cannot exceed 500 characters'),
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          errors: errors.array() 
        });
      }

      const userId = req.user?._id;
      const { taskDescription } = req.body;

      if (!userId) {
        return res.status(401).json({ 
          success: false, 
          message: 'User not authenticated' 
        });
      }

      const breakdown = await organizerAgent.breakdownTask(userId, taskDescription);

      return res.json({
        success: true,
        breakdown,
        metadata: {
          userId,
          timestamp: new Date(),
          type: 'task_breakdown',
        },
      });
    } catch (error) {
      console.error('Error breaking down task:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to break down task',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * @route   GET /api/organizer/health
 * @desc    Check organizer agent health
 * @access  Public
 */
router.get('/health', (_req: Request, res: Response) => {
  const health = {
    status: 'healthy',
    timestamp: new Date(),
    service: 'organizer-agent',
    model: 'deepseek-chat',
    providers: {
      langchain: !!process.env['DEEPSEEK_API_KEY'],
      openrouter: !!process.env['OPENROUTER_API_KEY'],
    },
    features: [
      'chat',
      'organization-suggestions',
      'daily-plan',
      'productivity-analysis',
      'motivation',
      'workload-optimization',
      'task-breakdown',
      'provider-test',
      'enhanced-langchain-functions',
    ],
  };

  return res.json(health);
});

export default router;

