## Plan: Google Search Console koppelen

Connectie is gelegd via **koerspoule@gmail.com**. Verificatietoken is al opgehaald.

### Stappen

1. **Meta-tag toevoegen** aan `index.html` in de `<head>`:
   ```html
   <meta name="google-site-verification" content="TBIUOi40cb5tkywvv1cqhKbVATm_3CYV9dG3tfaKuRw" />
   ```

2. **Publiceren** — jij klikt Publish zodat https://koerspoule.nl/ de tag serveert.

3. **Verifiëren** — ik roep Google's verify endpoint aan voor `https://koerspoule.nl/`.

4. **Site toevoegen** aan Search Console property-lijst.

5. **Sitemap indienen**: `https://koerspoule.nl/sitemap.xml`.

6. **SEO-finding `gsc:gsc` markeren als fixed.**

### Belangrijk

Na stap 1 moet jij **Publish** klikken voordat ik stap 3 kan uitvoeren — Google fetcht de live HTML om de tag te zien. Daarna geef je een seintje en rond ik 3-6 in één keer af.