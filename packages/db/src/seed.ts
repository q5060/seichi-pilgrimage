import { eq } from "drizzle-orm";
import type { AnimeTitles } from "@seichi/shared";
import { db } from "./index";
import {
  anime,
  animePilgrimageMeta,
  spots,
  spotAnimeLinks,
  users,
  travelogues,
} from "./schema";

function mediaToDbFormat(media: {
  id: number;
  title: { romaji?: string; english?: string; native?: string };
  coverImage?: { large?: string };
  bannerImage?: string;
  format?: string;
  status?: string;
  episodes?: number;
  season?: string;
  seasonYear?: number;
  genres?: string[];
  description?: string;
  averageScore?: number;
}) {
  return {
    anilistId: media.id,
    titles: {
      romaji: media.title.romaji,
      english: media.title.english,
      native: media.title.native,
    } as AnimeTitles,
    coverImage: media.coverImage?.large ?? null,
    bannerImage: media.bannerImage ?? null,
    format: media.format ?? null,
    status: media.status ?? null,
    episodes: media.episodes ?? null,
    season: media.season ?? null,
    seasonYear: media.seasonYear ?? null,
    genres: media.genres ?? [],
    description: media.description?.replace(/<[^>]*>/g, "") ?? null,
    averageScore: media.averageScore ?? null,
    syncedAt: new Date(),
  };
}

// Seed anime definitions with Chinese titles
const SEED_ANIME = [
  { anilistId: 21617, chinese: "你的名字。", popularity: 100, days: 2 },
  { anilistId: 142770, chinese: "鈴芽之旅", popularity: 95, days: 3 },
  { anilistId: 140960, chinese: "孤獨搖滾！", popularity: 90, days: 2 },
  { anilistId: 106286, chinese: "天氣之子", popularity: 85, days: 2 },
  { anilistId: 1887, chinese: "幸運星", popularity: 80, days: 1 },
];

interface SeedSpot {
  slug: string;
  nameZh: string;
  nameJa: string;
  lat: number;
  lng: number;
  prefecture: string;
  address: string;
  accessType: "free_photo" | "purchase_required" | "private_residence" | "uncertain";
  anilistIds: number[];
  episode?: string;
  scene?: string;
  transport?: string;
  station?: string;
  walkMin?: number;
  stayMin?: number;
  photoTips?: string;
  etiquette?: string;
}

