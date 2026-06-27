import {
  db,
  travelogues,
  travelogueCollaborators,
  routes,
  routeCollaborators,
  users,
} from "@seichi/db";
import { eq, and } from "drizzle-orm";

export async function canEditTravelogue(
  travelogueId: string,
  userId: string
): Promise<boolean> {
  const [row] = await db
    .select({ userId: travelogues.userId })
    .from(travelogues)
    .where(eq(travelogues.id, travelogueId))
    .limit(1);

  if (!row) return false;
  if (row.userId === userId) return true;

  const [collab] = await db
    .select()
    .from(travelogueCollaborators)
    .where(
      and(
        eq(travelogueCollaborators.travelogueId, travelogueId),
        eq(travelogueCollaborators.userId, userId)
      )
    )
    .limit(1);

  return !!collab;
}

export async function canEditRoute(
  routeId: string,
  userId: string
): Promise<boolean> {
  const [row] = await db
    .select({ userId: routes.userId })
    .from(routes)
    .where(eq(routes.id, routeId))
    .limit(1);

  if (!row) return false;
  if (row.userId === userId) return true;

  const [collab] = await db
    .select()
    .from(routeCollaborators)
    .where(
      and(
        eq(routeCollaborators.routeId, routeId),
        eq(routeCollaborators.userId, userId)
      )
    )
    .limit(1);

  return !!collab;
}

export async function findUserByUsername(username: string) {
  const [user] = await db
    .select({ id: users.id, name: users.name, username: users.username, image: users.image })
    .from(users)
    .where(eq(users.username, username.replace(/^@/, "")))
    .limit(1);

  return user ?? null;
}
