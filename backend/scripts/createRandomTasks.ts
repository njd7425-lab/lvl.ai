import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Task, { TaskPriority, TaskStatus } from '../src/models/Task';
import User from '../src/models/User';

// Load environment variables
dotenv.config();

const taskTemplates = [
  // Work tasks
  { title: 'Review quarterly financial reports', priority: TaskPriority.HIGH, tags: ['work', 'finance'] },
  { title: 'Prepare presentation for client meeting', priority: TaskPriority.URGENT, tags: ['work', 'presentation'] },
  { title: 'Update project documentation', priority: TaskPriority.MEDIUM, tags: ['work', 'documentation'] },
  { title: 'Schedule team standup meeting', priority: TaskPriority.LOW, tags: ['work', 'meeting'] },
  { title: 'Complete code review for PR #42', priority: TaskPriority.HIGH, tags: ['work', 'development'] },
  { title: 'Write unit tests for authentication module', priority: TaskPriority.MEDIUM, tags: ['work', 'testing'] },
  { title: 'Update resume and LinkedIn profile', priority: TaskPriority.LOW, tags: ['work', 'career'] },
  { title: 'Research new design patterns', priority: TaskPriority.LOW, tags: ['work', 'learning'] },
  
  // Personal tasks
  { title: 'Grocery shopping for the week', priority: TaskPriority.MEDIUM, tags: ['personal', 'shopping'] },
  { title: 'Call dentist to schedule appointment', priority: TaskPriority.MEDIUM, tags: ['personal', 'health'] },
  { title: 'Organize home office space', priority: TaskPriority.LOW, tags: ['personal', 'organization'] },
  { title: 'Plan weekend trip with friends', priority: TaskPriority.LOW, tags: ['personal', 'social'] },
  { title: 'Renew car insurance', priority: TaskPriority.HIGH, tags: ['personal', 'finance'] },
  { title: 'Book flight tickets for vacation', priority: TaskPriority.MEDIUM, tags: ['personal', 'travel'] },
  { title: 'Clean out garage', priority: TaskPriority.LOW, tags: ['personal', 'chores'] },
  { title: 'Update emergency contact information', priority: TaskPriority.MEDIUM, tags: ['personal', 'admin'] },
  
  // Health tasks
  { title: 'Morning workout - Cardio session', priority: TaskPriority.HIGH, tags: ['health', 'fitness'] },
  { title: 'Meal prep for the week', priority: TaskPriority.MEDIUM, tags: ['health', 'nutrition'] },
  { title: 'Schedule annual physical exam', priority: TaskPriority.MEDIUM, tags: ['health', 'medical'] },
  { title: 'Practice meditation for 20 minutes', priority: TaskPriority.LOW, tags: ['health', 'wellness'] },
  { title: 'Track daily water intake', priority: TaskPriority.LOW, tags: ['health', 'hydration'] },
  { title: 'Research healthy meal recipes', priority: TaskPriority.LOW, tags: ['health', 'nutrition'] },
  
  // Learning tasks
  { title: 'Complete online course module 3', priority: TaskPriority.MEDIUM, tags: ['learning', 'education'] },
  { title: 'Read chapter 5 of programming book', priority: TaskPriority.LOW, tags: ['learning', 'reading'] },
  { title: 'Practice coding challenges', priority: TaskPriority.MEDIUM, tags: ['learning', 'programming'] },
  { title: 'Watch tutorial on React hooks', priority: TaskPriority.LOW, tags: ['learning', 'development'] },
  { title: 'Write blog post about TypeScript', priority: TaskPriority.MEDIUM, tags: ['learning', 'writing'] },
  
  // Project tasks
  { title: 'Design database schema for new feature', priority: TaskPriority.HIGH, tags: ['project', 'development'] },
  { title: 'Create wireframes for mobile app', priority: TaskPriority.MEDIUM, tags: ['project', 'design'] },
  { title: 'Set up CI/CD pipeline', priority: TaskPriority.HIGH, tags: ['project', 'devops'] },
  { title: 'Write API documentation', priority: TaskPriority.MEDIUM, tags: ['project', 'documentation'] },
  { title: 'Deploy staging environment', priority: TaskPriority.URGENT, tags: ['project', 'deployment'] },
];

const descriptions = [
  'Make sure to review all details carefully',
  'This is important for the upcoming deadline',
  'Take your time and do it right',
  'Double-check before submitting',
  'Coordinate with team members if needed',
  'Follow the standard procedure',
  'Reference the documentation if unsure',
];

function getRandomDate(daysFromNow: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + Math.floor(Math.random() * daysFromNow));
  date.setHours(Math.floor(Math.random() * 12) + 9, Math.floor(Math.random() * 60), 0, 0);
  return date;
}

function getRandomElement<T>(array: T[]): T {
  const index = Math.floor(Math.random() * array.length);
  return array[index]!; // Non-null assertion since we know index is valid
}

async function createRandomTasks(userId: string, count: number = 15) {
  try {
    console.log(`Creating ${count} random tasks for user ${userId}...`);

    const tasks = [];
    const statuses = [TaskStatus.PENDING, TaskStatus.IN_PROGRESS];
    
    for (let i = 0; i < count; i++) {
      const template = getRandomElement(taskTemplates);
      const status = getRandomElement(statuses);
      const hasDueDate = Math.random() > 0.3; // 70% chance of having a due date
      const dueDate = hasDueDate ? getRandomDate(14) : undefined;
      const hasDescription = Math.random() > 0.5; // 50% chance of having description
      
      const task = new Task({
        title: template.title,
        description: hasDescription ? getRandomElement(descriptions) : undefined,
        priority: template.priority,
        status: status,
        dueDate: dueDate,
        points: template.priority === TaskPriority.URGENT ? 25 : 
                template.priority === TaskPriority.HIGH ? 20 :
                template.priority === TaskPriority.MEDIUM ? 15 : 10,
        tags: template.tags,
        userId: userId,
      });

      tasks.push(task);
    }

    const savedTasks = await Task.insertMany(tasks);
    console.log(`✅ Successfully created ${savedTasks.length} tasks!`);

    // Update user's tasks array
    await User.findByIdAndUpdate(userId, {
      $push: { tasks: { $each: savedTasks.map(t => t._id) } }
    });

    return savedTasks;
  } catch (error) {
    console.error('Error creating tasks:', error);
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

    // Create random tasks
    const count = process.argv[2] ? parseInt(process.argv[2]) : 15;
    const userId = (user._id as mongoose.Types.ObjectId).toString();
    await createRandomTasks(userId, count);

    await mongoose.disconnect();
    console.log('✅ Done!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();