const SEED_SPOTS: SeedSpot[] = [
  // 你的名字。— 飛驒
  { slug: "hida-shrine", nameZh: "飛驒山王宮朝日神社", nameJa: "飛騨山王宮朝日神社", lat: 36.2397, lng: 137.1856, prefecture: "岐阜県", address: "岐阜県飛騨市宮町90", accessType: "free_photo", anilistIds: [21617], episode: "劇場版", scene: "口嚼酒儀式處", station: "飛騨古川駅", walkMin: 15, stayMin: 30, photoTips: "傍晚光線最佳", etiquette: "神社境內請勿大聲喧嘩" },
  { slug: "hida-library", nameZh: "飛驒市圖書館", nameJa: "飛騨市図書館", lat: 36.2389, lng: 137.1892, prefecture: "岐阜県", address: "岐阜県飛騨市古川町上之町5", accessType: "free_photo", anilistIds: [21617], episode: "劇場版", scene: "圖書館約會", station: "飛騨古川駅", walkMin: 12, stayMin: 20 },
  { slug: "keta-wakamiya", nameZh: "氣多若宮神社", nameJa: "気多若宮神社", lat: 36.2556, lng: 137.1567, prefecture: "岐阜県", address: "岐阜県飛騨市一之町", accessType: "free_photo", anilistIds: [21617], episode: "劇場版", scene: "黃昏時分", stayMin: 30, photoTips: "夕陽時分最像動畫場景" },
  { slug: "hida-bridge", nameZh: "飛驒古川橋梁群", nameJa: "飛騨古川の橋", lat: 36.2365, lng: 137.1878, prefecture: "岐阜県", address: "岐阜県飛騨市", accessType: "free_photo", anilistIds: [21617], scene: "城市俯瞰", stayMin: 20 },
  { slug: "tokyo-shinjuku", nameZh: "新宿須賀神社", nameJa: "須賀神社", lat: 35.6851, lng: 139.7202, prefecture: "東京都", address: "東京都新宿区須賀町5", accessType: "free_photo", anilistIds: [21617], scene: "階梯相遇", station: "四ツ谷駅", walkMin: 10, stayMin: 30, etiquette: "階梯拍照請勿擋路" },
  { slug: "yoyogi-building", nameZh: "代代木會館", nameJa: "代々木会館", lat: 35.6855, lng: 139.7023, prefecture: "東京都", address: "東京都渋谷区代々木2", accessType: "uncertain", anilistIds: [21617], scene: "黃昏相遇", etiquette: "注意周邊交通" },
  { slug: "shibuya-scramble", nameZh: "澀谷十字路口", nameJa: "渋谷スクランブル交差点", lat: 35.6595, lng: 139.7004, prefecture: "東京都", address: "東京都渋谷区道玄坂", accessType: "free_photo", anilistIds: [21617], stayMin: 15 },
  { slug: "roppongi-hills", nameZh: "六本木新城", nameJa: "六本木ヒルズ", lat: 35.6605, lng: 139.7292, prefecture: "東京都", address: "東京都港区六本木6-10-1", accessType: "free_photo", anilistIds: [21617], stayMin: 30 },
  // 鈴芽之旅
  { slug: "miyazaki-misumi", nameZh: "三角西港", nameJa: "三角西港", lat: 32.6089, lng: 130.4678, prefecture: "熊本県", address: "熊本県宇城市三角町", accessType: "free_photo", anilistIds: [142770], episode: "劇場版", scene: "旅程起點", stayMin: 60 },
  { slug: "soza-port", nameZh: "宗像大社", nameJa: "宗像大社", lat: 33.8142, lng: 130.5356, prefecture: "福岡県", address: "福岡県宗像市", accessType: "free_photo", anilistIds: [142770], stayMin: 45 },
  { slug: "iwaki-latvia", nameZh: "Iwaki Lativia", nameJa: "いわきラトビアの森", lat: 37.0503, lng: 140.8878, prefecture: "福島県", address: "福島県いわき市", accessType: "purchase_required", anilistIds: [142770], stayMin: 60, etiquette: "園區內請遵守規定" },
  { slug: "ehime-mishima", nameZh: "御神木", nameJa: "御神木（愛媛）", lat: 33.8419, lng: 132.7656, prefecture: "愛媛県", address: "愛媛県北宇和郡鬼北町", accessType: "free_photo", anilistIds: [142770], stayMin: 30 },
  { slug: "kobe-meriken", nameZh: "神戶 Meriken Park", nameJa: "メリケンパーク", lat: 34.6828, lng: 135.1889, prefecture: "兵庫県", address: "兵庫県神戸市中央区", accessType: "free_photo", anilistIds: [142770], stayMin: 40 },
  // 孤獨搖滾 — 下北澤
  { slug: "shimokitazawa-station", nameZh: "下北澤車站", nameJa: "下北沢駅", lat: 35.6618, lng: 139.6682, prefecture: "東京都", address: "東京都世田谷区北沢", accessType: "free_photo", anilistIds: [140960], episode: "EP1", scene: "波奇初遇", station: "下北沢駅", stayMin: 15 },
  { slug: "shimokita-shell", nameZh: "SHELL 下北澤", nameJa: "SHELTER", lat: 35.6612, lng: 139.6695, prefecture: "東京都", address: "東京都世田谷区北沢2-18-2", accessType: "purchase_required", anilistIds: [140960], episode: "EP3", scene: "Live House", etiquette: "演出日請勿在門口聚集拍照" },
  { slug: "shimokita-chazawa", nameZh: "茶澤街", nameJa: "茶沢通り", lat: 35.6625, lng: 139.6678, prefecture: "東京都", address: "東京都世田谷区北沢", accessType: "free_photo", anilistIds: [140960], stayMin: 30 },
  { slug: "shimokita-izakaya", nameZh: "下北澤居酒屋街", nameJa: "下北沢飲み屋街", lat: 35.6608, lng: 139.6701, prefecture: "東京都", address: "東京都世田谷区北沢", accessType: "free_photo", anilistIds: [140960], episode: "EP5", stayMin: 20 },
  { slug: "shimokita-park", nameZh: "下北澤公園", nameJa: "下北沢公園", lat: 35.6638, lng: 139.6652, prefecture: "東京都", address: "東京都世田谷区池尻", accessType: "free_photo", anilistIds: [140960], stayMin: 20 },
  // 天氣之子 — 東京
  { slug: "shinjuku-garden", nameZh: "新宿御苑", nameJa: "新宿御苑", lat: 35.6852, lng: 139.7100, prefecture: "東京都", address: "東京都新宿区内藤町11", accessType: "purchase_required", anilistIds: [106286], stayMin: 90 },
  { slug: "odaiba-aqua", nameZh: "台場海濱公園", nameJa: "お台場海浜公園", lat: 35.6300, lng: 139.7756, prefecture: "東京都", address: "東京都港区台場", accessType: "free_photo", anilistIds: [106286], scene: "晴空場景", stayMin: 45 },
  { slug: "kishimojido", nameZh: "鬼子母神堂", nameJa: "鬼子母神堂", lat: 35.6436, lng: 139.6989, prefecture: "東京都", address: "東京都目黒区駒場", accessType: "free_photo", anilistIds: [106286], stayMin: 30 },
  { slug: "roppongi-mori", nameZh: "森美術館", nameJa: "森美術館", lat: 35.6604, lng: 139.7293, prefecture: "東京都", address: "東京都港区六本木", accessType: "purchase_required", anilistIds: [106286], stayMin: 60 },
  { slug: "shibuya-mark", nameZh: "澀谷 Mark City", nameJa: "渋谷マークシティ", lat: 35.6580, lng: 139.7016, prefecture: "東京都", address: "東京都渋谷区道玄坂", accessType: "free_photo", anilistIds: [106286], stayMin: 20 },
  // 幸運星 — 埼玉鷲宮
  { slug: "washinomiya-shrine", nameZh: "鷲宮神社", nameJa: "鷲宮神社", lat: 36.0947, lng: 139.5992, prefecture: "埼玉県", address: "埼玉県久喜市鷲宮", accessType: "free_photo", anilistIds: [1887], episode: "EP1", scene: "神社參拜", stayMin: 45, etiquette: "參拜時請保持安靜" },
  { slug: "washinomiya-station", nameZh: "鷲宮站", nameJa: "鷲宮駅", lat: 36.0912, lng: 139.5934, prefecture: "埼玉県", address: "埼玉県久喜市", accessType: "free_photo", anilistIds: [1887], station: "鷲宮駅", stayMin: 15 },
  { slug: "kuki-city", nameZh: "久喜市中心", nameJa: "久喜市中心部", lat: 36.0658, lng: 139.6772, prefecture: "埼玉県", address: "埼玉県久喜市", accessType: "free_photo", anilistIds: [1887], stayMin: 30 },
];

