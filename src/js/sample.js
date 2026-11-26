import { weekDays, weekStart } from "./dates.js";

export const SAMPLE_SHEETS = {
  A: "11111111-1111-4111-8111-111111111111",
  B: "22222222-2222-4222-8222-222222222222",
  C: "33333333-3333-4333-8333-333333333333",
};

export async function seedSample(store, today) {
  const days = weekDays(today);
  const earlier = days.find((day) => day < today) || days[0];
  await store.patchDaily(today, {
    oneLine: "그럴 수 있지.",
    emotionFelt: "조급함이 올라왔습니다.",
    thoughtHeld: "오늘은 한 가지만 붙잡습니다.",
    choices: "물을 마시고 창을 엽니다.",
    feelingNote: "숨이 조금 편해집니다.",
    resultNote: "",
    beliefToAccept: "회의가 길어진 것은 그럴 수 있지.",
    nextAction: "물 한 잔 마시고 창을 연다.",
    tasks: [{ id: "sample-task-1", text: "창을 연다", nextFix: "하나 배운 거지" }],
  });
  if (earlier !== today) {
    await store.patchDaily(earlier, { oneLine: "오늘은 이 한 가지만 해보자." });
  }
  await store.patchWeekly(weekStart(today), {
    choice1: "조급할 때는 한 줄만 적는다",
    feelingNote: "적고 나면 조금 편하다",
    resultNote: "다음 행동이 하나 남는다",
    nextFix: "빈 날은 그대로 두고 오늘만 적는다",
    tasks: [{ id: "sample-week-task", text: "저녁에 창을 닫기 전에 한 줄", nextFix: "" }],
  });
  await store.createWorksheet({ id: SAMPLE_SHEETS.A, type: "A", entryDate: today, dailyDate: today });
  await store.patchWorksheet(SAMPLE_SHEETS.A, {
    body: {
      fact: "회의가 예정보다 길어졌다.",
      autoSentence: "이렇게 길어지면 안 되는데.",
      acceptLine: "그럴 수 있지.",
      protects: "이미 끝난 일을 붙잡지 않아도 됩니다.",
    },
  });
  await store.createWorksheet({ id: SAMPLE_SHEETS.B, type: "B", entryDate: today, dailyDate: today });
  await store.patchWorksheet(SAMPLE_SHEETS.B, {
    body: {
      situation: "계획이 한 칸 밀렸다.",
      fixedBelief: "계획대로가 아니면 안 된다.",
      reframed: "밀린 것은 다음에 고칠 정보다.",
      nextAction: "내일 첫 일에 그 한 칸만 둔다.",
    },
  });
  await store.createWorksheet({ id: SAMPLE_SHEETS.C, type: "C", entryDate: today, dailyDate: today });
  await store.patchWorksheet(SAMPLE_SHEETS.C, {
    body: {
      stuck: "시작이 무겁다.",
      nextAction: "물 한 잔 마시고 창을 연다.",
    },
  });
}
