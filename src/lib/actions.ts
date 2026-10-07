export type ActionState = { error?: string; ok?: string; fieldErrors?: Record<string, string> } | undefined;

export const APP_NAME = "Boleiro";

export function zodError(issues: { path: PropertyKey[]; message: string }[]): ActionState {
  const fieldErrors: Record<string, string> = {};
  for (const i of issues) {
    const k = String(i.path[0] ?? "form");
    if (!fieldErrors[k]) fieldErrors[k] = i.message;
  }
  return { error: Object.values(fieldErrors)[0] ?? "Dados inválidos.", fieldErrors };
}
