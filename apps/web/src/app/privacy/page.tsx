import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = {
  title: "隱私權政策 — 聖地巡禮",
  description: "聖地巡禮社群平台隱私權政策與個人資料處理說明",
};

export default function PrivacyPage() {
  return (
    <PageShell variant="prose">
      <PageHeader title="隱私權政策" description="最後更新：2026 年 6 月" />

      <div className="prose prose-invert mt-8 max-w-none space-y-6 text-muted-foreground">
        <section>
          <h2 className="text-xl font-semibold text-foreground">1. 適用範圍</h2>
          <p>
            本政策說明聖地巡禮平台如何蒐集、使用、儲存與保護您的個人資料。
            使用本服務即表示您同意本政策所述之處理方式。
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">2. 我們蒐集的資料</h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <strong>帳號資料：</strong>Email、顯示名稱、頭像（若透過 Google / Discord 登入則來自 OAuth 提供者）。
            </li>
            <li>
              <strong>您主動提供的資料：</strong>個人簡介、遊記、相片、打卡紀錄、聖地提案與評論。
            </li>
            <li>
              <strong>技術資料：</strong>IP 位址、瀏覽器類型、裝置資訊、Cookie 與使用紀錄（用於安全與服務改善）。
            </li>
            <li>
              <strong>位置相關：</strong>若您上傳含 GPS 的相片或回報聖地現況，可能包含大致地理位置。
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">3. 資料使用目的</h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>提供登入、個人檔案、社群與搜尋功能</li>
            <li>審核 UGC、防止濫用與維護平台安全</li>
            <li>寄送與帳號或互動相關之必要通知</li>
            <li>統計分析與產品改善（盡可能以去識別化方式處理）</li>
            <li>遵守法律義務或回應合法政府／司法請求</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">4. 資料分享</h2>
          <p>我們不出售您的個人資料。在下列情況可能分享資料：</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>依您設定的隱私等級，向其他使用者顯示公開內容</li>
            <li>委託雲端託管、圖床、搜尋、錯誤監控等服務供應商（受契約保密義務約束）</li>
            <li>法律要求、權利保護或企業合併／重組時</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">5. 資料保存</h2>
          <p>
            我們於提供服務所需期間保存資料。您可刪除部分 UGC 或申請刪除帳號；
            依法須保留之紀錄（如審核日誌）可能於合理期限內留存。
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">6. 您的權利</h2>
          <p>依適用法律，您可能享有查閱、更正、刪除、限制處理或資料可攜權。
            請透過帳號設定或聯絡我們行使權利；我們將於合理期限內回覆。</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">7. Cookie</h2>
          <p>
            我們使用 Session Cookie 維持登入狀態。您可於瀏覽器設定拒絕 Cookie，
            但部分功能可能無法使用。
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">8. 兒童隱私</h2>
          <p>
            本服務不針對 13 歲以下兒童。若發現未經監護人同意之兒童資料，
            我們將儘速刪除。
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">9. 政策更新</h2>
          <p>
            我們可能更新本政策並於本頁公告生效日期。重大變更將以適當方式通知使用者。
          </p>
        </section>
      </div>

      <p className="mt-10 text-sm text-muted-foreground">
        相關文件：{" "}
        <Link href="/terms" className="text-primary hover:underline">
          服務條款
        </Link>
        、{" "}
        <Link href="/copyright" className="text-primary hover:underline">
          著作權聲明
        </Link>
      </p>
    </PageShell>
  );
}
