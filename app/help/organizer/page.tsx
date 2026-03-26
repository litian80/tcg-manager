import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

function EnglishManual() {
  return (
    <div className="space-y-8 text-[#0f172a] dark:text-[#f8fafc]">
      <div className="bg-muted/50 border rounded-xl p-6 shadow-sm text-lg leading-relaxed">
        Welcome to <span className="font-semibold text-primary">TCG Manager</span>, a companion app for running Pokémon TCG tournaments. This platform functions as a player registration portal, roster management tool, and live display layer that works alongside the official Tournament Operations Manager (TOM) software.
      </div>

      <section>
        <h2 className="text-2xl font-bold tracking-tight border-b pb-2 mb-4">The Core Concept: Web ↔ TOM</h2>
        <p className="mb-4 text-muted-foreground">Understanding data flow is critical for a smooth event:</p>
        <ol className="list-decimal list-inside space-y-2 mb-6">
          <li><strong>Web App (Here)</strong>: Used for Player Registration, Deck List Submission, Roster Management, and Live Standings/Pairings.</li>
          <li><strong>TOM (Desktop App)</strong>: Used strictly to run the tournament (generating pairings and entering results).</li>
          <li><strong>The <code>.tdf</code> File</strong>: This file holds the tournament state. You pass it from <strong>Web → TOM → Web</strong> to keep everything in sync.</li>
        </ol>
      </section>

      <section>
        <h2 className="text-2xl font-bold tracking-tight border-b pb-2 mb-4">1. Getting Started</h2>
        <p className="mb-6">
          To get started, simply sign in with Google. You will be prompted to complete an onboarding profile (Name, Birth Year, and POP ID). <em className="text-muted-foreground">Note: Ensure your POP ID is correct, as the system links tournament permissions to this ID.</em>
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-bold tracking-tight border-b pb-2 mb-4">2. The Organiser Workflow</h2>
        <p className="mb-6 text-muted-foreground">Follow this &quot;Web-First&quot; workflow to ensure proper data synchronization.</p>
        
        <div className="grid gap-4">
          <Card className="hover:shadow-md transition-all shadow-sm">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <CardTitle className="text-primary text-xl tracking-tight">Step 1: Create Tournament</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="mb-3 font-medium">Do not start in TOM. Navigate to <strong>My Tournaments</strong> and click <strong>Create Tournament</strong>. Here, you can configure:</p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground pl-2">
                <li><strong className="text-foreground">Registration & Deck Lists</strong>: Enable player self-registration, set capacities, and require Deck List submissions with automated cutoff deadlines.</li>
                <li><strong className="text-foreground">Divisions & Caps</strong>: Set maximum capacities for Juniors, Seniors, and Masters.</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-all shadow-sm">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <CardTitle className="text-primary text-xl tracking-tight">Step 2: Build Your Roster</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="mb-3 font-medium">Add players to the event <em className="text-primary/80">before</em> opening T.O.M.</p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground pl-2">
                <li>If registration is open, players will appear automatically.</li>
                <li>You can also manually search and add players from the <strong className="text-foreground">Roster Management</strong> section on the Tournament Dashboard.</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-all shadow-sm">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <CardTitle className="text-primary text-xl tracking-tight">Step 3: Export TDF</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="mb-3 font-medium">Once registration is closed:</p>
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground pl-2">
                <li>Locate the <strong className="text-foreground">Export TDF</strong> card on the dashboard.</li>
                <li>Click <strong className="text-foreground">Download .tdf</strong> and save it to your computer.</li>
              </ol>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-all shadow-sm">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <CardTitle className="text-primary text-xl tracking-tight">Step 4: Run in TOM</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <ol className="list-decimal list-inside space-y-3 text-muted-foreground pl-2">
                <li>Open the <strong className="text-foreground">TOM</strong> desktop software.</li>
                <li>Select <strong className="text-foreground">File -&gt; Open Tournament</strong> and select the downloaded <code className="bg-muted px-1.5 py-0.5 rounded text-foreground">.tdf</code> file.</li>
                <li>
                  <strong className="text-destructive font-bold">CRITICAL</strong>: Go back to <strong className="text-foreground">Step 1</strong> in TOM and verify the following are correctly selected before you proceed:
                  <ul className="list-disc list-inside ml-6 mt-2 space-y-1 py-2 px-4 bg-muted/30 rounded-md border text-sm">
                    <li>Tournament Mode</li>
                    <li>Game Type</li>
                    <li>Name</li>
                    <li>Sanctioned ID</li>
                    <li>City, State, Country</li>
                  </ul>
                </li>
                <li><em className="text-primary/80">Verify all players appear correctly</em>, then <strong className="text-foreground">Create Pairings</strong> for Round 1 as normal and <strong className="text-foreground">Save</strong> the tournament in TOM.</li>
              </ol>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-all shadow-sm">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <CardTitle className="text-primary text-xl tracking-tight">Step 5: Live Auto-Sync</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="mb-3 font-medium">Publish your pairings online.</p>
              <ol className="list-decimal list-inside space-y-3 text-muted-foreground pl-2">
                <li>Return to the <strong className="text-foreground">Tournament Dashboard</strong> on the web.</li>
                <li>Locate the <strong className="text-foreground">Auto-Sync Uploader</strong>.</li>
                <li>Select the <strong className="text-foreground">active</strong> <code className="bg-muted px-1.5 py-0.5 rounded text-foreground">.tdf</code> file you are currently using in TOM.</li>
                <li>
                  <strong className="text-foreground font-semibold">Leave this browser tab open.</strong>
                  <ul className="list-disc list-inside ml-6 mt-2 space-y-1.5 py-2 px-4 bg-primary/5 rounded-md border border-primary/10 text-sm">
                    <li>Whenever you save in TOM, the website detects the change and uploads the new results/pairings immediately.</li>
                    <li>Players can now see their table numbers and submit results on their phones!</li>
                  </ul>
                </li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold tracking-tight border-b pb-2 mb-4 mt-8">3. Advanced Features</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="p-4 border rounded-lg bg-card">
            <h3 className="font-semibold text-lg mb-2 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div>Judges & Staff</h3>
            <p className="text-muted-foreground text-sm">Add judges from the dashboard. Judges get access to a dedicated <strong>Judge Dashboard</strong> where they can issue penalties, grant time extensions, and review submitted player Deck Lists.</p>
          </div>
          <div className="p-4 border rounded-lg bg-card">
            <h3 className="font-semibold text-lg mb-2 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-purple-500"></div>Printable Assets</h3>
            <p className="text-muted-foreground text-sm">Click <strong>Print QR Poster</strong> to generate a PDF for players to scan and find their Pairings.</p>
          </div>
          <div className="p-4 border rounded-lg bg-card sm:col-span-2">
            <h3 className="font-semibold text-lg mb-2 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500"></div>Data Export</h3>
            <p className="text-muted-foreground text-sm">Export Penalty Logs for official reporting to Pokemon.</p>
          </div>
        </div>
      </section>
    </div>
  )
}

