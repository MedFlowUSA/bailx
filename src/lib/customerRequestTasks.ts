import type { CustomerRequestTask } from "../types";
import { getCurrentProfile } from "./auth";
import { getDemoRequestTasks, shouldUseDemoData } from "./demoData";
import { addDemoRequestTask } from "./demoStore";
import { isSupabaseConfigured, supabase } from "./supabase";

export type CustomerTaskKey = CustomerRequestTask["task_key"];

export type CustomerRequestTasksResult =
  | { ok: true; tasks: CustomerRequestTask[]; mocked: boolean }
  | { ok: false; error: string };

export type CustomerRequestTaskMutationResult =
  | { ok: true; task: CustomerRequestTask; mocked: boolean; message: string }
  | { ok: false; error: string };

const mockTasks: CustomerRequestTask[] = [];

export async function getCustomerRequestTasks(
  bailRequestId: string,
): Promise<CustomerRequestTasksResult> {
  if (shouldUseDemoData()) {
    return {
      ok: true,
      tasks: getDemoRequestTasks(bailRequestId),
      mocked: true,
    };
  }

  if (!isSupabaseConfigured || !supabase) {
    return {
      ok: true,
      tasks: mockTasks.filter((task) => task.bail_request_id === bailRequestId),
      mocked: true,
    };
  }

  const { data, error } = await supabase
    .from("customer_request_tasks")
    .select("*")
    .eq("bail_request_id", bailRequestId);

  if (error) {
    return { ok: false, error: error.message || "Unable to load request tasks." };
  }

  return { ok: true, tasks: (data || []) as CustomerRequestTask[], mocked: false };
}

export async function setCustomerRequestTask(
  bailRequestId: string,
  taskKey: CustomerTaskKey,
  completed: boolean,
): Promise<CustomerRequestTaskMutationResult> {
  const now = new Date().toISOString();

  if (shouldUseDemoData()) {
    const task = addDemoRequestTask(bailRequestId, taskKey, completed);
    return { ok: true, task, mocked: true, message: "Demo checklist updated locally." };
  }

  if (!isSupabaseConfigured || !supabase) {
    let task = mockTasks.find(
      (item) => item.bail_request_id === bailRequestId && item.task_key === taskKey,
    );

    if (!task) {
      task = {
        id: `mock-task-${Date.now()}`,
        bail_request_id: bailRequestId,
        profile_id: "mock-profile",
        task_key: taskKey,
        completed,
        completed_at: completed ? now : null,
        created_at: now,
        updated_at: now,
      };
      mockTasks.push(task);
    } else {
      task.completed = completed;
      task.completed_at = completed ? now : null;
      task.updated_at = now;
    }

    return { ok: true, task, mocked: true, message: "Checklist updated locally." };
  }

  const profile = await getCurrentProfile();

  if (!profile) {
    return { ok: false, error: "Sign in to update checklist tasks." };
  }

  const { data, error } = await supabase
    .from("customer_request_tasks")
    .upsert(
      {
        bail_request_id: bailRequestId,
        profile_id: profile.id,
        task_key: taskKey,
        completed,
        completed_at: completed ? now : null,
        updated_at: now,
      },
      { onConflict: "bail_request_id,profile_id,task_key" },
    )
    .select("*")
    .single();

  if (error) {
    return { ok: false, error: error.message || "Unable to update checklist task." };
  }

  return {
    ok: true,
    task: data as CustomerRequestTask,
    mocked: false,
    message: "Checklist updated.",
  };
}
