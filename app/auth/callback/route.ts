import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const callbackUrl = new URL('/auth/complete', requestUrl.origin);
  callbackUrl.search = requestUrl.search;
  return NextResponse.redirect(callbackUrl);
}
