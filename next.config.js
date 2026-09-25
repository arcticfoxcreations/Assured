/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "no-referrer" },
          // geolocation is intentionally NOT locked to (self): a locked-down policy
          // blocks the browser's permission prompt outright (no prompt ever appears,
          // it just silently reports "denied") whenever the page is opened inside any
          // preview/embed frame with a different origin — e.g. a hosting dashboard's
          // preview pane, a QR-code test wrapper, or a Codespaces/webcontainer preview.
          // Allowing it broadly here does not grant location by itself — the browser's
          // own permission prompt still has to run and the user still has to press
          // Allow; this only stops the policy from pre-emptively blocking that prompt.
          { key: "Permissions-Policy", value: "geolocation=*, microphone=(self)" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
