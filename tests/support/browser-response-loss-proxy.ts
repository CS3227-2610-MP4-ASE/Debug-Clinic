// Owned synthetic transport fault, outside production composition and app code.
import {
  createServer,
  request as upstreamRequest,
  type Server,
} from "node:http";

export function createBrowserResponseLossProxy(
  upstream: URL,
  claimPublicationDrop: () => Promise<boolean>,
): Server {
  if (upstream.protocol !== "http:" || upstream.hostname !== "127.0.0.1")
    throw new Error("Response-loss proxy requires an owned loopback upstream");
  return createServer((request, response) => {
    void (async () => {
      const target = new URL(request.url ?? "/", upstream);
      if (target.origin !== upstream.origin) {
        response.writeHead(400).end();
        return;
      }
      const drop =
        request.method === "POST" &&
        request.url === "/api/v1/instructor/questions/publish" &&
        (await claimPublicationDrop());
      const forwarded = upstreamRequest(
        target,
        {
          method: request.method,
          headers: { ...request.headers, host: upstream.host },
        },
        (received) => {
          received.on("error", () => response.destroy());
          if (drop && received.statusCode === 200) {
            // The real application has committed and completed its success response.
            // Drain it before dropping the downstream connection without a response.
            received.on("end", () => response.destroy());
            received.resume();
            return;
          }
          response.writeHead(received.statusCode ?? 502, received.headers);
          received.pipe(response);
        },
      );
      forwarded.on("error", () => {
        if (!response.headersSent) response.writeHead(502);
        response.end();
      });
      request.on("aborted", () => forwarded.destroy());
      request.pipe(forwarded);
    })().catch(() => {
      if (!response.headersSent) response.writeHead(502);
      response.end();
    });
  });
}
