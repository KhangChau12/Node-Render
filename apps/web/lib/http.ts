import { NextResponse } from "next/server";
import { tr, withLocale } from "./i18n/server";
import { HttpError } from "./storage";

/**
 * Wrap a route handler: runs it in the UI language of the request (for messages),
 * HttpError → JSON error with status; anything else → 500.
 */
export async function handle<T>(fn: () => Promise<T>): Promise<NextResponse> {
  return withLocale(() => respond(fn));
}

async function respond<T>(fn: () => Promise<T>): Promise<NextResponse> {
  try {
    return NextResponse.json(await fn());
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: err instanceof Error ? err.message : tr("common.unknownError") }, { status: 500 });
  }
}
