import { NextRequest, NextResponse } from "next/server";
import { fetchUserByAddress, upsertUser } from "@/lib/db";

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

/** GET /api/user?address=0x... */
export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get("address");
  if (!address || !ADDRESS_RE.test(address)) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }
  const user = await fetchUserByAddress(address);
  return NextResponse.json({ user }); // null = no profile yet
}

/** PUT /api/user  body: { address, displayName?, username?, bio? } */
export async function PUT(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { address, displayName, username, bio } = body as Record<string, string>;

  if (!address || !ADDRESS_RE.test(address)) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  // Validate field lengths
  if (displayName !== undefined && (typeof displayName !== "string" || displayName.length > 60)) {
    return NextResponse.json({ error: "displayName too long (max 60)" }, { status: 400 });
  }
  if (username !== undefined && username !== null) {
    if (typeof username !== "string" || !/^[a-zA-Z0-9_]{1,30}$/.test(username)) {
      return NextResponse.json({ error: "username must be 1-30 alphanumeric/underscore chars" }, { status: 400 });
    }
  }
  if (bio !== undefined && (typeof bio !== "string" || bio.length > 200)) {
    return NextResponse.json({ error: "bio too long (max 200)" }, { status: 400 });
  }

  try {
    const user = await upsertUser(address, { displayName, username, bio });
    return NextResponse.json({ user });
  } catch (err: unknown) {
    // Unique constraint on username
    if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2002") {
      return NextResponse.json({ error: "Username already taken" }, { status: 409 });
    }
    console.error("[PUT /api/user]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
