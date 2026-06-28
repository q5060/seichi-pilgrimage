import type { AppLocale } from "@/i18n/routing";

export type NotificationCopyKey =
  | "follow"
  | "like"
  | "comment"
  | "route_invite"
  | "route_collaborator"
  | "achievement"
  | "moderation_approved"
  | "moderation_rejected"
  | "helpful"
  | "travelogue_published"
  | "travelogue_collaborator"
  | "activity";

export interface NotificationCopyVars {
  actorName?: string;
  targetTitle?: string;
  routeTitle?: string;
  achievementName?: string;
  body?: string;
}

const COPY: Record<
  AppLocale,
  Record<NotificationCopyKey, { title: string; body?: (v: NotificationCopyVars) => string }>
> = {
  "zh-TW": {
    follow: {
      title: "{actorName} 開始追蹤你",
    },
    like: {
      title: "{actorName} 按讚了你的內容",
    },
    comment: {
      title: "{actorName} 留言了",
      body: (v) => v.body ?? "",
    },
    route_invite: {
      title: "路線協作邀請",
      body: (v) => `你被邀請協作「${v.routeTitle ?? ""}」`,
    },
    route_collaborator: {
      title: "已加入路線協作",
      body: (v) => `你已成為「${v.routeTitle ?? ""}」的協作者`,
    },
    achievement: {
      title: "獲得新成就",
      body: (v) => v.achievementName ?? "",
    },
    moderation_approved: {
      title: "審核通過",
      body: (v) => v.targetTitle ?? "",
    },
    moderation_rejected: {
      title: "審核未通過",
      body: (v) => v.targetTitle ?? "",
    },
    helpful: {
      title: "{actorName} 覺得你的聖地資訊有幫助",
      body: (v) => v.targetTitle ?? "",
    },
    travelogue_published: {
      title: "遊記已發布",
      body: (v) => v.targetTitle ?? "",
    },
    travelogue_collaborator: {
      title: "遊記協作邀請",
      body: (v) => `你被邀請協作「${v.targetTitle ?? ""}」`,
    },
    activity: {
      title: "{actorName}",
      body: (v) => v.body ?? "",
    },
  },
  ja: {
    follow: {
      title: "{actorName} があなたをフォローしました",
    },
    like: {
      title: "{actorName} があなたの投稿にいいねしました",
    },
    comment: {
      title: "{actorName} がコメントしました",
      body: (v) => v.body ?? "",
    },
    route_invite: {
      title: "ルート共同編集の招待",
      body: (v) => `「${v.routeTitle ?? ""}」への共同編集に招待されました`,
    },
    route_collaborator: {
      title: "ルート共同編集に参加しました",
      body: (v) => `「${v.routeTitle ?? ""}」の共同編集者になりました`,
    },
    achievement: {
      title: "新しい実績を獲得",
      body: (v) => v.achievementName ?? "",
    },
    moderation_approved: {
      title: "審査が承認されました",
      body: (v) => v.targetTitle ?? "",
    },
    moderation_rejected: {
      title: "審査が却下されました",
      body: (v) => v.targetTitle ?? "",
    },
    helpful: {
      title: "{actorName} があなたの聖地情報に参考になったと評価しました",
      body: (v) => v.targetTitle ?? "",
    },
    travelogue_published: {
      title: "旅行記が公開されました",
      body: (v) => v.targetTitle ?? "",
    },
    travelogue_collaborator: {
      title: "旅行記共同編集の招待",
      body: (v) => `「${v.targetTitle ?? ""}」への共同編集に招待されました`,
    },
    activity: {
      title: "{actorName}",
      body: (v) => v.body ?? "",
    },
  },
};

function interpolate(template: string, vars: NotificationCopyVars): string {
  return template
    .replace("{actorName}", vars.actorName ?? "")
    .replace("{targetTitle}", vars.targetTitle ?? "");
}

export function getNotificationCopy(
  key: NotificationCopyKey,
  locale: AppLocale,
  vars: NotificationCopyVars = {}
): { title: string; body?: string } {
  const entry = COPY[locale === "ja" ? "ja" : "zh-TW"][key];
  const title = interpolate(entry.title, vars);
  const body = entry.body?.(vars);
  return body !== undefined && body !== "" ? { title, body } : { title };
}
