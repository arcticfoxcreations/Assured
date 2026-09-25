// src/lib/server/http.ts — server only.
import { NextResponse } from "next/server";

export const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export function fail(e: unknown) {
  const msg = e instanceof Error ? e.message : "error";
  if (msg === "storage_unavailable") return json({ error: "storage_unavailable" }, 503);
  if (msg === "bad_arrival") return json({ error: "Expected arrival must be within the next 24 hours." }, 400);
  return json({ error: "server_error" }, 500);
}

export const UA = "ASSURED-safety-app/0.1 (hackathon build)";