function ChineseManual() {
  return (
    <div className="space-y-8 text-[#0f172a] dark:text-[#f8fafc]">
      <div className="bg-muted/50 border rounded-xl p-6 shadow-sm text-lg leading-relaxed">
        欢迎使用 <span className="font-semibold text-primary">TCG Manager</span>，这是用于举办 Pokémon TCG 赛事的辅助应用。本平台提供玩家报名、在线收表、名单管理以及赛况展示功能，并与官方的 <strong>TOM (Tournament Operations Manager)</strong> 软件协同工作。
      </div>

      <section>
        <h2 className="text-2xl font-bold tracking-tight border-b pb-2 mb-4">核心概念：Web ↔ TOM 数据流</h2>
        <p className="mb-4 text-muted-foreground">理解数据流方向是顺利举办比赛的关键：</p>
        <ol className="list-decimal list-inside space-y-2 mb-6">
          <li><strong>Web App (本平台)</strong>：用于 Player Registration (玩家报名)、Deck List (卡表提交)、Roster Management (名单管理) 以及实时展示 Pairings (配对) 与 Standings (排名)。</li>
          <li><strong>TOM (桌面软件)</strong>：仅用于实际运行比赛 (生成配对、录入成绩)。</li>
          <li><strong><code>.tdf</code> 文件</strong>：承载比赛数据的核心文件。您需要在 <strong>Web → TOM → Web</strong> 之间传递此文件，以保持数据同步。</li>
        </ol>
      </section>

      <section>
        <h2 className="text-2xl font-bold tracking-tight border-b pb-2 mb-4">1. 入门指南</h2>
        <p className="mb-6">
          使用 Google 账户登录。首次登录需要完成 Profile Onboarding (输入姓名、出生年份、以及 POP ID)。<em className="text-muted-foreground">注意：系统会根据 POP ID 关联您的赛事权限，请确保填写准确。</em>
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-bold tracking-tight border-b pb-2 mb-4">2. 赛事组织流程</h2>
        <p className="mb-6 text-muted-foreground">请遵循&ldquo;Web 优先&rdquo;的工作流，以确保数据的一致和同步。</p>
        
        <div className="grid gap-4">
          <Card className="hover:shadow-md transition-all shadow-sm">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <CardTitle className="text-primary text-xl tracking-tight">第 1 步：Create Tournament (创建赛事)</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="mb-3 font-medium">请勿在 TOM 中直接新建比赛。导航至 <strong>My Tournaments</strong> 并点击 <strong>Create Tournament</strong>。在这里配置赛事参数：</p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground pl-2">
                <li><strong className="text-foreground">Registration & Deck Lists</strong>: 开启玩家自助 Registration，设置名额上限，以及开启具有自动倒计时约束的 Deck List 提交流程。</li>
                <li><strong className="text-foreground">Divisions</strong>: 设置 Juniors, Seniors, Masters 三个组别的容纳人数上限。</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-all shadow-sm">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <CardTitle className="text-primary text-xl tracking-tight">第 2 步：构建 Roster (选手名单)</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="mb-3 font-medium">在进入 TOM <em className="text-primary/80">之前</em>，确保所有玩家已进入该赛事的 Roster：</p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground pl-2">
                <li>如果您开启了在线报名，玩家会自动进入该列表 (支持 Waitlist 排队功能)。</li>
                <li>您也可以在 Tournament Dashboard 的 <strong className="text-foreground">Roster Management</strong> 模块，手动搜索并添加玩家。</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-all shadow-sm">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <CardTitle className="text-primary text-xl tracking-tight">第 3 步：导出 TDF</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="mb-3 font-medium">当报名结束时：</p>
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground pl-2">
                <li>在 Dashboard 找到 <strong className="text-foreground">Export TDF</strong> 卡片。</li>
                <li>点击 <strong className="text-foreground">Download .tdf</strong>，将文件保存到电脑中。</li>
              </ol>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-all shadow-sm">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <CardTitle className="text-primary text-xl tracking-tight">第 4 步：在 TOM 中运行</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <ol className="list-decimal list-inside space-y-3 text-muted-foreground pl-2">
                <li>打开 <strong className="text-foreground">TOM</strong> 桌面软件。</li>
                <li>选择 <strong className="text-foreground">File -&gt; Open Tournament</strong>，打开刚才下载的 <code className="bg-muted px-1.5 py-0.5 rounded text-foreground">.tdf</code> 文件。</li>
                <li>
                  <strong className="text-destructive font-bold">至关重要</strong>：在 TOM 中返回 <strong className="text-foreground">Step 1</strong>，并在继续之前确认以下字段已正确选择：
                  <ul className="list-disc list-inside ml-6 mt-2 space-y-1 py-2 px-4 bg-muted/30 rounded-md border text-sm">
                    <li>Tournament Mode</li>
                    <li>Game Type</li>
                    <li>Name</li>
                    <li>Sanctioned ID</li>
                    <li>City, State, Country</li>
                  </ul>
                </li>
                <li><em className="text-primary/80">初查所有选手的 POP ID 与出生年份无误后</em>，照常执行 <strong className="text-foreground">Create Pairings</strong> 生成第 1 轮配对，并在 TOM 中点击 <strong className="text-foreground">Save</strong> (保存)。</li>
              </ol>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-all shadow-sm">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <CardTitle className="text-primary text-xl tracking-tight">第 5 步：Live Auto-Sync (实时自动同步)</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="mb-3 font-medium">在线发布赛场配对信息。</p>
              <ol className="list-decimal list-inside space-y-3 text-muted-foreground pl-2">
                <li>回到网页版的 <strong className="text-foreground">Tournament Dashboard</strong>。</li>
                <li>找到 <strong className="text-foreground">Auto-Sync Uploader</strong> 卡片。</li>
                <li>选中您刚才在 TOM 中使用的那个 <strong className="text-foreground">活跃的</strong> <code className="bg-muted px-1.5 py-0.5 rounded text-foreground">.tdf</code> 文件。</li>
                <li>
                  <strong className="text-foreground font-semibold">请保持此浏览器标签页开启，不要关闭。</strong>
                  <ul className="list-disc list-inside ml-6 mt-2 space-y-1.5 py-2 px-4 bg-primary/5 rounded-md border border-primary/10 text-sm">
                    <li>此后，每当您在 TOM 中点击保存，网站便会自动捕获更改，并立即推送最新赛况。</li>
                    <li>Player 们现在可以通过手机直接查看桌号！</li>
                  </ul>
                </li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold tracking-tight border-b pb-2 mb-4 mt-8">3. 进阶功能</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="p-4 border rounded-lg bg-card">
            <h3 className="font-semibold text-lg mb-2 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div>Judges & Staff</h3>
            <p className="text-muted-foreground text-sm">可在 Dashboard 中指派 Judge。裁判将解锁私有的 <strong>Judge Dashboard</strong>，在网页端快速下达 Penalty 控制、审批 Time Extension 并且审查玩家提交的 Deck List。</p>
          </div>
          <div className="p-4 border rounded-lg bg-card">
            <h3 className="font-semibold text-lg mb-2 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-purple-500"></div>QR Poster (二维码海报)</h3>
            <p className="text-muted-foreground text-sm">点击 <strong>Print QR Poster</strong> 生成可打印的 PDF，张贴于赛场供玩家扫码查看 Pairings。</p>
          </div>
          <div className="p-4 border rounded-lg bg-card sm:col-span-2">
            <h3 className="font-semibold text-lg mb-2 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500"></div>Data Export (数据导出)</h3>
            <p className="text-muted-foreground text-sm">赛事结束后，一键导出 Penalty Log (判罚记录 CSV)，方便向官方提交赛后汇报材料。</p>
          </div>
        </div>
      </section>
    </div>
  )
}

