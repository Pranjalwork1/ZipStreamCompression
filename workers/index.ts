export interface Env {
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // If path is not root '/' and ends with a trailing slash '/', 301 redirect to clean path
    if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
      url.pathname = url.pathname.replace(/\/+$/, '');
      return Response.redirect(url.toString(), 301);
    }

    // Serve static assets or fallback to single-page-application
    return env.ASSETS.fetch(request);
  },
};
