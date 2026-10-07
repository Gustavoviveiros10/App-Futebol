"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireMember } from "@/lib/tenancy";

export async function markAllRead(gid: string) {
  const { user } = await requireMember(gid);
  await db.notification.updateMany({ where: { userId: user.id, groupId: gid, readAt: null }, data: { readAt: new Date() } });
  revalidatePath(`/p/${gid}`, "layout");
}
