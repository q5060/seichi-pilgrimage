import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = {
  title: "服務條款 — 聖地巡禮",
  description: "聖地巡禮社群平台服務條款與使用者生成內容規範",
};

export default function TermsPage() {
  return (
    <PageShell variant="prose">
      <PageHeader title="服務條款" description="最後更新：2026 年 6 月" />

      <div className="prose prose-invert mt-8 max-w-none space-y-6 text-muted-foreground">
        <section>
          <h2 className="text-xl font-semibold text-foreground">1. 服務說明</h2>
          <p>
            聖地巡禮（以下稱「本平台」）提供動畫聖地資訊、巡禮打卡、遊記分享與社群互動服務。
            使用本平台即表示您同意遵守本條款。若不同意，請停止使用本服務。
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">2. 帳號與資格</h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>您須年滿 13 歲方可註冊使用（若當地法律要求更高年齡，以當地法律為準）。</li>
            <li>您應提供真實、可聯絡的 Email，並妥善保管帳號密碼或 OAuth 授權。</li>
            <li>一人限使用一個主要帳號；禁止建立多帳號規避封禁或操縱社群機制。</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">3. 使用者生成內容（UGC）</h2>
          <p>您可於本平台發布聖地資訊、相片、遊記、評論等內容。您聲明並保證：</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>您擁有發布內容的權利，或已取得必要授權。</li>
            <li>內容不侵犯他人著作權、肖像權、隱私權或其他權利。</li>
            <li>內容不含違法、騷擾、仇恨、色情、虛假資訊或惡意連結。</li>
            <li>聖地座標與交通資訊應盡力準確；不得故意標示錯誤位置騷擾私人住宅。</li>
          </ul>
          <p className="mt-4">
            您保留內容著作權，但授予本平台非專屬、全球性、免權利金之授權，
            以便於平台內展示、儲存、備份、搜尋索引及推廣您的內容（含縮圖與摘要）。
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">4. 審核與移除</h2>
          <p>
            本平台對 UGC 採審核或事後檢舉機制。我們得依社群規範、法律要求或權利人通知，
            隱藏、編輯或刪除內容，並暫停或終止違規帳號，無須事先通知。
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">5. 聖地巡禮行為</h2>
          <p>
            使用者應尊重當地居民、遵守現場規定與禮儀。本平台僅提供資訊參考，
            不對現場安全、營業時間變動或私人土地進入糾紛負責。請自行確認可否進入及拍攝。
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">6. 免責聲明</h2>
          <p>
            本服務依「現狀」提供。我們不保證服務不中斷、無錯誤或完全安全。
            在法律允許範圍內，本平台不對間接、附帶或懲罰性損害負責。
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">7. 條款變更</h2>
          <p>
            我們可能修訂本條款；重大變更將於平台公告。繼續使用即視為接受修訂後條款。
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">8. 聯絡方式</h2>
          <p>
            如有條款或 UGC 相關問題，請透過平台設定頁或管理員管道與我們聯繫。
          </p>
        </section>
      </div>

      <p className="mt-10 text-sm text-muted-foreground">
        另請參閱{" "}
        <Link href="/privacy" className="text-primary hover:underline">
          隱私權政策
        </Link>
        {" "}與{" "}
        <Link href="/copyright" className="text-primary hover:underline">
          著作權聲明
        </Link>
        。
      </p>
    </PageShell>
  );
}
