"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";

const EN_MANUAL = `
# TCG Manager - Organizer Manual
**Last Updated:** 2026-01-28

Welcome to **TCG Manager**, the modern companion app for running Pokémon TCG tournaments. This platform serves as a **live visibility layer** and **roster management tool** that works in tandem with the official Tournament Operations Manager (TOM) software.

## Core Concept: Source of Truth
Understanding this is critical for success:
*   **Web App (This Platform)**: Used for **Registration**, **Roster Management**, and **Public Visibility** (Pairings/Standings).
*   **TOM (Desktop Software)**: Used to **Run the Tournament** (Generate Pairings, Enter Results).
*   The **\`.tdf\` file** implies the state. You move it from Web -> TOM -> Web to keep everything in sync.

---

## 1. Getting Started

### Login & Access
Access the platform using your Google Account.
1.  Click **Sign In** on the homepage.
2.  Use your standard Google credentials.

### Profile Setup (CRITICAL)
Before you can organize or judge, you **MUST** configure your profile.
1.  Go to **Settings** (User Menu -> Settings).
2.  **Display Name**: Your full name (e.g., "John Doe").
3.  **Pokémon Player ID**: Your official POP ID.
    *   **Important**: The system links tournaments to you based on this ID. If this is missing or wrong, you will not have "Organizer" access to your own files.

---

## 2. Organization Workflow (Step-by-Step)

Follow this "Web-First" workflow to ensure the smoothest experience.

### Step 1: Create Tournament
Instead of starting in TOM, start here.
1.  Navigate to **My Tournaments**.
2.  Click **Create TOM File**.
3.  Enter the event details:
    *   **Name**: e.g., "Ace Cup March"
    *   **Date & Location**: Required for the generated file.
    *   **Sanction ID**: Highly recommended if you have it (format: XX-MM-000123).

### Step 2: Build Your Roster
Add players to the event *before* you go to T.O.M.
1.  On the **Tournament Dashboard**, use the **Roster Management** card.
2.  **Search** for players by Name or Player ID.
    *   *Note: This searches the global database of players who have used the app or played in previous events.*
3.  Click **Add** to move them into the Current Roster.
    *   This ensures all Player IDs and Birth Years are correct in the final file.

### Step 3: Export TDF
Once registration is closed or you are ready to start:
1.  Look for the **Export TDF** card.
2.  Click **Download .tdf**.
3.  Save this file to your computer (e.g., in a \`Tournaments\` folder).

### Step 4: Run in TOM
1.  Open the **TOM** desktop software.
2.  Select **File -> Open Tournament**.
3.  Select the \`.tdf\` file you just downloaded.
    *   *Verify: You should see all your players automatically populated.*
4.  **Create Pairings** for Round 1 as normal.
5.  **Save** the tournament in TOM.

### Step 5: Live Auto-Sync (The Magic)
Make your pairings visible to the world instantly.
1.  Go back to the **Tournament Dashboard** on the web.
2.  Locate the **Auto-Sync Uploader**.
3.  Click **Select TDF to Auto-Sync**.
4.  Select the **active** \`.tdf\` file you are currently using in TOM.
5.  **Leave this browser tab open.**
    *   Whenever you save in TOM, the website will detect the change and upload the new results/pairings immediately.
    *   Players can now see their table numbers on their phones!

---

## 3. Management Features

### Staff & Judges
You can give other users access to help run the event (e.g., scorekeepers).
1.  In the Dashboard, look for **Staff / Judges**.
2.  Search for the user by name.
3.  **Add** them.
    *   *Permissions*: Judges can view "Hidden" tournaments and see penalty info.

### Penalty Management
TCG Manager allows you to export penalties for official reporting.
1.  **Export Penalty Log (CSV)**: Generates a CSV file compatible with official reporting tools (My Pokemon/RK9).
    *   *Note*: Ensure all penalties are entered correctly in TOM.

### Printable Assets
*   **QR Poster**: Click **Print QR Poster** in the header to generate a printable PDF. Hang this at the venue so players can scan and find their pairings.

### Publishing
*   **Hidden** (Default): Only visible to You and Judges.
*   **Published**: Visible on the public homepage.
    *   Toggle this in the **Settings** card when you are ready to go live.
`;

