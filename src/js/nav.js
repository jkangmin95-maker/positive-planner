export const SIDE_LINKS = [
  { href: "/", label: "홈", note: "오늘 한 줄로 돌아오는 문", nav: "home" },
  { href: "/today", label: "오늘", note: "하루의 칸", nav: "today" },
  { href: "/week", label: "주간", note: "이번 주 선택과 요일", nav: "week" },
  { href: "/worksheet", label: "워크시트", note: "그럴 수 있지 · 고정관념 전환 · 책임 선택", nav: "worksheet" },
  { href: "/review", label: "회고", note: "채우지 않으셔도 됩니다", nav: "review" },
  { href: "/month", label: "월간", note: "원리 하나, 구조 한 칸", nav: "month" },
  { href: "/practice", label: "7일 연습", note: "원하는 날만 여셔도 됩니다", nav: "practice" },
  { href: "/guide", label: "사용법", note: "짧은 안내와 공식 카드", nav: "guide" },
  { href: "/install", label: "홈 화면에 추가", note: "iPhone · Android · PC", nav: "install" },
  { href: "/settings", label: "설정", note: "내보내기, 출발점", nav: "settings" },
];

export const MORE_LINKS = SIDE_LINKS.filter((item) => item.nav !== "today" && item.nav !== "week");

export function tabFor(name) {
  if (name === "today") return "today";
  if (name === "week") return "week";
  if (name === "home") return "";
  return "more";
}
