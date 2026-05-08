-- Open public read access to reference data so non-authenticated visitors
-- can preview the rules and team builder when a game is in open registration.

-- games
DROP POLICY IF EXISTS read_games ON public.games;
CREATE POLICY read_games ON public.games FOR SELECT USING (true);

-- categories
DROP POLICY IF EXISTS read_categories ON public.categories;
CREATE POLICY read_categories ON public.categories FOR SELECT USING (true);

-- category_riders
DROP POLICY IF EXISTS read_category_riders ON public.category_riders;
CREATE POLICY read_category_riders ON public.category_riders FOR SELECT USING (true);

-- riders
DROP POLICY IF EXISTS read_riders ON public.riders;
CREATE POLICY read_riders ON public.riders FOR SELECT USING (true);

-- teams
DROP POLICY IF EXISTS read_teams ON public.teams;
CREATE POLICY read_teams ON public.teams FOR SELECT USING (true);

-- game_riders
DROP POLICY IF EXISTS read_game_riders ON public.game_riders;
CREATE POLICY read_game_riders ON public.game_riders FOR SELECT USING (true);

-- points_schema
DROP POLICY IF EXISTS read_points_schema ON public.points_schema;
CREATE POLICY read_points_schema ON public.points_schema FOR SELECT USING (true);

-- startlists
DROP POLICY IF EXISTS read_startlists ON public.startlists;
CREATE POLICY read_startlists ON public.startlists FOR SELECT USING (true);

-- stages
DROP POLICY IF EXISTS read_stages ON public.stages;
CREATE POLICY read_stages ON public.stages FOR SELECT USING (true);
