import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Task, { TaskPriority, TaskStatus } from '../src/models/Task';
import User from '../src/models/User';

// Load environment variables
dotenv.config();

// Create cluttered tasks - many tasks on same days, unbalanced priorities, overdue tasks
const clutteredTasks = [
  // Day 1 - Too many urgent tasks (overloaded)
  { title: 'Critical bug fix in production', priority: TaskPriority.URGENT, daysFromNow: 0, tags: ['work', 'urgent'] },
  { title: 'Client presentation preparation', priority: TaskPriority.URGENT, daysFromNow: 0, tags: ['work', 'presentation'] },
  { title: 'Server maintenance emergency', priority: TaskPriority.URGENT, daysFromNow: 0, tags: ['work', 'devops'] },
  { title: 'Review legal documents', priority: TaskPriority.HIGH, daysFromNow: 0, tags: ['work', 'legal'] },
  { title: 'Team meeting preparation', priority: TaskPriority.MEDIUM, daysFromNow: 0, tags: ['work', 'meeting'] },
  { title: 'Update project documentation', priority: TaskPriority.LOW, daysFromNow: 0, tags: ['work', 'documentation'] },
  
  // Day 2 - Empty day (should redistribute from day 1)
  { title: 'Code review for feature branch', priority: TaskPriority.HIGH, daysFromNow: 1, tags: ['work', 'development'] },
  
  // Day 3 - Too many tasks again
  { title: 'Database migration planning', priority: TaskPriority.HIGH, daysFromNow: 2, tags: ['work', 'database'] },
  { title: 'Write unit tests', priority: TaskPriority.MEDIUM, daysFromNow: 2, tags: ['work', 'testing'] },
  { title: 'Update dependencies', priority: TaskPriority.MEDIUM, daysFromNow: 2, tags: ['work', 'maintenance'] },
  { title: 'Design new feature mockups', priority: TaskPriority.MEDIUM, daysFromNow: 2, tags: ['work', 'design'] },
  { title: 'Write blog post', priority: TaskPriority.LOW, daysFromNow: 2, tags: ['work', 'writing'] },
  
  // Day 4 - Empty (should get tasks)
  { title: 'API documentation update', priority: TaskPriority.MEDIUM, daysFromNow: 3, tags: ['work', 'documentation'] },
  
  // Day 5 - Overloaded with mixed priorities
  { title: 'Quarterly report preparation', priority: TaskPriority.URGENT, daysFromNow: 4, tags: ['work', 'reporting'] },
  { title: 'Security audit review', priority: TaskPriority.HIGH, daysFromNow: 4, tags: ['work', 'security'] },
  { title: 'Performance optimization', priority: TaskPriority.HIGH, daysFromNow: 4, tags: ['work', 'optimization'] },
  { title: 'User feedback analysis', priority: TaskPriority.MEDIUM, daysFromNow: 4, tags: ['work', 'analysis'] },
  { title: 'Update README files', priority: TaskPriority.LOW, daysFromNow: 4, tags: ['work', 'documentation'] },
  
  // Day 6 - Empty
  { title: 'Refactor legacy code', priority: TaskPriority.MEDIUM, daysFromNow: 5, tags: ['work', 'refactoring'] },
  
  // Day 7 - Too many tasks
  { title: 'Deploy to staging environment', priority: TaskPriority.URGENT, daysFromNow: 6, tags: ['work', 'deployment'] },
  { title: 'Run integration tests', priority: TaskPriority.HIGH, daysFromNow: 6, tags: ['work', 'testing'] },
  { title: 'Update user guide', priority: TaskPriority.MEDIUM, daysFromNow: 6, tags: ['work', 'documentation'] },
  { title: 'Plan next sprint', priority: TaskPriority.MEDIUM, daysFromNow: 6, tags: ['work', 'planning'] },
  { title: 'Clean up old files', priority: TaskPriority.LOW, daysFromNow: 6, tags: ['work', 'maintenance'] },
  
  // Some overdue tasks (should be prioritized)
  { title: 'Fix critical security vulnerability', priority: TaskPriority.URGENT, daysFromNow: -2, tags: ['work', 'security', 'overdue'] },
  { title: 'Complete performance review', priority: TaskPriority.HIGH, daysFromNow: -1, tags: ['work', 'hr', 'overdue'] },
  
  // Tasks with no due date (should get scheduled)
  { title: 'Research new technology stack', priority: TaskPriority.MEDIUM, daysFromNow: null, tags: ['work', 'research'] },
  { title: 'Improve code documentation', priority: TaskPriority.LOW, daysFromNow: null, tags: ['work', 'documentation'] },
  { title: 'Set up CI/CD pipeline', priority: TaskPriority.HIGH, daysFromNow: null, tags: ['work', 'devops'] },
  
  // More cluttered days
  { title: 'Client demo preparation', priority: TaskPriority.URGENT, daysFromNow: 3, tags: ['work', 'demo'] },
  { title: 'Budget planning for next quarter', priority: TaskPriority.HIGH, daysFromNow: 3, tags: ['work', 'finance'] },
  { title: 'Team retrospective meeting', priority: TaskPriority.MEDIUM, daysFromNow: 3, tags: ['work', 'meeting'] },
];

