import { NextResponse } from "next/server";
import { removeProfile } from "@/lib/store";

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  await removeProfile(id);
  return NextResponse.json({ ok: true });
}
