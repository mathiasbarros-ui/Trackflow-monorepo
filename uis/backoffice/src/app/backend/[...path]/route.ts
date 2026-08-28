import { NextRequest, NextResponse } from "next/server";

const AUTH_API_BASE_URL = process.env.NEXT_PUBLIC_AUTH_API_URL ?? "http://127.0.0.1:8001";
const SUPPLIERS_API_BASE_URL = process.env.NEXT_PUBLIC_SUPPLIERS_API_URL ?? "http://127.0.0.1:8000";

const RESPONSE_HEADERS_TO_FORWARD = [
  "content-type",
  "cache-control",
  "etag",
  "last-modified",
  "content-disposition",
  "www-authenticate",
];

async function proxyRequest(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const pathname = Array.isArray(path) ? path.join("/") : "";

  const baseUrl = pathname.startsWith("suppliers")
    ? SUPPLIERS_API_BASE_URL
    : AUTH_API_BASE_URL;

  const target = `${baseUrl}/${pathname}${request.nextUrl.search}`;

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("content-length");
  headers.delete("connection");

  const method = request.method.toUpperCase();
  const hasBody = method !== "GET" && method !== "HEAD";

  const upstream = await fetch(target, {
    method,
    headers,
    body: hasBody ? request.body : undefined,
    duplex: hasBody ? "half" : undefined,
    redirect: "manual",
    cache: "no-store",
  });

  const responseHeaders = new Headers();
  RESPONSE_HEADERS_TO_FORWARD.forEach((name) => {
    const value = upstream.headers.get(name);
    if (value) {
      responseHeaders.set(name, value);
    }
  });

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxyRequest(request, context);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxyRequest(request, context);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxyRequest(request, context);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxyRequest(request, context);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxyRequest(request, context);
}
