export interface ActionState {
  error: string | null;
  success: string | null;
}

export const idleActionState: ActionState = { error: null, success: null };

export function failed(message: string): ActionState {
  return { error: message, success: null };
}

export function succeeded(message: string): ActionState {
  return { error: null, success: message };
}
