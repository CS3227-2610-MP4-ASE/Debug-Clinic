type LambdaResult = {
  statusCode: number;
  headers?: Record<string, string | number | boolean>;
  multiValueHeaders?: Record<string, string[]>;
  cookies?: string[];
  body: string;
  isBase64Encoded?: boolean;
};

/** Adapt the existing serverless-http Lambda handler to Netlify's ESM Web API. */
export function toWebHandler(
  handler: (event: object, context: object) => Promise<object>,
) {
  return async (
    request: Request,
    context: { ip?: string; requestId?: string } = {},
  ): Promise<Response> => {
    const url = new URL(request.url);
    const result = (await handler(
      {
        version: "2.0",
        rawPath: url.pathname,
        rawQueryString: url.search.slice(1),
        headers: Object.fromEntries(request.headers),
        requestContext: {
          requestId: context.requestId,
          domainName: url.hostname,
          http: {
            method: request.method,
            path: url.pathname,
            protocol: "HTTP/1.1",
            sourceIp: context.ip ?? "127.0.0.1",
            userAgent: request.headers.get("user-agent") ?? "",
          },
        },
        body: Buffer.from(await request.arrayBuffer()).toString("base64"),
        isBase64Encoded: true,
      },
      context,
    )) as LambdaResult;
    const headers = new Headers();
    for (const [name, value] of Object.entries(result.headers ?? {}))
      headers.set(name, String(value));
    for (const [name, values] of Object.entries(
      result.multiValueHeaders ?? {},
    )) {
      headers.delete(name);
      for (const value of values) headers.append(name, value);
    }
    for (const cookie of result.cookies ?? [])
      headers.append("set-cookie", cookie);
    const body =
      request.method === "HEAD" || [204, 205, 304].includes(result.statusCode)
        ? null
        : result.isBase64Encoded
          ? Buffer.from(result.body, "base64")
          : result.body;
    return new Response(body, { status: result.statusCode, headers });
  };
}
