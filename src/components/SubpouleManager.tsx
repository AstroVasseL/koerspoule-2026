import { useMemo, useState, useEffect } from "react";
type Props = { gameId?: string; gameName?: string; gameStatus?: string };
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentGame } from "@/hooks/useCurrentGame";
import { useSubpoules, useSubpouleMembers } from "@/hooks/useSubpoules";
import PelotonChat from "@/components/PelotonChat";
import SubpouleStandings from "@/components/SubpouleStandings";
import SubpouleBenchmark from "@/components/SubpouleBenchmark";
import SubpouleHeatmap from "@/components/SubpouleHeatmap";
import { Copy, LogOut, Trash2, Users, Crown, UserMinus, ArrowLeft, ChevronRight, MessageCircle, TrendingUp, Swords, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SubpouleManager({ gameId, gameName, gameStatus }: Props = {}) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: currentGame } = useCurrentGame();
  const effectiveGameId = gameId ?? currentGame?.id;
  const effectiveStatus = gameStatus ?? currentGame?.status;
  const benchmarkUnlocked = ["live", "locked", "finished", "closed"].includes(String(effectiveStatus ?? ""));
  const game = gameId
    ? { id: gameId, name: gameName ?? "" }
    : currentGame;
  const { subpoules, isLoading, create, join, leave, remove, removeMember } = useSubpoules(effectiveGameId);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("chart");
  const [createName, setCreateName] = useState("");
  const [createCode, setCreateCode] = useState("");
  const [joinCode, setJoinCode] = useState("");

  // Deeplink support: ?subpoule=...&view=koerscafe
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const spId = params.get("subpoule");
    const view = params.get("view");
    if (spId) {
      const match = subpoules.find((s) => s.id === spId);
      if (match) {
        setActiveId(spId);
        if (view === "koerscafe") {
          setActiveTab("chat");
        }
        // Clean up query params so the URL stays clean
        const url = new URL(window.location.href);
        url.searchParams.delete("subpoule");
        url.searchParams.delete("view");
        window.history.replaceState({}, "", url.toString());
      }
    }
  }, [subpoules]);

  const active = useMemo(
    () => (activeId ? subpoules.find((s) => s.id === activeId) ?? null : null),
    [subpoules, activeId]
  );
  const { data: members = [] } = useSubpouleMembers(active?.id);

  const handleCreate = async () => {
    if (!effectiveGameId) {
      toast({ title: "Geen koers geselecteerd", description: "Kies eerst een koers in Mijn Peloton.", variant: "destructive" });
      return;
    }
    if (createName.trim().length < 2) {
      toast({ title: "Naam te kort", description: "Minimaal 2 tekens.", variant: "destructive" });
      return;
    }
    if (createCode.trim().length < 4) {
      toast({ title: "Code te kort", description: "Minimaal 4 tekens.", variant: "destructive" });
      return;
    }
    try {
      const id = await create.mutateAsync({ name: createName.trim(), code: createCode.trim() });
      toast({ title: "Subpoule aangemaakt", description: createName });
      setCreateName(""); setCreateCode("");
      setActiveId(id);
    } catch (e: any) {
      console.error("[SubpouleManager] create failed", e);
      const msg =
        e?.message ||
        e?.error_description ||
        e?.details ||
        e?.hint ||
        "Onbekende fout. Probeer een andere naam of code.";
      toast({ title: "Aanmaken mislukt", description: msg, variant: "destructive" });
    }
  };

  const handleJoin = async () => {
    try {
      const id = await join.mutateAsync({ code: joinCode });
      toast({ title: "Welkom in de subpoule!" });
      setJoinCode("");
      setActiveId(id);
    } catch (e) {
      toast({ title: "Joinen mislukt", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  const handleLeave = async (id: string) => {
    if (!confirm("Subpoule verlaten?")) return;
    try {
      await leave.mutateAsync({ subpouleId: id });
      toast({ title: "Subpoule verlaten" });
      if (activeId === id) setActiveId(null);
    } catch (e) {
      toast({ title: "Verlaten mislukt", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Subpoule definitief verwijderen? Dit kan niet ongedaan worden.")) return;
    try {
      await remove.mutateAsync({ subpouleId: id });
      toast({ title: "Subpoule verwijderd" });
      if (activeId === id) setActiveId(null);
    } catch (e) {
      toast({ title: "Verwijderen mislukt", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  const handleRemoveMember = async (subpouleId: string, userId: string, name: string) => {
    if (!confirm(`${name} verwijderen uit de subpoule?`)) return;
    try {
      await removeMember.mutateAsync({ subpouleId, userId });
      toast({ title: "Lid verwijderd" });
    } catch (e) {
      toast({ title: "Verwijderen mislukt", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Code gekopieerd", description: code });
  };

  if (!user) {
    return <div className="retro-border bg-card p-6 text-muted-foreground">Log in om subpoules te beheren.</div>;
  }
  if (!game) {
    return <div className="retro-border bg-card p-6 text-muted-foreground">Geen actieve koers gevonden.</div>;
  }

  // Drilldown view: when a subpoule is selected, show only its detail tab
  if (active && activeId) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={() => setActiveId(null)} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Terug naar subpoules
          </Button>
          <div className="flex items-center gap-2">
            {active.is_owner ? (
              <Button
                variant="ghost" size="sm"
                onClick={() => handleDelete(active.id)}
                className="text-destructive hover:text-destructive gap-1"
              >
                <Trash2 className="h-4 w-4" /> Verwijderen
              </Button>
            ) : (
              <Button
                variant="ghost" size="sm"
                onClick={() => handleLeave(active.id)}
                className="gap-1"
              >
                <LogOut className="h-4 w-4" /> Verlaten
              </Button>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Tab nav — zelfde layout als Hors Catégorie */}
          <div className="overflow-x-auto -mx-1 px-1 md:overflow-visible mb-1" style={{ scrollbarWidth: "none" }}>
            <div className="flex gap-1 rounded-xl border-2 border-foreground/15 bg-secondary/30 p-1 min-w-max md:min-w-0 md:w-full">
              {([
                { value: "chat",      label: "Chat",      short: "Chat",    Icon: MessageCircle, disabled: false              },
                { value: "chart",     label: "Grafiek",   short: "Grafiek", Icon: TrendingUp,    disabled: false              },
                { value: "benchmark", label: "Benchmark", short: "Bench",   Icon: Swords,        disabled: !benchmarkUnlocked },
                { value: "heatmap",   label: "Heatmap",   short: "Heat",    Icon: Flame,         disabled: !benchmarkUnlocked },
              ] as const).map(({ value, label, short, Icon, disabled }) => (
                <button
                  key={value}
                  type="button"
                  disabled={disabled}
                  onClick={() => !disabled && setActiveTab(value)}
                  title={disabled ? "Beschikbaar zodra de inschrijving sluit en de koers live is" : undefined}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-lg px-3 min-h-[44px] text-xs font-semibold uppercase tracking-wider transition-colors md:flex-1 flex-none min-w-[44px] [@media(min-width:380px)]:min-w-[64px] md:min-w-0",
                    disabled && "opacity-40 cursor-not-allowed",
                    !disabled && activeTab === value
                      ? "bg-card text-foreground shadow-sm border border-foreground/10"
                      : !disabled ? "text-muted-foreground hover:text-foreground hover:bg-secondary/60" : "text-muted-foreground",
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="sm:hidden [@media(max-width:380px)]:hidden">{short}</span>
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>
          </div>

          <TabsContent value="chat" className="pt-3 space-y-3">
            <PelotonChat subpoolName={active.name} subpoolId={active.id} />
            <Card className="retro-border">
              <CardHeader className="border-b-2 border-foreground bg-secondary/30">
                <CardTitle className="font-display flex items-center justify-between gap-2 flex-wrap">
                  <span className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    {active.name}
                    {active.is_owner && (
                      <Badge variant="secondary" className="text-xs gap-1">
                        <Crown className="h-3 w-3" /> Eigenaar
                      </Badge>
                    )}
                  </span>
                  <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                    Code: {active.code}
                    <button
                      onClick={() => copyCode(active.code)}
                      className="hover:text-foreground"
                      title="Kopieer code"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {members.map((m) => (
                    <div key={m.user_id} className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{m.display_name}</span>
                        {m.user_id === active.owner_user_id && (
                          <Badge variant="secondary" className="text-xs gap-1">
                            <Crown className="h-3 w-3" /> Eigenaar
                          </Badge>
                        )}
                        {m.user_id === user.id && (
                          <Badge variant="outline" className="text-xs">jij</Badge>
                        )}
                      </div>
                      {active.is_owner && m.user_id !== active.owner_user_id && (
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => handleRemoveMember(active.id, m.user_id, m.display_name)}
                          className="text-destructive hover:text-destructive"
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="chart" className="pt-3">
            <SubpouleStandings subpouleId={active.id} subpouleName={active.name} />
          </TabsContent>
          <TabsContent value="benchmark" className="pt-3">
            <div key={benchmarkUnlocked ? "unlocked" : "locked"}>
              {benchmarkUnlocked ? (
                <SubpouleBenchmark subpouleId={active.id} gameId={effectiveGameId} />
              ) : (
                <Card className="retro-border">
                  <CardContent className="p-4 text-sm text-muted-foreground text-center space-y-2">
                    <Swords className="h-8 w-8 text-muted-foreground/50 mx-auto" />
                    <p className="font-display font-bold text-foreground">Benchmark nog vergrendeld</p>
                    <p>De teamvergelijking gaat open zodra de admin de inschrijving sluit en de koers live zet.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
          <TabsContent value="heatmap" className="pt-3">
            <div key={benchmarkUnlocked ? "heatmap-unlocked" : "heatmap-locked"}>
              {benchmarkUnlocked ? (
                <SubpouleHeatmap subpouleId={active.id} />
              ) : (
                <Card className="retro-border">
                  <CardContent className="p-4 text-sm text-muted-foreground text-center space-y-2">
                    <Flame className="h-8 w-8 text-muted-foreground/50 mx-auto" />
                    <p className="font-display font-bold text-foreground">Heatmap nog vergrendeld</p>
                    <p>De heatmap gaat open zodra de admin de inschrijving sluit en de koers live zet.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // Overview: list + create/join
  return (
    <div className="space-y-4">
      <Card className="retro-border">
        <CardHeader className="border-b-2 border-foreground bg-secondary/30">
          <CardTitle className="font-display flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> Mijn subpoules
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 text-sm text-muted-foreground">Laden…</div>
          ) : subpoules.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">
              Je zit nog in geen enkele subpoule. Maak er een aan of join met een code.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {subpoules.map((sp) => (
                <button
                  key={sp.id}
                  className="w-full p-4 flex items-center justify-between gap-3 hover:bg-secondary/30 transition-colors text-left"
                  onClick={() => setActiveId(sp.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-display font-bold">{sp.name}</span>
                      {sp.is_owner && (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <Crown className="h-3 w-3" /> Eigenaar
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">{sp.member_count} leden</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground font-mono mt-0.5">
                      Code: {sp.code}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="retro-border">
        <CardContent className="p-4">
          <Tabs defaultValue="create">
            <TabsList className="w-full">
              <TabsTrigger value="create" className="flex-1">Nieuwe subpoule</TabsTrigger>
              <TabsTrigger value="join" className="flex-1">Joinen via code</TabsTrigger>
            </TabsList>
            <TabsContent value="create" className="space-y-3 pt-3">
              <div>
                <Label htmlFor="sp-name">Naam</Label>
                <Input id="sp-name" value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="Bijv. Vrienden van Jan" />
              </div>
              <div>
                <Label htmlFor="sp-code">Toegangscode</Label>
                <Input id="sp-code" value={createCode} onChange={(e) => setCreateCode(e.target.value)} placeholder="Min. 4 tekens" />
              </div>
              <Button onClick={handleCreate} disabled={create.isPending || !createName.trim() || !createCode.trim()} className="w-full">
                Subpoule aanmaken
              </Button>
            </TabsContent>
            <TabsContent value="join" className="space-y-3 pt-3">
              <div>
                <Label htmlFor="join-code">Toegangscode</Label>
                <Input id="join-code" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="Vraag de eigenaar om de code" />
              </div>
              <Button onClick={handleJoin} disabled={join.isPending || !joinCode.trim()} className="w-full">
                Joinen
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
