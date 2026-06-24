/**
 * Web search utility using Bocha Search API (博查)
 * - For Qwen models: use DashScope native enable_search instead
 * - For other models: use this via Tool Calling
 */

export interface SearchResult {
  title: string;
  snippet: string;
  url: string;
}

const BOCHA_API_URL = "https://api.bochaai.com/v1/web-search";

/**
 * Search the web using Bocha API
 */
export async function webSearch(query: string, maxResults: number = 5): Promise<SearchResult[]> {
  const apiKey = process.env.BOCHA_API_KEY;
  if (!apiKey) {
    console.error("[WebSearch] BOCHA_API_KEY not configured");
    return [];
  }

  try {
    const res = await fetch(BOCHA_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query,
        count: maxResults,
        freshness: "noLimit",
        summary: true,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      console.error(`[WebSearch] Bocha API error ${res.status}: ${errText}`);
      return [];
    }

    const data = await res.json();
    const results = data?.data?.webPages?.value || [];

    return results.slice(0, maxResults).map((item: Record<string, unknown>) => ({
      title: item.name || "",
      snippet: item.summary || item.snippet || "",
      url: item.url || "",
    }));
  } catch (err) {
    console.error("[WebSearch] Error:", err);
    return [];
  }
}