const ZH_MANUAL = `
# TCG Manager - 主办方用户手册
**最后更新：** 2026-01-28

欢迎使用 **TCG Manager**，这是用于举办 Pokémon TCG 赛事的现代化辅助工具。本平台作为一个**实时展示层**和**名单管理工具**，与官方的赛事运营管理软件 (TOM) 协同工作。

## 核心概念：唯一真实数据源 (Source of Truth)
理解这一点对于顺利举办比赛至关重要：
*   **网页应用 (本平台)**：用于**报名**、**名单管理**和**对外展示**（配对/排名表）。
*   **TOM (桌面软件)**：用于**运行比赛**（生成配对、录入成绩）。
*   **\`.tdf\` 文件**承载了比赛状态。您需要在 网页 -> TOM -> 网页 之间传递此文件，以保持数据同步。

---

## 1. 入门指南

### 登录与访问
使用您的 Google 账户访问平台。
1.  点击主页上的 **Sign In (登录)**。
2.  使用您的标准 Google 凭证登录。

### 个人资料设置 (至关重要)
在您成为主办方或裁判之前，您**必须**配置您的个人资料。
1.  前往 **Settings (设置)** (用户菜单 -> Settings)。
2.  **Display Name (显示名称)**：您的全名（例如 "John Doe"）。
3.  **Pokémon Player ID (宝可梦玩家 ID)**：您的官方 POP ID。
    *   **重要**：系统会根据此 ID 将比赛与您关联。如果此 ID 缺失或错误，您将无法作为“主办方”访问您自己的文件。

---

## 2. 赛事组织流程 (分步指南)

请遵循此“网页优先 (Web-First)”流程，以确得最佳体验。

### 第 1 步：创建比赛
不要在 TOM 中开始，请先在这里开始。
1.  导航至 **My Tournaments (我的赛事)**。
2.  点击 **Create TOM File (创建 TOM 文件)**。
3.  输入赛事详情：
    *   **Name (名称)**：例如 "Ace Cup March"
    *   **Date & Location (日期与地点)**：生成文件所需。
    *   **Sanction ID (认证 ID)**：强烈建议填写 (格式：XX-MM-000123)。

### 第 2 步：构建选手名单
在进入 T.O.M. 之前，先将选手添加到比赛中。
1.  在 **Tournament Dashboard (赛事仪表板)** 上，使用 **Roster Management (名单管理)** 卡片。
2.  通过姓名或玩家 ID **搜索**选手。
    *   *注意：此时搜索的是曾经使用过本 App 或参加过往届比赛的全球玩家数据库。*
3.  点击 **Add (添加)** 将其移入当前名单。
    *   这可确保最终文件中的所有玩家 ID 和出生年份都是正确的。

### 第 3 步：导出 TDF
报名截止或准备开始时：
1.  找到 **Export TDF (导出 TDF)** 卡片。
2.  点击 **Download .tdf (下载 .tdf)**。
3.  将此文件保存到您的电脑 (例如 \`Tournaments\` 文件夹)。

### 第 4 步：在 TOM 中运行
1.  打开 **TOM** 桌面软件。
2.  选择 **File -> Open Tournament (文件 -> 打开比赛)**。
3.  选择您刚刚下载的 \`.tdf\` 文件。
    *   *验证：您应该可以看到所有选手已自动填充。*
4.  照常为第 1 轮 **Create Pairings (创建配对)**。
5.  在 TOM 中 **Save (保存)** 比赛。

### 第 5 步：实时自动同步 (魔法时刻)
让全世界即时看到您的配对。
1.  回到网页上的 **Tournament Dashboard (赛事仪表板)**。
2.  找到 **Auto-Sync Uploader (自动同步上传器)**。
3.  点击 **Select TDF to Auto-Sync (选择要自动同步的 TDF)**。
4.  选择您当前在 TOM 中使用的 **活跃** \`.tdf\` 文件。
5.  **保持此浏览器标签页开启。**
    *   每当您在 TOM 中保存时，网站会自动检测更改并立即上传新的成绩/配对。
    *   选手们现在可以在手机上查看他们的桌号了！

---

## 3. 管理功能

### 工作人员与裁判
您可以授权其他用户协助举办赛事（例如记分员）。
1.  在仪表板中，找到 **Staff / Judges (工作人员/裁判)**。
2.  通过姓名搜索用户。
3.  **Add (添加)** 他们。
    *   *权限*：裁判可以查看“隐藏”的比赛并查看判罚信息。

### 判罚管理
TCG Manager 允许您导出判罚记录以进行官方汇报。
1.  **Export Penalty Log (导出判罚日志 CSV)**：生成兼容官方汇报工具 (My Pokemon/RK9) 的 CSV 文件。
    *   *注意*：确保所有判罚都已在 TOM 中正确录入。

### 可打印物料
*   **QR Poster (二维码海报)**：点击顶部的 **Print QR Poster** 生成可打印的 PDF。将其张贴在会场，方便选手扫描查看配对。

### 发布比赛
*   **Hidden (隐藏)** (默认)：仅您和裁判可见。
*   **Published (已发布)**：在公共主页可见。
    *   准备好上线时，在 **Settings (设置)** 卡片中切换此选项。
`;

export default function OrganizerHelpPage() {
   return (
      <div className="container max-w-4xl py-8 space-y-8">
         <div className="flex items-center gap-4">
            <Link href="/" className="text-muted-foreground hover:text-foreground">
               <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
               <h1 className="text-2xl font-bold tracking-tight">Organizer Manuals</h1>
               <p className="text-muted-foreground">Guides and documentation for tournament organizers.</p>
            </div>
         </div>

         <Tabs defaultValue="en" className="w-full">
            <TabsList className="mb-4">
               <TabsTrigger value="en">English (US)</TabsTrigger>
               <TabsTrigger value="zh">Chinese (中文)</TabsTrigger>
            </TabsList>

            <TabsContent value="en">
               <Card>
                  <CardHeader>
                     <CardTitle>Organizer User Manual</CardTitle>
                     <CardDescription>Comprehensive guide for running tournaments.</CardDescription>
                  </CardHeader>
                  <CardContent className="prose dark:prose-invert max-w-none">
                     <ReactMarkdown>{EN_MANUAL}</ReactMarkdown>
                  </CardContent>
               </Card>
            </TabsContent>

            <TabsContent value="zh">
               <Card>
                  <CardHeader>
                     <CardTitle>主办方用户手册</CardTitle>
                     <CardDescription>赛事举办综合指南</CardDescription>
                  </CardHeader>
                  <CardContent className="prose dark:prose-invert max-w-none">
                     <ReactMarkdown>{ZH_MANUAL}</ReactMarkdown>
                  </CardContent>
               </Card>
            </TabsContent>
         </Tabs>
      </div>
   );
}
