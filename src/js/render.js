import { renderHome } from "./screens/home.js";
import { renderToday } from "./screens/today.js";
import { renderWeek } from "./screens/week.js";
import { renderWorksheetEdit, renderWorksheetHome, renderWorksheetList } from "./screens/worksheets.js";
import { renderReview } from "./screens/review.js";
import { renderMonth } from "./screens/month.js";
import { renderSettings } from "./screens/settings.js";
import { renderGuide, renderInstall, renderMissing, renderMore, renderPractice } from "./screens/misc.js";

export function renderScreen(ctx, route) {
  switch (route.name) {
    case "home":
      return renderHome(ctx, route);
    case "today":
      return renderToday(ctx, route);
    case "week":
      return renderWeek(ctx, route);
    case "worksheets":
      return renderWorksheetHome();
    case "worksheet":
      return renderWorksheetList(ctx, route);
    case "worksheetEdit":
      return renderWorksheetEdit(ctx, route);
    case "review":
      return renderReview(ctx, route);
    case "month":
      return renderMonth(ctx, route);
    case "settings":
      return renderSettings(ctx);
    case "more":
      return renderMore();
    case "practice":
      return renderPractice();
    case "guide":
      return renderGuide();
    case "install":
      return renderInstall();
    default:
      return renderMissing();
  }
}
