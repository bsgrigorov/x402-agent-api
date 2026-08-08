/** Stub entry so wrangler can load this package for D1 migrations only. */
export default {
  fetch(): Response {
    return new Response("x402-agent-db: migrate package (not a product worker)\n", {
      status: 404,
    });
  },
};
