// Access types for spots
export const ACCESS_TYPES = [
  "free_photo",
  "purchase_required",
  "private_residence",
  "demolished",
  "uncertain",
] as const;
export type AccessType = (typeof ACCESS_TYPES)[number];

export const ACCESS_TYPE_LABELS: Record<AccessType, string> = {
  free_photo: "可自由拍攝",
  purchase_required: "店內需消費",
  private_residence: "私人住宅請勿打擾",
  demolished: "已拆除",
  uncertain: "不確定",
};

// Spot status
export const SPOT_STATUSES = [
  "open",
  "closed",
  "renovated",
  "restricted",
  "pending_review",
] as const;
export type SpotStatus = (typeof SPOT_STATUSES)[number];

export const SPOT_STATUS_LABELS: Record<SpotStatus, string> = {
  open: "正常開放",
  closed: "已關閉",
  renovated: "已改建",
  restricted: "限制進入",
  pending_review: "待審核",
};

// Anime pilgrimage status (user)
export const PILGRIMAGE_STATUSES = [
  "want",
  "planning",
  "in_progress",
  "completed",
  "revisit",
] as const;
export type PilgrimageStatus = (typeof PILGRIMAGE_STATUSES)[number];

export const PILGRIMAGE_STATUS_LABELS: Record<PilgrimageStatus, string> = {
  want: "想巡禮",
  planning: "規劃中",
  in_progress: "進行中",
  completed: "已完成",
  revisit: "重訪",
};

// Privacy
export const PRIVACY_LEVELS = ["public", "followers", "private"] as const;
export type PrivacyLevel = (typeof PRIVACY_LEVELS)[number];

// Moderation
export const MODERATION_STATUSES = [
  "pending",
  "approved",
  "rejected",
] as const;
export type ModerationStatus = (typeof MODERATION_STATUSES)[number];

// Location report types
export const LOCATION_REPORT_TYPES = [
  "still_open",
  "closed",
  "renovated",
  "restricted",
  "other",
] as const;
export type LocationReportType = (typeof LOCATION_REPORT_TYPES)[number];

export const LOCATION_REPORT_LABELS: Record<LocationReportType, string> = {
  still_open: "仍開放",
  closed: "已關閉",
  renovated: "已改建",
  restricted: "被驅趕/限制",
  other: "其他",
};

// Photo tags
export const PHOTO_TAGS = [
  "comparison",
  "scenery",
  "detail",
  "food",
  "other",
] as const;
export type PhotoTag = (typeof PHOTO_TAGS)[number];

// List types
export const LIST_TYPES = [
  "wishlist",
  "top_picks",
  "photo_spots",
  "region",
  "custom",
] as const;
export type ListType = (typeof LIST_TYPES)[number];

// Activity types for feed
export const ACTIVITY_TYPES = [
  "visit",
  "travelogue",
  "photo",
  "spot_edit",
  "location_report",
  "list",
  "route",
  "follow",
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

// Reaction targets
export const REACTION_TARGETS = [
  "visit",
  "travelogue",
  "photo",
  "spot",
  "comment",
  "anime",
  "region",
] as const;
export type ReactionTarget = (typeof REACTION_TARGETS)[number];

// User roles
export const USER_ROLES = ["user", "moderator", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

// Japan prefectures
export const PREFECTURES = [
  "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
  "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
  "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県",
  "静岡県", "愛知県", "三重県", "滋賀県", "京都府", "大阪府", "兵庫県",
  "奈良県", "和歌山県", "鳥取県", "島根県", "岡山県", "広島県", "山口県",
  "徳島県", "香川県", "愛媛県", "高知県", "福岡県", "佐賀県", "長崎県",
  "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県",
] as const;
export type Prefecture = (typeof PREFECTURES)[number];

// Achievement definitions
export const ACHIEVEMENTS = {
  first_visit: { id: "first_visit", name: "初回巡禮", description: "完成第一次聖地打卡" },
  ten_spots: { id: "ten_spots", name: "巡禮新手", description: "造訪 10 個聖地" },
  fifty_spots: { id: "fifty_spots", name: "巡禮達人", description: "造訪 50 個聖地" },
  prefecture_5: { id: "prefecture_5", name: "五都道府", description: "造訪 5 個都道府縣" },
  prefecture_10: { id: "prefecture_10", name: "十都道府", description: "造訪 10 個都道府縣" },
  anime_complete: { id: "anime_complete", name: "完結巡禮", description: "完成一部作品全部聖地" },
  first_travelogue: { id: "first_travelogue", name: "遊記作家", description: "發布第一篇遊記" },
  contributor_10: { id: "contributor_10", name: "情報貢獻者", description: "提交 10 筆現況回報" },
  contributor_50: { id: "contributor_50", name: "聖地守護者", description: "提交 50 筆現況回報" },
  photo_comparison: { id: "photo_comparison", name: "對位大師", description: "上傳 5 張對比照" },
} as const;

export type AchievementId = keyof typeof ACHIEVEMENTS;

// Travelogue block types
export const TRAVELOGUE_BLOCK_TYPES = [
  "paragraph",
  "heading",
  "quote",
  "spot_card",
  "route_segment",
  "photo_gallery",
  "comparison",
  "map_embed",
  "expense",
] as const;
export type TravelogueBlockType = (typeof TRAVELOGUE_BLOCK_TYPES)[number];

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface AnimeTitles {
  romaji?: string;
  english?: string;
  native?: string;
  chinese?: string;
}

export interface SpotAnimeScene {
  episode?: string;
  timestamp?: string;
  description?: string;
  screenshotUrl?: string;
}
