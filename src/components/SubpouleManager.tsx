import { useMemo, useState } from "react";
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
  const [createName, setCreateName] = useState("");
  const [createCode, setCreateCode] = useState("");
  const [joinCode, setJoinCode] = useState("");

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
      <div className="space-y-6">
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

        <Tabs defaultValue="chart" className="w-full">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="chat" className="gap-1.5 text-xs sm:text-sm">
              <MessageCircle className="h-4 w-4" /> <span className="hidden sm:inline">Chat</span>
            </TabsTrigger>
            <TabsTrigger value="chart" className="gap-1.5 text-xs sm:text-sm">
              <TrendingUp className="h-4 w-4" /> <span className="hidden sm:inline">Grafiek</span>
            </TabsTrigger>
            <TabsTrigger value="benchmark" disabled={!benchmarkUnlocked} className="gap-1.5 text-xs sm:text-sm" title={!benchmarkUnlocked ? "Beschikbaar zodra de inschrijving sluit en de koers live is" : undefined}>
              <Swords className="h-4 w-4" /> <span className="hidden sm:inline">Benchmark</span>
            </TabsTrigger>
            <TabsTrigger value="heatmap" disabled={!benchmarkUnlocked} className="gap-1.5 text-xs sm:text-sm" title={!benchmarkUnlocked ? "Beschikbaar zodra de inschrijving sluit en de koers live is" : undefined}>
              <Flame className="h-4 w-4" /> <span className="hidden sm:inline">Heatmap</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="pt-4">
            <PelotonChat subpoolName={active.name} subpoolId={active.id} />
          </TabsContent>
          <TabsContent value="chart" className="pt-4">
            <SubpouleStandings subpouleId={active.id} subpouleName={active.name} />
          </TabsContent>
          <TabsContent value="benchmark" className="pt-4">
            <div key={benchmarkUnlocked ? "unlocked" : "locked"}>
              {benchmarkUnlocked ? (
                <SubpouleBenchmark subpouleId={active.id} gameId={effectiveGameId} />
              ) : (
                <Card className="retro-border">
                  <CardContent className="p-6 text-sm text-muted-foreground text-center space-y-2">
                    <Swords className="h-8 w-8 text-muted-foreground/50 mx-auto" />
                    <p className="font-display font-bold text-foreground">Benchmark nog vergrendeld</p>
                    <p>De teamvergelijking gaat open zodra de admin de inschrijving sluit en de koers live zet.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
          <TabsContent value="heatmap" className="pt-4">
            <div key={benchmarkUnlocked ? "heatmap-unlocked" : "heatmap-locked"}>
              {benchmarkUnlocked ? (
                <SubpouleHeatmap subpouleId={active.id} />
              ) : (
                <Card className="retro-border">
                  <CardContent className="p-6 text-sm text-muted-foreground text-center space-y-2">
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
    <div className="space-y-6">
      <Card className="retro-border">
        <CardHeader className="border-b-2 border-foreground bg-secondary/30">
          <CardTitle className="font-display flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> Mijn subpoules
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Laden…</div>
          ) : subpoules.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">
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
            <TabsContent value="create" className="space-y-3 pt-4">
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
            <TabsContent value="join" className="space-y-3 pt-4">
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
