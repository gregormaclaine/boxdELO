import { chromium, type Browser } from "playwright";

export interface ScrapedFilm {
  slug: string;
  title: string;
  year: number | null;
}

export interface ScrapedPage {
  films: ScrapedFilm[];
  // Total pages in the pagination, or 1 if no pagination is present.
  totalPages: number;
}

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const LAZY_POSTER_SEL = '.react-component[data-component-class="LazyPoster"]';

const CTX_OPTIONS = {
  userAgent: USER_AGENT,
  viewport: { width: 1280, height: 800 } as const,
  locale: "en-US",
  timezoneId: "America/New_York",
};

// Parse "Film Title (2024)" → { title: "Film Title", year: 2024 }
function parseItemName(name: string): { title: string; year: number | null } {
  const match = name.match(/^(.*?)\s+\((\d{4})\)$/);
  if (match) return { title: match[1], year: parseInt(match[2], 10) };
  return { title: name, year: null };
}

let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.isConnected()) {
    browserInstance = await chromium.launch({ headless: true });
  }
  return browserInstance;
}

export async function scrapeFilmsPage(
  username: string,
  pageNum: number
): Promise<ScrapedPage> {
  const expectedPath = `/${username}/films/page/${pageNum}/`;

  // A fresh context per page is required: a shared context causes the AJAX
  // fetch that populates data-item-slug to silently fail on pages 2+.
  const browser = await getBrowser();
  const context = await browser.newContext(CTX_OPTIONS);
  const page = await context.newPage();

  try {
    const pageUrl = `https://letterboxd.com${expectedPath}`;

    // Letterboxd fires two requests to the page URL:
    //   1st — initial HTML navigation
    //   2nd — React's AJAX fetch that loads the page-specific film data
    // We must wait for the 2nd before scraping; otherwise we may read stale
    // SSR content (which defaults to page 1) instead of the correct page's films.
    let pageUrlHits = 0;
    const dataFetched = page
      .waitForResponse(
        (res) => {
          if (res.url() === pageUrl && res.status() === 200) {
            pageUrlHits++;
            return pageUrlHits >= 2;
          }
          return false;
        },
        { timeout: 20_000 }
      )
      .catch(() => null);

    // Also wait for the first poster response as a secondary hydration signal.
    const posterLoaded = page
      .waitForResponse(
        (res) => res.url().includes("/poster/") && res.status() === 200,
        { timeout: 20_000 }
      )
      .catch(() => null);

    await page.goto(pageUrl, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });

    // Wait for both signals; either alone is insufficient on some pages.
    await Promise.race([
      Promise.all([dataFetched, posterLoaded]),
      // Safety timeout so a page that never fires posters still proceeds.
      new Promise((r) => setTimeout(r, 18_000)),
    ]);

    // If Letterboxd redirected to a different page (e.g. beyond last page → page 1), stop.
    const landedPath = new URL(page.url()).pathname;
    if (landedPath !== expectedPath) return { films: [], totalPages: 0 };

    // Extract total pages from the pagination widget.
    // The widget lists page numbers; the highest linked number is the last page.
    // If there's no pagination the account fits on a single page.
    const totalPages = await page
      .$$eval('.paginate-pages a[href*="/page/"]', (els) => {
        const nums = els.map((el) => {
          const m = el.getAttribute("href")?.match(/\/page\/(\d+)\//);
          return m ? parseInt(m[1], 10) : 0;
        });
        return nums.length > 0 ? Math.max(...nums) : 1;
      })
      .catch(() => 1);

    const rawFilms = await page.$$eval(LAZY_POSTER_SEL, (elements) =>
      elements
        .map((el) => ({
          slug: el.getAttribute("data-item-slug") ?? "",
          name: el.getAttribute("data-item-name") ?? "",
        }))
        .filter((f) => f.slug && f.name)
    );

    const films = rawFilms.map((f) => {
      const { title, year } = parseItemName(f.name);
      return { slug: f.slug, title, year };
    });

    return { films, totalPages };
  } finally {
    await context.close();
  }
}

export async function validateUsername(username: string): Promise<boolean> {
  const browser = await getBrowser();
  const context = await browser.newContext(CTX_OPTIONS);
  try {
    const page = await context.newPage();
    const res = await page.goto(`https://letterboxd.com/${username}/`, {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    });
    return (res?.status() ?? 0) < 400;
  } catch {
    return false;
  } finally {
    await context.close();
  }
}
