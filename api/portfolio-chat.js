export const config = { runtime: "edge" };

export default async function handler(request) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const upstreamUrl = process.env.CHATBOT_PORTFOLIO_API_URL;
  const secret = process.env.PORTFOLIO_CHAT_SECRET;

  if (!upstreamUrl || !secret) {
    return new Response(
      JSON.stringify({ error: "server_misconfigured" }),
      {
        status: 503,
        headers: { "content-type": "application/json; charset=utf-8" },
      }
    );
  }

  const body = await request.text();

  let upstream;
  try {
    upstream = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-portfolio-chat-secret": secret,
      },
      body,
    });
  } catch {
    return new Response(
      JSON.stringify({ error: "upstream_unreachable" }),
      {
        status: 502,
        headers: { "content-type": "application/json; charset=utf-8" },
      }
    );
  }

  if (!upstream.ok) {
    return new Response(JSON.stringify({ error: "upstream_error" }), {
      status: 502,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "content-type":
        upstream.headers.get("content-type") || "text/plain; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
