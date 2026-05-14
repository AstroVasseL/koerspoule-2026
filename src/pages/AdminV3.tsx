import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { LayoutDashboard, Trophy, Tag, Users, ListChecks, Calendar, Calculator, Shield, Inbox, Mail, ShieldCheck, Instagram } from "lucide-react";
import NotifyTab from "@/components/admin/NotifyTab";
import ApprovalsTab from "@/components/admin/ApprovalsTab";

import GamesTab, { type Game } from "@/components/admin/GamesTab";
import CategoriesTab, { type Category } from "@/components/admin/CategoriesTab";
import StartlistTab, { type Rider, type Team } from "@/components/admin/StartlistTab";
import StagesTab, { type Stage } from "@/components/admin/StagesTab";
import ResultsTab from "@/components/admin/ResultsTab";
import CalculationTab from "@/components/admin/CalculationTab";
import UsersTab from "@/components/admin/UsersTab";
import EntriesTab from "@/components/admin/EntriesTab";
import InstagramExport from "@/pages/InstagramExport";
import DashboardTab from "@/components/admin/DashboardTab";

export default function AdminV3() {
  const { user, role, loading } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [activeGameId, setActiveGameId] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);

  const activeGame = useMemo(() => games.find((g) => g.id === activeGameId), [games, activeGameId]);

  async function loadGames() {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("games")
      .select("id, name, game_type, year, status, starts_at, slug, registration_opens_at, registration_closes_at, accent_color")
      .order("year", { ascending: false, nullsFirst: false });
    if (error) {
      console.error("Games load error:", error);
      toast.error(`Games laden mislukt: ${error.message}`);
      return;
    }
    setGames((data ?? []) as Game[]);
    if ((data ?? []).length && !activeGameId) {
      setActiveGameId(data![0].id);
    }
  }

  async function loadGameScoped(gameId: string) {
    if (!supabase || !gameId) return;
    const [c, t, r, s] = await Promise.all([
      supabase
        .from("categories")
        .select("id, game_id, name, short_name, sort_order, max_picks")
        .eq("game_id", gameId)
        .order("sort_order"),
      supabase
        .from("teams")
        .select("id, name, short_name, game_id")
        .or(`game_id.eq.${gameId},game_id.is.null`)
        .order("name"),
      supabase
        .from("riders")
        .select("id, name, start_number, team_id, is_youth_eligible, teams(name)")
        .eq("game_id", gameId)
        .order("start_number", { nullsFirst: false }),
      supabase
        .from("stages")
        .select("id, game_id, stage_number, name, date, status, stage_type")
        .eq("game_id", gameId)
        .order("stage_number"),
    ]);

    if (c.error) console.error("Categories load:", c.error);
    if (t.error) console.error("Teams load:", t.error);
    if (r.error) console.error("Riders load:", r.error);
    if (s.error) console.error("Stages load:", s.error);

    setCategories((c.data ?? []) as Category[]);
    setTeams((t.data ?? []) as Team[]);
    setRiders(
      ((r.data ?? []) as unknown as Array<{
        id: string;
        name: string;
        start_number: number | null;
        team_id: string | null;
        is_youth_eligible: boolean | null;
        teams: { name: string } | { name: string }[] | null;
      }>).map((row) => ({
        id: row.id,
        name: row.name,
        start_number: row.start_number,
        team_id: row.team_id,
        is_youth_eligible: Boolean(row.is_youth_eligible),
        team_name: Array.isArray(row.teams) ? row.teams[0]?.name ?? null : row.teams?.name ?? null,
      }))
    );
    setStages((s.data ?? []) as Stage[]);
  }

  useEffect(() => {
    loadGames();
  }, []);

  useEffect(() => {
    if (activeGameId) loadGameScoped(activeGameId);
  }, [activeGameId]);

  if (loading) return <div className="container mx-auto px-4 py-8">Laden...</div>;

  if (!supabase) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card><CardHeader><CardTitle>Admin</CardTitle></CardHeader>
          <CardContent>Supabase configuratie ontbreekt.</CardContent>
        </Card>
      </div>
    );
  }

  if (!user || role !== "admin") {
    return (
      <div className="container mx-auto px-4 py-8" data-testid="admin-no-access">
        <Card><CardHeader><CardTitle>Geen toegang</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Deze pagina is alleen voor admins. Log in met je admin-account.
            </p>
            <a href="/login" className="text-primary underline">Naar login</a>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6" data-testid="admin-v3">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Koerspoule Admin</h1>
          <p className="text-muted-foreground text-sm font-serif italic">Centraal beheercentrum — alles op één plek.</p>
        </div>
        <div className="min-w-[280px]">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Actieve game</Label>
          <Select value={activeGameId} onValueChange={setActiveGameId}>
            <SelectTrigger data-testid="active-game-selector"><SelectValue placeholder="Kies een game" /></SelectTrigger>
            <SelectContent>
              {games.map((g) => (
                <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="dashboard" data-testid="tab-dashboard"><LayoutDashboard className="w-4 h-4 mr-2" />Dashboard</TabsTrigger>
          <TabsTrigger value="games" data-testid="tab-games"><Trophy className="w-4 h-4 mr-2" />Games</TabsTrigger>
          <TabsTrigger value="categories" disabled={!activeGameId} data-testid="tab-categories"><Tag className="w-4 h-4 mr-2" />Categorieën</TabsTrigger>
          <TabsTrigger value="startlist" disabled={!activeGameId} data-testid="tab-startlist"><Users className="w-4 h-4 mr-2" />Startlijst</TabsTrigger>
          <TabsTrigger value="stages" disabled={!activeGameId} data-testid="tab-stages"><Calendar className="w-4 h-4 mr-2" />Etappes</TabsTrigger>
          <TabsTrigger value="results" disabled={!activeGameId} data-testid="tab-results"><ListChecks className="w-4 h-4 mr-2" />Uitslagen</TabsTrigger>
          <TabsTrigger value="calc" disabled={!activeGameId} data-testid="tab-calc"><Calculator className="w-4 h-4 mr-2" />Berekening</TabsTrigger>
          <TabsTrigger value="approvals" disabled={!activeGameId} data-testid="tab-approvals"><ShieldCheck className="w-4 h-4 mr-2" />Fiatteren</TabsTrigger>
          <TabsTrigger value="entries" disabled={!activeGameId} data-testid="tab-entries"><Inbox className="w-4 h-4 mr-2" />Inzendingen</TabsTrigger>
          <TabsTrigger value="notify" data-testid="tab-notify"><Mail className="w-4 h-4 mr-2" />Notify</TabsTrigger>
          <TabsTrigger value="users" data-testid="tab-users"><Shield className="w-4 h-4 mr-2" />Gebruikers</TabsTrigger>
          <TabsTrigger value="instagram" disabled={!activeGameId} data-testid="tab-instagram"><Instagram className="w-4 h-4 mr-2" />Instagram</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <DashboardTab activeGameId={activeGameId} activeGame={activeGame ?? null} />
        </TabsContent>

        <TabsContent value="games">
          <GamesTab games={games} setActiveGameId={setActiveGameId} reload={loadGames} />
        </TabsContent>

        <TabsContent value="categories">
          <CategoriesTab activeGameId={activeGameId} categories={categories} reload={() => loadGameScoped(activeGameId)} />
        </TabsContent>

        <TabsContent value="startlist">
          <StartlistTab activeGameId={activeGameId} riders={riders} teams={teams} reload={() => loadGameScoped(activeGameId)} />
        </TabsContent>

        <TabsContent value="stages">
          <StagesTab activeGameId={activeGameId} stages={stages} reload={() => loadGameScoped(activeGameId)} />
        </TabsContent>

        <TabsContent value="results">
          <ResultsTab activeGameId={activeGameId} stages={stages} riders={riders} gameType={activeGame?.game_type ?? null} gameYear={activeGame?.year ?? null} />
        </TabsContent>

        <TabsContent value="approvals">
          <ApprovalsTab activeGameId={activeGameId} />
        </TabsContent>

        <TabsContent value="calc">
          <CalculationTab activeGameId={activeGameId} stages={stages} />
        </TabsContent>

        <TabsContent value="entries">
          <EntriesTab activeGameId={activeGameId} />
        </TabsContent>

        <TabsContent value="notify">
          <NotifyTab />
        </TabsContent>

        <TabsContent value="users">
          <UsersTab />
        </TabsContent>

        <TabsContent value="instagram">
          <InstagramExport gameId={activeGameId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
