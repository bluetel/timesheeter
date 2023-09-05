import { createContext, useContext, useState } from 'react';
import { z } from 'zod';

const taskFilterPreferencesSchema = z.object({
  workspaceId: z.string().cuid2(),
  projectId: z.string().cuid2().optional(),
});

type TaskFilterPreferences = z.infer<typeof taskFilterPreferencesSchema>;

type TaskFilterPreferencesContextType = {
  taskFilterPreferences: TaskFilterPreferences | undefined;
  saveTaskFilterPreferences: (taskFilterPreferences: TaskFilterPreferences) => void;
};

const TaskFilterPreferencesContext = createContext<TaskFilterPreferencesContextType>({
  taskFilterPreferences: undefined,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  saveTaskFilterPreferences: () => {},
});

export const useTaskFilterPreferences = () => {
  const context = useContext(TaskFilterPreferencesContext);

  if (!context.taskFilterPreferences) {
    throw new Error('useTaskFilterPreferences must be used within a TaskFilterPreferencesProvider');
  }

  return context as {
    taskFilterPreferences: TaskFilterPreferences;
    saveTaskFilterPreferences: (taskFilterPreferences: TaskFilterPreferences) => void;
  };
};

type TaskFilterPreferencesProviderProps = {
  children: React.ReactNode;
  workspaceId: string;
};

const getTaskFilterPreferencesKey = (workspaceId: string) => `taskFilterPreferences-${workspaceId}`;

const getTaskFilterPreferences = (workspaceId: string) => {
  if (typeof window === 'undefined') {
    return {
      // Return the default values
      workspaceId,
    };
  }

  const taskFilterPreferences = localStorage.getItem(getTaskFilterPreferencesKey(workspaceId));

  if (!taskFilterPreferences) {
    return {
      // Return the default values
      workspaceId,
    };
  }

  return JSON.parse(taskFilterPreferences) as TaskFilterPreferences;
};

export const TaskFilterPreferencesProvider = ({ children, workspaceId }: TaskFilterPreferencesProviderProps) => {
  const [taskFilterPreferences, setTaskFilterPreferences] = useState(getTaskFilterPreferences(workspaceId));

  const saveTaskFilterPreferences = (taskFilterPreferences: TaskFilterPreferences) => {
    localStorage.setItem(getTaskFilterPreferencesKey(workspaceId), JSON.stringify(taskFilterPreferences));
    setTaskFilterPreferences(taskFilterPreferences);
  };

  return (
    <TaskFilterPreferencesContext.Provider value={{ taskFilterPreferences, saveTaskFilterPreferences }}>
      {children}
    </TaskFilterPreferencesContext.Provider>
  );
};
