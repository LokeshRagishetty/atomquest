import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

type SegmentParams = Record<string, string | string[] | undefined>;
export type RouteContext = { params: Promise<SegmentParams> };
type StaticRouteHandler = (req: Request) => Promise<Response> | Response;
type DynamicRouteHandler = (req: Request, context: RouteContext) => Promise<Response> | Response;

export function apiError(message: string, status = 500, context?: Record<string, unknown>) {
  if (status >= 500) {
    logger.error("api.error.response", new Error(message), { status, ...context });
  } else if (status >= 400) {
    logger.warn("api.warn.response", { message, status, ...context });
  }

  return NextResponse.json(
    { error: status >= 500 ? "Something went wrong. Please try again." : message },
    { status },
  );
}

function handleApiRequest(route: string, handler: StaticRouteHandler | DynamicRouteHandler, req: Request, context?: RouteContext) {
  return (async () => {
    const requestId = crypto.randomUUID();
    const startedAt = Date.now();
    const url = new URL(req.url);

    logger.info("api.request", {
      requestId,
      route,
      method: req.method,
      path: url.pathname,
    });

    try {
      const response = context
        ? await (handler as DynamicRouteHandler)(req, context)
        : await (handler as StaticRouteHandler)(req);
      const durationMs = Date.now() - startedAt;

      if (response.status >= 400) {
        logger.warn("api.response.failed", {
          requestId,
          route,
          method: req.method,
          path: url.pathname,
          status: response.status,
          durationMs,
        });
      } else {
        logger.info("api.response", {
          requestId,
          route,
          method: req.method,
          path: url.pathname,
          status: response.status,
          durationMs,
        });
      }

      return response;
    } catch (error) {
      const durationMs = Date.now() - startedAt;

      if (error instanceof SyntaxError) {
        logger.warn("api.invalid_json", {
          requestId,
          route,
          method: req.method,
          path: url.pathname,
          durationMs,
        });
        return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
      }

      logger.error("api.unhandled_exception", error, {
        requestId,
        route,
        method: req.method,
        path: url.pathname,
        durationMs,
      });

      return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }
  })();
}

export function withApiRoute(route: string, handler: StaticRouteHandler): (req: Request) => Promise<Response>;
export function withApiRoute(route: string, handler: DynamicRouteHandler): (req: Request, context: RouteContext) => Promise<Response>;
export function withApiRoute(route: string, handler: StaticRouteHandler | DynamicRouteHandler) {
  if (handler.length >= 2) {
    return (req: Request, context: RouteContext) => handleApiRequest(route, handler, req, context);
  }

  return (req: Request) => handleApiRequest(route, handler, req);
}

export async function getRouteParam(context: RouteContext, key: string) {
  const params = await context.params;
  const value = params?.[key];

  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}
