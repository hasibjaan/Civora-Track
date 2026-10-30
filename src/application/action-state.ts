/** What a form shows after an officer submits it. Shared by the server actions and the forms. */
export type ActionState =
  { status: "idle" } | { status: "saved"; message: string } | { status: "error"; message: string };

export const IDLE_ACTION_STATE: ActionState = { status: "idle" };
