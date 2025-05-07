import { NextResponse } from "next/server";
import { debugProfiles } from "@/app/lib/storage";

export async function GET() {
  const profiles = await debugProfiles();

  return NextResponse.json({
    success: true,
    profiles,
  });
}