// Generate additional spots to reach ~60
function generateExtraSpots(): SeedSpot[] {
  const extras: SeedSpot[] = [];
  const regions = [
    { name: "飛驒老街", prefecture: "岐阜県", lat: 36.237, lng: 137.186, anime: 21617 },
    { name: "飛驒川畔", prefecture: "岐阜県", lat: 36.235, lng: 137.184, anime: 21617 },
    { name: "下北澤南口", prefecture: "東京都", lat: 35.661, lng: 139.669, anime: 140960 },
    { name: "池尻大橋", prefecture: "東京都", lat: 35.651, lng: 139.684, anime: 140960 },
    { name: "新宿站南口", prefecture: "東京都", lat: 35.689, lng: 139.701, anime: 106286 },
    { name: "東京站丸之內", prefecture: "東京都", lat: 35.681, lng: 139.764, anime: 21617 },
    { name: "皇居外苑", prefecture: "東京都", lat: 35.685, lng: 139.753, anime: 106286 },
    { name: "橫濱紅磚倉庫", prefecture: "神奈川県", lat: 35.452, lng: 139.642, anime: 106286 },
    { name: "橫濱港未來", prefecture: "神奈川県", lat: 35.456, lng: 139.632, anime: 106286 },
    { name: "熊本城", prefecture: "熊本県", lat: 32.806, lng: 130.706, anime: 142770 },
    { name: "門司港", prefecture: "福岡県", lat: 33.943, lng: 130.958, anime: 142770 },
    { name: "道後溫泉", prefecture: "愛媛県", lat: 33.852, lng: 132.786, anime: 142770 },
    { name: "神戶北野", prefecture: "兵庫県", lat: 34.695, lng: 135.190, anime: 142770 },
    { name: "姬路城", prefecture: "兵庫県", lat: 34.839, lng: 134.694, anime: 142770 },
    { name: "川越老街", prefecture: "埼玉県", lat: 35.925, lng: 139.485, anime: 1887 },
    { name: "春日部", prefecture: "埼玉県", lat: 35.975, lng: 139.752, anime: 1887 },
    { name: "淺草寺", prefecture: "東京都", lat: 35.715, lng: 139.797, anime: 21617 },
    { name: "秋葉原電氣街", prefecture: "東京都", lat: 35.698, lng: 139.773, anime: 140960 },
    { name: "原宿竹下通", prefecture: "東京都", lat: 35.671, lng: 139.703, anime: 140960 },
    { name: "代代木公園", prefecture: "東京都", lat: 35.671, lng: 139.695, anime: 21617 },
    { name: "東京鐵塔", prefecture: "東京都", lat: 35.659, lng: 139.745, anime: 106286 },
    { name: "晴空塔", prefecture: "東京都", lat: 35.710, lng: 139.810, anime: 106286 },
    { name: "上野公園", prefecture: "東京都", lat: 35.714, lng: 139.774, anime: 21617 },
    { name: "谷中銀座", prefecture: "東京都", lat: 35.725, lng: 139.766, anime: 21617 },
    { name: "目黑川", prefecture: "東京都", lat: 35.644, lng: 139.699, anime: 106286 },
    { name: "中野站北口", prefecture: "東京都", lat: 35.707, lng: 139.666, anime: 140960 },
    { name: "高田馬場", prefecture: "東京都", lat: 35.713, lng: 139.704, anime: 140960 },
    { name: "立川站", prefecture: "東京都", lat: 35.698, lng: 139.414, anime: 21617 },
    { name: "八王子", prefecture: "東京都", lat: 35.656, lng: 139.339, anime: 21617 },
    { name: "御殿場", prefecture: "静岡県", lat: 35.299, lng: 138.935, anime: 21617 },
  ];

  regions.forEach((r, i) => {
    extras.push({
      slug: `extra-${i}-${r.name}`,
      nameZh: r.name,
      nameJa: r.name,
      lat: r.lat + (Math.random() - 0.5) * 0.002,
      lng: r.lng + (Math.random() - 0.5) * 0.002,
      prefecture: r.prefecture,
      address: `${r.prefecture}${r.name}`,
      accessType: "free_photo",
      anilistIds: [r.anime],
      stayMin: 20,
    });
  });
  return extras;
}

