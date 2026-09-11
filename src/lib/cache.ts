import { revalidateTag } from "next/cache";

/**
 * Every cached read model for a dashboard owner is tagged with `owner:<id>`.
 * Any write that touches the owner's money calls `invalidateOwner` so the next
 * render recomputes from the database.
 */
export const ownerTag = (ownerId: string) => `owner:${ownerId}`;

/** Snapshot data cached with this revalidation as a safety net, in seconds. */
export const OWNER_CACHE_TTL_SECONDS = 600;

export function invalidateOwner(ownerId: string | null | undefined) {
  if (!ownerId) return;
  try {
    revalidateTag(ownerTag(ownerId));
  } catch {
    // Outside of a request scope (unit tests, scripts) there is no cache to
    // invalidate, so a no-op is the correct behavior.
  }
}

export function invalidateOwners(ownerIds: Iterable<string>) {
  for (const ownerId of new Set(ownerIds)) invalidateOwner(ownerId);
}