export default function OrganizerHelpPage() {
   return (
      <div className="container max-w-4xl py-8 space-y-8">
         <div className="flex items-center gap-4">
            <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
               <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
               <h1 className="text-2xl font-bold tracking-tight">Organiser Manuals</h1>
               <p className="text-muted-foreground">Guides and documentation for tournament organisers.</p>
            </div>
         </div>

         <Tabs defaultValue="en" className="w-full">
            <TabsList className="mb-6 grid w-[400px] grid-cols-2">
               <TabsTrigger value="en">English (US)</TabsTrigger>
               <TabsTrigger value="zh">Chinese (中文)</TabsTrigger>
            </TabsList>

            <TabsContent value="en">
               <div className="bg-card border rounded-xl overflow-hidden shadow-md">
                  <header className="mb-0 text-center bg-gradient-to-r from-blue-500/[0.08] via-purple-500/[0.08] to-blue-500/[0.08] p-8 border-b border-border/50">
                     <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4 bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent pb-1 leading-snug">Organiser Manual</h1>
                     <p className="text-muted-foreground font-semibold tracking-wide uppercase text-sm">Last Updated: March 26, 2026</p>
                  </header>
                  <div className="p-6 md:p-10">
                     <EnglishManual />
                  </div>
               </div>
            </TabsContent>

            <TabsContent value="zh">
               <div className="bg-card border rounded-xl overflow-hidden shadow-md">
                  <header className="mb-0 text-center bg-gradient-to-r from-blue-500/[0.08] via-purple-500/[0.08] to-blue-500/[0.08] p-8 border-b border-border/50">
                     <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4 bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent pb-1 leading-snug">主办方用户手册</h1>
                     <p className="text-muted-foreground font-semibold tracking-wide uppercase text-sm">最后更新：2026年3月26日</p>
                  </header>
                  <div className="p-6 md:p-10">
                     <ChineseManual />
                  </div>
               </div>
            </TabsContent>
         </Tabs>
      </div>
   );
}
