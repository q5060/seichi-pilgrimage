import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = {
  title: "著作權聲明 — 聖地巡禮",
  description: "聖地巡禮平台著作權政策、動畫截圖合理使用說明與侵權通知",
};

export default function CopyrightPage() {
  return (
    <PageShell variant="prose">
      <PageHeader title="著作權聲明" description="最後更新：2026 年 6 月" />

      <div className="prose prose-invert mt-8 max-w-none space-y-6 text-muted-foreground">
        <section>
          <h2 className="text-xl font-semibold text-foreground">1. 平台內容權利</h2>
          <p>
            聖地巡禮平台之介面設計、程式碼、商標與原創文案由本平台或其授權人享有著作權。
            動畫作品標題、封面、劇情描述等資料可能來自 AniList 等第三方 API，
            其權利歸原權利人所有。
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">2. 使用者上傳內容</h2>
          <p>
            使用者上傳的相片、遊記與文字由上傳者保留著作權。
            上傳即表示您確認擁有相關權利，並同意本平台依服務條款展示與索引該內容。
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">3. 動畫截圖與對比照</h2>
          <p>
            本平台允許使用者在「聖地對比照」等功能中上傳動畫截圖，與實地拍攝照片並列，
            以協助其他巡禮者辨識取景位置。此類使用通常屬於：
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>評論、介紹或教育目的之合理使用（fair use / 著作權法第 65 條等）</li>
            <li>非商業、轉化性使用（與實景對照、地點標示）</li>
            <li>使用低解析度或必要範圍之畫面，不取代正版觀看</li>
          </ul>
          <p className="mt-4">
            使用者不得將截圖用於純粹重製散布整集動畫、販售或未授權商業用途。
            若權利人認為特定內容超出合理使用範圍，請依下方程序提出通知。
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">4. 禁止侵權內容</h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>未經授權之完整影片、音訊或掃圖集</li>
            <li>盜用他人遊記、相片並冒充原創</li>
            <li>侵犯商標或角色商品化權利之商業宣傳</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">5. 侵權通知（DMCA / 著作權申訴）</h2>
          <p>若您為著作權人或其代理人，認為平台內容侵害您的權利，請提供：</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>權利人聯絡方式與身分說明</li>
            <li>被主張侵權內容之 URL 或具體位置</li>
            <li>原作品說明與權利證明</li>
            <li>善意聲明該使用未經授權，以及聲明內容真實之陳述</li>
          </ul>
          <p className="mt-4">
            我們將審閱後移除或限制存取爭議內容，並依情況通知上傳者。
            反通知程序將於收到有效申訴後另行說明。
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">6. 重複侵權者</h2>
          <p>
            對多次侵權或嚴重違規之帳號，本平台得終止服務並保留法律追訴權利。
          </p>
        </section>
      </div>

      <p className="mt-10 text-sm text-muted-foreground">
        另請參閱{" "}
        <Link href="/terms" className="text-primary hover:underline">
          服務條款
        </Link>
        {" "}與{" "}
        <Link href="/privacy" className="text-primary hover:underline">
          隱私權政策
        </Link>
        。
      </p>
    </PageShell>
  );
}
