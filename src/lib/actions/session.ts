"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { lucia, validateRequest } from "@/lib/auth";
import { THEME_COOKIE, parseTheme, type ThemePreference } from "@/lib/theme";

export async function setThemeAction(theme: ThemePreference) {
  const store = await cookies();
  store.set(THEME_COOKIE, parseTheme(theme), {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}

export async function signOutAction() {
  const { session } = await validateRequest();
  if (session) {
    await lucia.invalidateSession(session.id);
  }
  const blank = lucia.createBlankSessionCookie();
  (await cookies()).set(blank.name, blank.value, blank.attributes);
  redirect("/");
}
