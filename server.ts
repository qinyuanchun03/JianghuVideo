import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";

// Disable SSL verification for proxy requests to handle misconfigured MacCMS certificates
// This is necessary because many MacCMS providers use self-signed or expired certificates.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Proxy API route to bypass CORS and support LunaTV-config style features
  app.get("/api/proxy", async (req, res) => {
    const targetUrl = req.query.url as string;
    
    try {
      const format = req.query.format as string;
      const source = req.query.source as string || 'full';

      // Handle source fetching (LunaTV-config style)
      if (format !== undefined) {
        const sourceFiles: Record<string, string> = {
          'full': 'LunaTV-config.json',
          'jin18': 'jin18.json',
          'jingjian': 'jingjian.json'
        };
        const fileName = sourceFiles[source] || sourceFiles['full'];
        const githubUrl = `https://raw.githubusercontent.com/qinyuanchun03/LunaTV-config/main/${fileName}`;
        
        try {
          const response = await fetch(githubUrl);
          if (!response.ok) throw new Error(`Failed to fetch source from GitHub: ${response.status}`);
          
          const config = await response.json();
          
          // If format is 1 (proxy), we prefix the API URLs with our local proxy
          if (format === '1' || format === 'proxy') {
            const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;
            const proxyPrefix = `${appUrl}/api/proxy?url=`;
            
            if (config.api_site) {
              Object.keys(config.api_site).forEach(key => {
                const site = config.api_site[key];
                if (site.api) {
                  site.api = `${proxyPrefix}${encodeURIComponent(site.api)}`;
                }
              });
            }
          }
          
          return res.json(config);
        } catch (e: any) {
          console.error(`[Proxy] GitHub fetch error: ${e.message}`);
          return res.status(500).json({ error: "Failed to fetch configuration source" });
        }
      }

      if (!targetUrl) {
        return res.status(400).json({ error: "Missing url parameter" });
      }

      let url: URL;
      try {
        url = new URL(targetUrl);
      } catch (e) {
        return res.status(400).json({ error: "Invalid target URL" });
      }
      
      // Forward other query parameters
      Object.entries(req.query).forEach(([key, value]) => {
        if (key !== 'url' && key !== 'format' && key !== 'source' && typeof value === 'string') {
          // Only append if it's not already in the target URL
          if (!url.searchParams.has(key)) {
            url.searchParams.append(key, value);
          }
        }
      });

      // Ensure we request JSON if possible
      if (!url.searchParams.has('ac')) {
        url.searchParams.append('ac', 'list');
      }
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000); // Increased to 20s

      const upstreamStartTime = Date.now();
      try {
        const response = await fetch(url.toString(), {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Referer': url.origin,
            'Origin': url.origin
          }
        });
        
        const upstreamEndTime = Date.now();
        const upstreamDuration = upstreamEndTime - upstreamStartTime;
        
        clearTimeout(timeout);

        if (!response.ok) {
          console.error(`[Proxy] Upstream error: ${response.status} for ${url.toString()}`);
          return res.status(response.status).json({ 
            error: `Upstream error ${response.status}`,
            url: url.toString()
          });
        }

        const text = await response.text();
        
        // Add timing header
        res.setHeader('X-Upstream-Time', upstreamDuration.toString());

        // Check if it's actually JSON
        if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
          try {
            const data = JSON.parse(text);
            return res.json(data);
          } catch (e) {
            console.error(`[Proxy] JSON parse error for ${url.toString()}`);
          }
        }

        // If not JSON, it might be an error page or XML
        console.warn(`[Proxy] Non-JSON response from ${url.toString()}`);
        return res.status(502).json({ 
          error: "Upstream API did not return valid JSON.", 
          details: "The server might be down, under maintenance, or blocking the request.",
          rawPreview: text.substring(0, 100)
        });

      } catch (e: any) {
        clearTimeout(timeout);
        if (e.name === 'AbortError') {
          console.error(`[Proxy] Timeout for ${url.toString()}`);
          return res.status(504).json({ error: "Upstream request timed out (20s)" });
        }
        throw e;
      }
    } catch (error: any) {
      console.error("[Proxy] Error:", error.message);
      res.status(500).json({ error: error.message || "Proxy request failed" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