async function seed() {
  console.log("Seeding database...");

  // Demo user
  const [demoUser] = await db
    .insert(users)
    .values({
      email: "demo@seichi.local",
      name: "巡禮示範帳號",
      username: "demo",
      role: "admin",
      bio: "聖地巡禮平台示範帳號",
    })
    .onConflictDoNothing()
    .returning();

  // Sync anime from AniList
  for (const item of SEED_ANIME) {
    try {
      const res = await fetch("https://graphql.anilist.co", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `query($id:Int){Media(id:$id,type:ANIME){id title{romaji english native} coverImage{large} bannerImage format status episodes season seasonYear genres description averageScore}}`,
          variables: { id: item.anilistId },
        }),
      });
      const json = await res.json();
      const media = json.data?.Media;
      if (media) {
        const row = mediaToDbFormat(media);
        row.titles = { ...row.titles, chinese: item.chinese };
        await db.insert(anime).values(row).onConflictDoUpdate({
          target: anime.anilistId,
          set: { ...row, syncedAt: new Date() },
        });
      }
    } catch (e) {
      // fallback without API
      await db.insert(anime).values({
        anilistId: item.anilistId,
        titles: { chinese: item.chinese, native: item.chinese },
        syncedAt: new Date(),
      }).onConflictDoNothing();
    }

    await db.insert(animePilgrimageMeta).values({
      anilistId: item.anilistId,
      popularity: item.popularity,
      suggestedDays: item.days,
      spotCount: 0,
    }).onConflictDoUpdate({
      target: animePilgrimageMeta.anilistId,
      set: { popularity: item.popularity, suggestedDays: item.days },
    });
  }

  const allSpots = [...SEED_SPOTS, ...generateExtraSpots()];
  const spotCounts: Record<number, number> = {};

  for (const s of allSpots) {
    const [spot] = await db
      .insert(spots)
      .values({
        slug: s.slug,
        nameZh: s.nameZh,
        nameJa: s.nameJa,
        latitude: s.lat,
        longitude: s.lng,
        prefecture: s.prefecture,
        address: s.address,
        accessType: s.accessType,
        transportNotes: s.transport,
        nearestStation: s.station,
        walkMinutes: s.walkMin,
        suggestedStayMinutes: s.stayMin,
        photoTips: s.photoTips,
        etiquetteNotes: s.etiquette,
        moderationStatus: "approved",
        lastConfirmedAt: new Date(),
      })
      .onConflictDoNothing()
      .returning();

    if (!spot) continue;

    for (const aid of s.anilistIds) {
      await db.insert(spotAnimeLinks).values({
        spotId: spot.id,
        anilistId: aid,
        episode: s.episode,
        scene: s.scene ? { description: s.scene } : undefined,
        moderationStatus: "approved",
      }).onConflictDoNothing();
      spotCounts[aid] = (spotCounts[aid] ?? 0) + 1;
    }
  }

  for (const [aid, cnt] of Object.entries(spotCounts)) {
    await db.update(animePilgrimageMeta)
      .set({ spotCount: cnt })
      .where(eq(animePilgrimageMeta.anilistId, Number(aid)));
  }

  // Sample travelogue
  if (demoUser) {
    await db.insert(travelogues).values({
      userId: demoUser.id,
      title: "飛驒聖地巡禮一日遊 — 你的名字。",
      slug: "hida-kiminonawa-day-trip",
      excerpt: "從飛驒古川站出發，一日走完《你的名字。》經典聖地。",
      content: [
        { id: "1", type: "heading", data: { level: 2, text: "出發：飛驒古川站" } },
        { id: "2", type: "paragraph", data: { text: "從名古屋搭 JR 特急飛驒號約 2.5 小時抵達。建議早上 9 點前到站，光線最適合拍攝。" } },
        { id: "3", type: "spot_card", data: { spotSlug: "hida-shrine", name: "飛驒山王宮朝日神社" } },
        { id: "4", type: "paragraph", data: { text: "神社階梯是電影經典場景，傍晚 4-5 點夕陽角度最接近動畫。" } },
      ],
      isPublished: true,
      publishedAt: new Date(),
    }).onConflictDoNothing();
  }

  console.log(`Seeded ${allSpots.length} spots across ${SEED_ANIME.length} anime.`);
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
