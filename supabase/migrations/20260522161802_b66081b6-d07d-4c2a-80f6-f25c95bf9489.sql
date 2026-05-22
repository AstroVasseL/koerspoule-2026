CREATE POLICY "lefevere_rapporten_update" ON public.lefevere_rapporten
FOR UPDATE
USING (EXISTS (SELECT 1 FROM entries e WHERE e.id = lefevere_rapporten.entry_id AND e.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM entries e WHERE e.id = lefevere_rapporten.entry_id AND e.user_id = auth.uid()));