function getDate(daysFromNow: number | null): Date | undefined {
  if (daysFromNow === null) return undefined;
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(Math.floor(Math.random() * 8) + 9, Math.floor(Math.random() * 60), 0, 0);
  return date;
}

function getPoints(priority: TaskPriority): number {
  switch (priority) {
    case TaskPriority.URGENT: return 25;
    case TaskPriority.HIGH: return 20;
    case TaskPriority.MEDIUM: return 15;
    case TaskPriority.LOW: return 10;
    default: return 10;
  }
}

async function createClutteredTasks(userId: string) {
  try {
    console.log(`Creating ${clutteredTasks.length} cluttered tasks for user ${userId}...`);

    const tasks = [];
    
    for (const taskData of clutteredTasks) {
      const task = new Task({
        title: taskData.title,
        description: `This task needs to be completed. ${taskData.daysFromNow === null ? 'No specific deadline set.' : taskData.daysFromNow < 0 ? 'This task is overdue!' : ''}`,
        priority: taskData.priority,
        status: Math.random() > 0.7 ? TaskStatus.IN_PROGRESS : TaskStatus.PENDING,
        dueDate: getDate(taskData.daysFromNow),
        points: getPoints(taskData.priority),
        tags: taskData.tags,
        userId: userId,
      });

      tasks.push(task);
    }

    const savedTasks = await Task.insertMany(tasks);
    console.log(`✅ Successfully created ${savedTasks.length} cluttered tasks!`);
    console.log(`\nTask distribution:`);
    
    // Show distribution by day
    const byDay: { [key: string]: number } = {};
    savedTasks.forEach(t => {
      if (t.dueDate) {
        const day = t.dueDate.toISOString().split('T')[0];
        if (day) {
          byDay[day] = (byDay[day] || 0) + 1;
        }
      } else {
        const noDateKey = 'No due date';
        byDay[noDateKey] = (byDay[noDateKey] || 0) + 1;
      }
    });
    
    Object.entries(byDay).forEach(([day, count]) => {
      console.log(`  ${day}: ${count} tasks`);
    });

    // Update user's tasks array
    await User.findByIdAndUpdate(userId, {
      $push: { tasks: { $each: savedTasks.map(t => t._id) } }
    });

    return savedTasks;
  } catch (error) {
    console.error('Error creating cluttered tasks:', error);
    throw error;
  }
}

async function main() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env['MONGODB_URI'] || 'mongodb://localhost:27017/lvl-ai';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Get the first user (or create one if none exists)
    let user = await User.findOne();
    
    if (!user) {
      console.log('No user found. Please create a user account first through the registration endpoint.');
      process.exit(1);
    }

    console.log(`Found user: ${user.name} (${user.email})`);

    // Delete existing pending/in-progress tasks to start fresh
    const existingTasks = await Task.find({ 
      userId: user._id,
      status: { $in: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS] }
    });
    
    if (existingTasks.length > 0) {
      console.log(`\n⚠️  Found ${existingTasks.length} existing pending/in-progress tasks.`);
      console.log('Deleting them to create fresh cluttered tasks...');
      await Task.deleteMany({ 
        _id: { $in: existingTasks.map(t => t._id) }
      });
      console.log('✅ Deleted existing tasks');
    }

    // Create cluttered tasks
    await createClutteredTasks((user._id as mongoose.Types.ObjectId).toString());

    await mongoose.disconnect();
    console.log('\n✅ Done! Your tasks are now cluttered and ready for optimization testing.');
    console.log('\nTry optimizing your workload now - you should see recommendations!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();

