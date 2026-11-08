# Revizio 2.2.0 (iOS redesign)

Interfață redesenată în stil iOS: titluri mari, liste grupate, tab bar translucid, bottom sheets, swipe-to-delete, inel de progres.
Fără Tailwind, Google Fonts sau alte dependențe CDN (font de sistem: SF Pro pe iPhone).

## Publicare
Înlocuiește în rădăcina GitHub Pages: `index.html`, `app.css`, `app.js`, `sw.js`, `manifest.json`. Iconițele rămân neschimbate.
Datele existente se citesc din `revizio_app_state_v3` (format neschimbat).

## Update-uri viitoare
Schimbă `VERSION` din `sw.js` la fiecare versiune; aplicația afișează bannerul „Actualizează”.

## Noutăți
- Adaugi lucrări și pe zile din trecut (Istoric → zi → „Adaugă lucrare în această zi”)
- Programări grupate pe zile, cu Sună și Navighează (Google Maps), swipe stânga pentru ștergere + Anulează
- Atingi un client salvat pentru o programare nouă cu datele completate
- Ritm lunar calculat până ieri (înainte includea câștigul de azi, dar nu și targetul de azi)
- Temă Auto urmărește sistemul; zi nouă detectată la revenirea în aplicație
- Import backup validat și cu confirmare; erori de salvare afișate

## Vizite (2.2.0)
Programări → „Start vizită” → alegi serviciile (poți adăuga mai multe) → „Finalizare” → „Plată card?” Da/Nu.
Serviciile intră în totalul zilei. Plățile apar în cardurile „Plată card” și „Plată pe factură” (luna curentă), grupate pe client.
