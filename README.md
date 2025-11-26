# Workload Optimization Feature

## Overview

Added an AI-powered workload optimization feature that analyzes user tasks and provides intelligent recommendations to balance workload distribution across days. The feature identifies overloaded days, redistributes tasks to lighter days, and suggests priority adjustments.

## Demo
[![Watch the video](https://i.imgur.com/22TPeoA.mp4)](https://i.imgur.com/22TPeoA.mp4)


## New Feature: Workload Optimization

The workload optimization feature helps users:
- **Balance workload** across multiple days to prevent overload
- **Reschedule tasks** from busy days to lighter days
- **Prioritize overdue tasks** automatically
- **Schedule unscheduled tasks** based on workload balance
- **Visualize changes** with a before/after comparison table

### Key Capabilities

1. **Smart Analysis**: Analyzes up to 15 most important tasks (sorted by priority and due date)
2. **Intelligent Redistribution**: Identifies days with 5+ tasks and suggests moving some to days with 1-2 tasks
3. **Overdue Task Handling**: Automatically prioritizes tasks that are past their due date
4. **Interactive UI**: Users can review and selectively apply recommendations via a before/after comparison table

## Main Files Changed

### Backend Changes

#### `backend/src/ai/agents/organizerAgent.ts`
- **Added `optimizeWorkload()` function**: Core AI logic for workload analysis
  - Retrieves and filters pending/in-progress tasks
  - Sorts tasks by priority and due date
  - Limits to top 15 tasks to prevent timeouts
  - Generates AI prompt for workload optimization
  - Parses AI response to extract structured recommendations
  - Validates and filters recommendations

#### `backend/src/routes/organizerAgentRoutes.ts`
- **Added `GET /api/organizer/workload-optimization` endpoint**: 
  - Accepts `days` query parameter (default: 7)
  - Accepts `maxTasks` query parameter (default: 15)
  - Implements 30-second timeout protection
  - Returns structured recommendations with metadata

- **Added `POST /api/organizer/apply-workload-optimization` endpoint**:
  - Accepts array of recommendations to apply
  - Updates task due dates and priorities
  - Returns success status and updated task IDs

### Frontend Changes

#### `frontend/src/app/workload/page.tsx`
- **New workload optimization page**: Complete UI for workload optimization
  - Settings panel with days slider (3-14 days)
  - Before/After comparison table showing:
    - Current vs. suggested due dates
    - Current vs. suggested priorities
    - Reason for each recommendation
  - Interactive selection (checkboxes) for recommendations
  - Apply changes button with loading states
  - Error and success messaging

#### `frontend/src/lib/api/agents/organizerAgent.ts`
- **Added `optimizeWorkload()` function**: Frontend API client
  - Calls backend optimization endpoint
  - Handles 35-second timeout
  - Returns structured response with recommendations

- **Added `applyWorkloadOptimization()` function**: 
  - Sends selected recommendations to backend
  - Handles response and errors

- **Added TypeScript interfaces**:
  - `TaskRecommendation`: Structure for task recommendations
  - `WorkloadOptimizationResponse`: API response structure
  - `ApplyWorkloadOptimizationResponse`: Apply endpoint response

#### `frontend/src/components/layout/Sidebar.tsx`
- **Added navigation link**: Link to `/workload` page in sidebar

### Utility Scripts

#### `backend/scripts/createClutteredTasks.ts`
- **New script**: Creates intentionally cluttered tasks for testing
  - Generates tasks with unbalanced distribution (6 tasks on some days, 1 on others)
  - Creates overdue tasks
  - Creates tasks with no due date
  - Helps test optimization recommendations

#### `backend/scripts/createRandomTasks.ts`
- **Enhanced existing script**: Creates random tasks for general testing

## How to Use

1. **Navigate to Workload Optimization**:
   - Click "Workload Optimization" in the sidebar
   - Or go to `/workload` route

2. **Configure Settings**:
   - Adjust the "Days to optimize" slider (3-14 days)
   - Click "Optimize Workload" button

3. **Review Recommendations**:
   - View the before/after comparison table
   - See which tasks will be rescheduled
   - Read the reason for each recommendation

4. **Apply Changes**:
   - Select/deselect recommendations using checkboxes
   - Click "Apply Selected Changes"
   - Tasks will be updated and you'll be redirected to tasks page

## Verification & Testing

### Manual Testing Performed

1. **Created Cluttered Tasks**:
   ```bash
   cd backend
   npx ts-node -r tsconfig-paths/register scripts/createClutteredTasks.ts
   ```
   - Created 32 tasks with unbalanced distribution
   - Verified tasks appear in task list

2. **Tested Optimization Flow**:
   - Navigated to `/workload` page
   - Set days to 7
   - Clicked "Optimize Workload"
   - Verified recommendations appear in before/after table
   - Selected recommendations and applied changes
   - Verified tasks updated in database

3. **Tested Edge Cases**:
   - Empty task list (shows appropriate message)
   - No recommendations (shows "no changes needed" message)
   - Timeout handling (30-second backend timeout, 35-second frontend timeout)
   - Invalid task IDs (filtered out with warnings)

### Backend Logging

Added extensive console logging for debugging:
- AI response preview
- Extracted JSON from AI response
- Number of recommendations found
- Valid task IDs
- Filtering results

Check logs with:
```bash
tail -f /tmp/backend.log
```

### Performance Optimizations

1. **Task Limiting**: Only processes top 15 tasks (sorted by priority and due date)
2. **Timeout Protection**: 30-second backend timeout, 35-second frontend timeout
3. **Reduced Token Usage**: Lowered maxTokens from 3000 to 2000
4. **Optimized Prompt**: Shorter, more focused prompt for faster AI responses

## Assumptions

1. **AI Provider Available**: Assumes OpenRouter API key is configured in `.env`
2. **Task Structure**: Assumes tasks have `dueDate`, `priority`, and `status` fields
3. **User Authentication**: Requires authenticated user session
4. **Task Limit**: Assumes 15 tasks is sufficient for optimization (can be adjusted via `maxTasks` parameter)

## Challenges Faced

1. **AI Response Parsing**:
   - **Challenge**: AI sometimes returns JSON wrapped in markdown code blocks or with extra text
   - **Solution**: Implemented multiple regex patterns to extract JSON, with fallback patterns

2. **Timeout Issues**:
   - **Challenge**: AI processing took too long with many tasks, causing timeouts
   - **Solution**: Limited to 15 most important tasks, reduced token count, added timeout protection

3. **Empty Recommendations**:
   - **Challenge**: When AI doesn't find optimizations needed, users see no feedback
   - **Solution**: Added informative message when no recommendations are found

```

## API Endpoints

### GET `/api/organizer/workload-optimization`
- **Query Params**: 
  - `days` (optional, default: 7) - Number of days to optimize
  - `maxTasks` (optional, default: 15) - Maximum tasks to analyze
- **Response**: 
  ```json
  {
    "success": true,
    "analysis": "string",
    "recommendations": [...],
    "summary": "string",
    "metadata": {...}
  }
  ```

### POST `/api/organizer/apply-workload-optimization`
- **Body**: 
  ```json
  {
    "recommendations": [
      {
        "taskId": "string",
        "suggestedDueDate": "YYYY-MM-DD",
        "suggestedPriority": "low/medium/high/urgent"
      }
    ]
  }
  ```
- **Response**: 
  ```json
  {
    "success": true,
    "message": "string",
    "updatedTasks": ["task_id_1", "task_id_2"]
  }
  ```

