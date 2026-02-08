import { serveStatic } from "hono/bun";
import type { ViteDevServer } from "vite";
import { createServer as createViteServer } from "vite";
import { join } from "path";
import config from "./zosite.json";
import { Hono } from "hono";
import { getRecentRegistrations, createRegistration } from "./backend-lib/db";
import { z } from "zod";
import {
  getAvailableDates,
  getDayData,
  getOverview,
  getAppUsageForDate,
  addNote,
  saveBlog,
  getSettings,
  updateSetting,
} from "./backend-lib/tracker-db";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const dateSchema = z.string().regex(DATE_REGEX, "Invalid date format (expected YYYY-MM-DD)");
const noteSchema = z.object({
  timestamp: z.string().min(1),
  content: z.string().min(1).max(10_000),
  logical_date: z.string().regex(DATE_REGEX),
});
const blogSchema = z.object({
  content: z.string().max(100_000),
});
const settingsSchema = z.record(
  z.string().max(100),
  z.unknown()
);

type Mode = "development" | "production";
const app = new Hono();

const mode: Mode =
  process.env.NODE_ENV === "production" ? "production" : "development";

// Favicon - served before any middleware to avoid Vite intercepting it
const FAVICON_PATH = join(import.meta.dir, "public", "favicon.png");
app.get("/favicon.png", async (c) => {
  const file = Bun.file(FAVICON_PATH);
  return new Response(file, {
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=3600" },
  });
});
app.get("/favicon.ico", (c) => c.redirect("/favicon.png", 302));

/**
 * Add any API routes here.
 */
app.get("/api/hello-zo", (c) => c.json({ msg: "Hello from Zo" }));

// Event registration endpoints (namespaced under _zo to avoid conflicts)
app.get("/api/_zo/demo/registrations", (c) => {
  const registrations = getRecentRegistrations();
  return c.json(registrations);
});

app.post("/api/_zo/demo/register", async (c) => {
  const body = await c.req.json();
  const { name, email, company, notes } = body;

  if (!name || !email) {
    return c.json({ error: "Name and email are required" }, 400);
  }

  const registration = createRegistration(name, email, company, notes);
  return c.json(registration, 201);
});

// ============================================================================
// Time Tracker API Routes
// ============================================================================

/**
 * GET /api/tracker/dates
 * Returns list of available dates with data
 */
app.get("/api/tracker/dates", async (c) => {
  try {
    const dates = await getAvailableDates();
    return c.json({ dates });
  } catch (error) {
    console.error("Error fetching dates:", error);
    return c.json({ error: "Failed to fetch dates", dates: [] }, 500);
  }
});

/**
 * GET /api/tracker/day/:logicalDate
 * Returns all data for a specific logical date
 */
app.get("/api/tracker/day/:logicalDate", async (c) => {
  try {
    const parsed = dateSchema.safeParse(c.req.param("logicalDate"));
    if (!parsed.success) {
      return c.json({ error: "Invalid date format" }, 400);
    }
    const data = await getDayData(parsed.data);
    return c.json(data);
  } catch (error) {
    console.error("Error fetching day data:", error);
    return c.json({ error: "Failed to fetch day data" }, 500);
  }
});

/**
 * GET /api/tracker/day/:logicalDate/apps
 * Returns app usage breakdown with durations for a date
 */
app.get("/api/tracker/day/:logicalDate/apps", async (c) => {
  try {
    const parsed = dateSchema.safeParse(c.req.param("logicalDate"));
    if (!parsed.success) {
      return c.json({ error: "Invalid date format" }, 400);
    }
    const apps = await getAppUsageForDate(parsed.data);
    return c.json({ apps });
  } catch (error) {
    console.error("Error fetching app usage:", error);
    return c.json({ error: "Failed to fetch app usage" }, 500);
  }
});

/**
 * GET /api/tracker/overview
 * Returns aggregated stats across a date range
 */
app.get("/api/tracker/overview", async (c) => {
  try {
    const from = c.req.query("from");
    const to = c.req.query("to");
    if (from && !DATE_REGEX.test(from)) return c.json({ error: "Invalid 'from' date" }, 400);
    if (to && !DATE_REGEX.test(to)) return c.json({ error: "Invalid 'to' date" }, 400);
    const limit = Math.min(Math.max(parseInt(c.req.query("limit") || "30", 10) || 30, 1), 365);

    const days = await getOverview(from, to, limit);
    return c.json({ days });
  } catch (error) {
    console.error("Error fetching overview:", error);
    return c.json({ error: "Failed to fetch overview" }, 500);
  }
});

/**
 * POST /api/tracker/note
 * Add a note at a specific timestamp
 */
