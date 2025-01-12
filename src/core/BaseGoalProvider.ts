import { Goal, GoalProvider, Task, TaskSchedule } from './interfaces';

export class BaseGoalProvider implements GoalProvider {
    private goals: Map<string, Goal> = new Map();
    private tasks: Map<string, Task> = new Map();
    private schedules: Map<string, TaskSchedule> = new Map();

    async initialize(): Promise<void> {}
    async shutdown(): Promise<void> {}

    async addGoal(goal: Goal): Promise<void> {
        this.goals.set(goal.id, goal);
    }

    async updateGoal(id: string, updates: Partial<Goal>): Promise<void> {
        const goal = this.goals.get(id);
        if (goal) {
            this.goals.set(id, { ...goal, ...updates });
        }
    }

    async removeGoal(id: string): Promise<void> {
        this.goals.delete(id);
    }

    async getActiveGoals(): Promise<Goal[]> {
        return Array.from(this.goals.values()).filter(g => g.status === 'active');
    }

    async addTask(task: Task): Promise<void> {
        this.tasks.set(task.id, task);
    }

    async updateTask(id: string, updates: Partial<Task>): Promise<void> {
        const task = this.tasks.get(id);
        if (task) {
            this.tasks.set(id, { ...task, ...updates });
        }
    }

    async getTasksForGoal(goalId: string): Promise<Task[]> {
        return Array.from(this.tasks.values()).filter(t => t.goalId === goalId);
    }

    async evaluateProgress(): Promise<{ goals: Record<string, number>; overallProgress: number }> {
        const goals: Record<string, number> = {};
        let totalProgress = 0;
        let goalCount = 0;

        for (const goal of this.goals.values()) {
            const progress = goal.progress;
            goals[goal.id] = progress;
            totalProgress += progress;
            goalCount++;
        }

        return {
            goals,
            overallProgress: goalCount > 0 ? totalProgress / goalCount : 0
        };
    }

    async scheduleTask(taskId: string, schedule: TaskSchedule): Promise<void> {
        this.schedules.set(taskId, schedule);
        const task = this.tasks.get(taskId);
        if (task) {
            this.tasks.set(taskId, { ...task, schedule });
        }
    }

    async getNextTasks(count: number): Promise<Task[]> {
        const now = new Date();
        const hour = now.getHours();
        const day = now.getDay();

        return Array.from(this.tasks.values())
            .filter(task => {
                if (task.status !== 'pending') return false;
                if (!task.schedule) return true;

                // Check day of week
                if (task.schedule.daysOfWeek && !task.schedule.daysOfWeek.includes(day)) {
                    return false;
                }

                // Check time ranges
                return task.schedule.timeRanges.some(range => 
                    hour >= range.start && hour < range.end
                );
            })
            .sort((a, b) => b.priority - a.priority)
            .slice(0, count);
    }

    async updateTaskMetrics(taskId: string, executionTime: number): Promise<void> {
        const task = this.tasks.get(taskId);
        if (task) {
            const executionCount = (task.executionCount || 0) + 1;
            const totalTime = (task.averageExecutionTime || 0) * (executionCount - 1) + executionTime;
            const averageExecutionTime = totalTime / executionCount;

            this.tasks.set(taskId, {
                ...task,
                lastExecuted: new Date(),
                executionCount,
                averageExecutionTime
            });
        }
    }

    async getTaskSchedule(taskId: string): Promise<TaskSchedule | null> {
        return this.schedules.get(taskId) || null;
    }
} 