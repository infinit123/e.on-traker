# Revizio 2.0.1 Rebuild

Reconstrucție completă, fără Tailwind, Google Fonts sau alte dependențe CDN.

## Publicare
Încarcă toate fișierele în rădăcina GitHub Pages. Nu schimba structura. Fișierele vechi pot fi înlocuite, iar datele existente vor fi citite din cheia `revizio_app_state_v3`.

## Update-uri viitoare
Schimbă valoarea `VERSION` din `sw.js` la fiecare versiune. Aplicația va afișa butonul Actualizează când noul Service Worker ajunge în starea waiting.
