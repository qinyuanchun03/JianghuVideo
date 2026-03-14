import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Proxy API route to bypass CORS and support LunaTV-config style features
  app.get("/api/proxy", async (req, res) => {
    try {
      const format = req.query.format as string;
      const source = req.query.source as string || 'full';
      const targetUrl = req.query.url as string;

      // Handle source fetching (LunaTV-config style)
      if (format !== undefined) {
        const sourceFiles: Record<string, string> = {
          'full': 'LunaTV-config.json',
          'jin18': 'jin18.json',
          'jingjian': 'jingjian.json'
        };
        const fileName = sourceFiles[source] || sourceFiles['full'];
        const githubUrl = `https://raw.githubusercontent.com/qinyuanchun03/LunaTV-config/main/${fileName}`;
        
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
      }

      if (!targetUrl) {
        return res.status(400).json({ error: "Missing url parameter" });
      }

      const url = new URL(targetUrl);
      
      // Forward other query parameters
      Object.entries(req.query).forEach(([key, value]) => {
        if (key !== 'url' && key !== 'format' && key !== 'source' && typeof value === 'string') {
          url.searchParams.append(key, value);
        }
      });

      const response = await fetch(url.toString(), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Upstream returned ${response.status}`);
      }

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        return res.status(500).json({ error: "Upstream API did not return valid JSON. Please check if the API URL is correct and supports JSON output.", raw: text.substring(0, 200) });
      }
      res.json(data);
    } catch (error: any) {
      console.error("Proxy error:", error);
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