app.post("/api/tracker/note", async (c) => {
  try {
    const body = await c.req.json();
    const parsed = noteSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, 400);
    }

    await addNote(parsed.data.timestamp, parsed.data.content, parsed.data.logical_date);
    return c.json({ success: true });
  } catch (error) {
    console.error("Error adding note:", error);
    return c.json({ error: "Failed to add note" }, 500);
  }
});

/**
 * PUT /api/tracker/blog/:logicalDate
 * Save or update the daily blog
 */
app.put("/api/tracker/blog/:logicalDate", async (c) => {
  try {
    const dateParsed = dateSchema.safeParse(c.req.param("logicalDate"));
    if (!dateParsed.success) return c.json({ error: "Invalid date format" }, 400);

    const body = await c.req.json();
    const parsed = blogSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, 400);
    }

    await saveBlog(dateParsed.data, parsed.data.content);
    return c.json({ success: true });
  } catch (error) {
    console.error("Error saving blog:", error);
    return c.json({ error: "Failed to save blog" }, 500);
  }
});

/**
 * GET /api/tracker/settings
 * Get all settings
 */
app.get("/api/tracker/settings", async (c) => {
  try {
    const settings = await getSettings();
    return c.json(settings);
  } catch (error) {
    console.error("Error fetching settings:", error);
    return c.json({ error: "Failed to fetch settings" }, 500);
  }
});

/**
 * PUT /api/tracker/settings
 * Update settings
 */
app.put("/api/tracker/settings", async (c) => {
  try {
    const body = await c.req.json();
    const parsed = settingsSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "Invalid settings format" }, 400);
    }

    for (const [key, value] of Object.entries(parsed.data)) {
      await updateSetting(key, value);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Error updating settings:", error);
    return c.json({ error: "Failed to update settings" }, 500);
  }
});

// ============================================================================
// Static file serving and SPA routing
// ============================================================================

if (mode === "production") {
  configureProduction(app);
} else {
  await configureDevelopment(app);
}

/**
 * Determine port based on mode. In production, use the published_port if available.
 * In development, always use the local_port.
 * DO NOT edit this port manually. Ports are managed by the system via the zosite.json config.
 */
const port =
  mode === "production"
    ? (config.publish?.published_port ?? config.local_port)
    : config.local_port;

export default { fetch: app.fetch, port, hostname: "127.0.0.1", idleTimeout: 255 };

/**
 * Configure routing for production builds.
 *
 * - Streams prebuilt assets from `dist`.
 * - Falls back to `index.html` for any other GET so the SPA router can resolve the request.
 */
function configureProduction(app: Hono) {
  app.use("/assets/*", serveStatic({ root: "./dist" }));
  app.use(async (c, next) => {
    if (c.req.method !== "GET") {
      return next();
    }

    const path = c.req.path;
    if (path.startsWith("/api/") || path.startsWith("/assets/")) {
      return next();
    }

    return serveStatic({ path: "./dist/index.html" })(c, next);
  });
}

/**
 * Configure routing for development builds.
 *
 * - Boots Vite in middleware mode for transforms.
 * - Mirrors production routing semantics so SPA routes behave consistently.
 */
async function configureDevelopment(app: Hono): Promise<ViteDevServer> {
  // Close any previous Vite instance left over from a Bun --hot reload.
  // globalThis survives hot reloads, so we use it as a cleanup mechanism.
  const prev = (globalThis as any).__vite as ViteDevServer | undefined;
  if (prev) {
    await prev.close().catch(() => {});
  }

  const vite = await createViteServer({
    server: { middlewareMode: true, hmr: false, ws: false },
    appType: "custom",
  });

  (globalThis as any).__vite = vite;

  app.use("*", async (c, next) => {
    if (c.req.path.startsWith("/api/")) {
      return next();
    }

    const url = c.req.path;
    try {
      if (url === "/" || url === "/index.html") {
        let template = await Bun.file("./index.html").text();
        template = await vite.transformIndexHtml(url, template);
        return c.html(template);
      }

      let result;
      try {
        result = await vite.transformRequest(url);
      } catch {
        result = null;
      }

      if (result) {
        return new Response(result.code, {
          headers: {
            "Content-Type": "application/javascript",
            "Cache-Control": "no-cache",
          },
        });
      }
      const file = Bun.file(`.${url}`);
      if (await file.exists()) {
        return new Response(file, {
          headers: { "Cache-Control": "no-cache" },
        });
      }
      let template = await Bun.file("./index.html").text();
      template = await vite.transformIndexHtml("/", template);
      return c.html(template);
    } catch (error) {
      vite.ssrFixStacktrace(error as Error);
      console.error(error);
      return c.text("Internal Server Error", 500);
    }
  });

  return vite;
}
