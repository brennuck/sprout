import { ZodError } from "zod";
import { validateRequest } from "@/lib/auth";
import { AppError } from "@/lib/errors";

export type ActionResult<T = null> =
  | { ok: true; data: T }
  | { ok: false; error: string; code: string; field?: string };

export async function requireUser() {
  const { user } = await validateRequest();
  if (!user) throw new AppError("Please sign in again", 401, "UNAUTHORIZED");
  return user;
}

/**
 * Server actions must not throw across the network boundary (Next masks
 * messages in production), so every action returns an ActionResult.
 */
export async function runAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (error) {
    if (error instanceof AppError) {
      return { ok: false, error: error.message, code: error.code, field: error.field };
    }
    if (error instanceof ZodError) {
      const issue = error.errors[0];
      return {
        ok: false,
        error: issue?.message || "Check the form and try again",
        code: "VALIDATION",
        field: issue?.path?.join(".") || undefined,
      };
    }
    console.error("Action failed", error);
    return { ok: false, error: "Something went wrong. Please try again.", code: "INTERNAL_ERROR" };
  }
}
