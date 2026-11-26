import { renderToday } from "./today.js";

export async function renderHome(ctx, route) {
  return renderToday(ctx, route);
}
