import { useCallback, useRef, useState } from "react";
import { WorkflowDefinition } from "../../shared/workflowTypes";

interface HistoryState {
  workflow: WorkflowDefinition;
  timestamp: Date;
  action: string;
  description: string;
}

interface UseWorkflowHistoryProps {
  initialWorkflow?: WorkflowDefinition;
  maxHistorySize?: number;
}

export function useWorkflowHistory({
  initialWorkflow,
  maxHistorySize = 50,
}: UseWorkflowHistoryProps = {}) {
  const [history, setHistory] = useState<HistoryState[]>(() => {
    if (initialWorkflow) {
      return [
        {
          workflow: structuredClone(initialWorkflow),
          timestamp: new Date(),
          action: "initial",
          description: "Initial workflow state",
        },
      ];
    }
    return [];
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const isUpdatingRef = useRef(false);

  // Get current workflow state
  const currentWorkflow = history[currentIndex]?.workflow;

  // Check if undo/redo is available
  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  // Save a new state to history
  const saveState = useCallback(
    (workflow: WorkflowDefinition, action: string, description: string) => {
      if (isUpdatingRef.current) return;

      setHistory((prev) => {
        // Remove any future states if we're not at the end
        const newHistory = prev.slice(0, currentIndex + 1);

        // Add new state
        const newState: HistoryState = {
          workflow: structuredClone(workflow),
          timestamp: new Date(),
          action,
          description,
        };

        newHistory.push(newState);

        // Trim history if it exceeds max size
        if (newHistory.length > maxHistorySize) {
          return newHistory.slice(-maxHistorySize);
        }

        return newHistory;
      });

      setCurrentIndex((prev) => {
        const newIndex = Math.min(prev + 1, maxHistorySize - 1);
        return newIndex;
      });
    },
    [currentIndex, maxHistorySize]
  );

  // Undo last action
  const undo = useCallback(() => {
    if (!canUndo) return null;

    isUpdatingRef.current = true;
    const newIndex = currentIndex - 1;
    setCurrentIndex(newIndex);

    setTimeout(() => {
      isUpdatingRef.current = false;
    }, 0);

    return history[newIndex]?.workflow || null;
  }, [canUndo, currentIndex, history]);

  // Redo last undone action
  const redo = useCallback(() => {
    if (!canRedo) return null;

    isUpdatingRef.current = true;
    const newIndex = currentIndex + 1;
    setCurrentIndex(newIndex);

    setTimeout(() => {
      isUpdatingRef.current = false;
    }, 0);

    return history[newIndex]?.workflow || null;
  }, [canRedo, currentIndex, history]);

  // Clear history
  const clearHistory = useCallback(() => {
    setHistory([]);
    setCurrentIndex(0);
  }, []);

  // Get history info for UI
  const getHistoryInfo = useCallback(() => {
    return {
      total: history.length,
      current: currentIndex + 1,
      canUndo,
      canRedo,
      currentAction: history[currentIndex]?.action,
      currentDescription: history[currentIndex]?.description,
      undoAction: history[currentIndex - 1]?.description,
      redoAction: history[currentIndex + 1]?.description,
    };
  }, [history, currentIndex, canUndo, canRedo]);

  // Get recent history for display
  const getRecentHistory = useCallback(
    (count: number = 10) => {
      const start = Math.max(0, currentIndex - count + 1);
      const end = Math.min(history.length, currentIndex + count);

      return history.slice(start, end).map((state, index) => ({
        ...state,
        index: start + index,
        isCurrent: start + index === currentIndex,
      }));
    },
    [history, currentIndex]
  );

  // Jump to a specific state in history
  const jumpToState = useCallback(
    (index: number) => {
      if (index < 0 || index >= history.length) return null;

      isUpdatingRef.current = true;
      setCurrentIndex(index);

      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 0);

      return history[index]?.workflow || null;
    },
    [history]
  );

  return {
    currentWorkflow,
    canUndo,
    canRedo,
    saveState,
    undo,
    redo,
    clearHistory,
    getHistoryInfo,
    getRecentHistory,
    jumpToState,
    isUpdating: isUpdatingRef.current,
  };
}

// Helper function to create structured clone for older environments
function structuredClone<T>(obj: T): T {
  if (typeof globalThis.structuredClone === "function") {
    return globalThis.structuredClone(obj);
  }

  // Fallback for environments without structuredClone
  return JSON.parse(JSON.stringify(obj));
}
