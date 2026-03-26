import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";

const EN_MANUAL = `
# TCG Manager - Organizer Manual
**Last Updated:** March 26, 2026

Welcome to **TCG Manager**, the modern companion app for running Pokémon TCG tournaments. This platform acts as a live display layer, player registration portal, and roster management tool that works alongside the official Tournament Operations Manager (TOM) software.

## The Core Concept: Web ↔ TOM
Understanding data flow is critical for a smooth event:
1.  **Web App (Here)**: Used for Player Registration, Deck List Submission, Roster Management, and Live Standings/Pairings.
2.  **TOM (Desktop App)**: Used strictly to run the tournament (generating pairings and entering results).
3.  **The \`.tdf\` File**: This file holds the tournament state. You pass it from **Web → TOM → Web** to keep everything in sync.

---

## 1. Getting Started
To get started, simply sign in with Google. You will be prompted to complete an onboarding profile (Name, Birth Year, and POP ID). *Note: Ensure your POP ID is correct, as the system links tournament permissions to this ID.*

## 2. The Organizer Workflow
Follow this "Web-First" workflow to ensure the smoothest experience.

### Step 1: Create Tournament
Do not start in TOM. Navigate to **My Tournaments** and click **Create Tournament**.
Here, you can configure:
*   **Registration & Deck Lists**: Enable player self-registration, set capacities, and require Deck List submissions with automated cutoff deadlines.
*   **Divisions & Caps**: Set maximum capacities for Juniors, Seniors, and Masters.

### Step 2: Build Your Roster
Add players to the event *before* opening T.O.M.
*   If registration is open, players will appear automatically.
*   You can also manually search and add players from the **Roster Management** section on the Tournament Dashboard.

### Step 3: Export TDF
Once registration is closed:
1.  Locate the **Export TDF** card on the dashboard.
2.  Click **Download .tdf** and save it to your computer.

### Step 4: Run in TOM
1.  Open the **TOM** desktop software.
2.  Select **File -> Open Tournament** and select the downloaded \`.tdf\` file.
3.  **CRITICAL**: Go back to **Step 1** in TOM and verify the following are correctly selected before you proceed:
    *   Tournament Mode
    *   Game Type
    *   Name
    *   Sanctioned ID
    *   City, State, Country
4.  *Verify all players appear correctly*, then **Create Pairings** for Round 1 as normal and **Save** the tournament in TOM.

### Step 5: Live Auto-Sync
Make your pairings visible to the world instantly.
1.  Return to the **Tournament Dashboard** on the web.
2.  Locate the **Auto-Sync Uploader**.
3.  Select the **active** \`.tdf\` file you are currently using in TOM.
4.  **Leave this browser tab open.**
    *   Whenever you save in TOM, the website detects the change and uploads the new results/pairings immediately.
    *   Players can now see their table numbers and submit results on their phones!

---

## 3. Advanced Features

*   **Judges & Staff**: Add judges from the dashboard. Judges get access to a dedicated **Judge Dashboard** where they can issue penalties, grant time extensions, and review submitted player Deck Lists.
*   **Printable Assets**: Click **Print QR Poster** to generate a PDF for players to scan and find their Pairings.
*   **Data Export**: Export Penalty Logs for official reporting to Pokemon.
`;

const ZH_MANUAL = `
# TCG Manager - 主办方用户手册
**最后更新：** 2026年3月26日

欢迎使用 **TCG Manager**，这是用于举办 Pokémon TCG 赛事的现代化辅助工具。本平台作为玩家报名系统、自动收表工具、名单管理系统以及实时的赛况展示板，与官方的 **TOM (Tournament Operations Manager)** 软件协同工作。

## 核心概念：Web ↔ TOM 数据流
理解数据流方向是顺利举办比赛的关键：
1.  **Web App (本平台)**：用于 Player Registration (玩家报名)、Deck List (卡表提交)、Roster Management (名单管理) 以及实时展示 Pairings (配对) 与 Standings (排名)。
2.  **TOM (桌面软件)**：仅用于实际运行比赛 (生成配对、录入成绩)。
3.  **\`.tdf\` 文件**：承载比赛数据的核心文件。您需要在 **Web → TOM → Web** 之间传递此文件，以保持数据同步。

---

## 1. 入门指南
使用 Google 账户登录。首次登录需要完成 Profile Onboarding (输入姓名、出生年份、以及 POP ID)。*注意：系统会根据 POP ID 关联您的赛事权限，请确保填写准确。*

## 2. 赛事组织流程
请务必遵循“Web 优先”的工作流，以获得最佳体验。

### 第 1 步：Create Tournament (创建赛事)
请勿在 TOM 中直接新建比赛。导航至 **My Tournaments** 并点击 **Create Tournament**。
在这里配置赛事参数：
*   **Registration & Deck Lists**: 开启玩家自助 Registration，设置名额上限，以及开启具有自动倒计时约束的 Deck List 提交流程。
*   **Divisions**: 设置 Juniors, Seniors, Masters 三个组别的容纳人数上限。

### 第 2 步：构建 Roster (选手名单)
在进入 TOM *之前*，确保所有玩家已进入该赛事的 Roster：
*   如果您开启了在线报名，玩家会自动进入该列表 (支持 Waitlist 排队功能)。
*   您也可以在 Tournament Dashboard 的 **Roster Management** 模块，手动搜索并添加玩家。

### 第 3 步：导出 TDF
当报名结束时：
1.  在 Dashboard 找到 **Export TDF** 卡片。
2.  点击 **Download .tdf**，将文件保存到电脑中。

### 第 4 步：在 TOM 中运行
1.  打开 **TOM** 桌面软件。
2.  选择 **File -> Open Tournament**，打开刚才下载的 \`.tdf\` 文件。
3.  **至关重要**：在 TOM 中返回 **Step 1**，并在继续之前确认以下字段已正确选择：
    *   Tournament Mode
    *   Game Type
    *   Name
    *   Sanctioned ID
    *   City, State, Country
4.  *初查所有选手的 POP ID 与出生年份无误后*，照常执行 **Create Pairings** 生成第 1 轮配对，并在 TOM 中点击 **Save** (保存)。

### 第 5 步：Live Auto-Sync (实时自动同步)
让赛场配对即刻公开。
1.  回到网页版的 **Tournament Dashboard**。
2.  找到 **Auto-Sync Uploader** 卡片。
3.  选中您刚才在 TOM 中使用的那个 **活跃的** \`.tdf\` 文件。
4.  **请保持此浏览器标签页开启，不要关闭。**
    *   此后，每当您在 TOM 中点击保存，网站便会自动捕获更改，并立即推送最新赛况。
    *   Player 们现在可以通过手机直接查看桌号！

---

## 3. 进阶功能

*   **Judges & Staff (裁判与工作人员)**：可在 Dashboard 中指派 Judge。裁判将解锁私有的 **Judge Dashboard**，在网页端快速下达 Penalty 控制、审批 Time Extension 并且审查玩家提交的 Deck List。
*   **QR Poster (二维码海报)**：点击 **Print QR Poster** 生成可打印的 PDF，张贴于赛场供玩家扫码查看 Pairings。
*   **Data Export (数据导出)**：赛事结束后，一键导出 Penalty Log (判罚记录 CSV)，方便向官方提交赛后汇报材料。
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
