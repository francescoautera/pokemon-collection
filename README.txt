POKEMON COLLECTION - PROTOTIPO PWA

Contenuto:
- index.html: app
- data.js: dati estratti da Collezione_Pokemon.xlsx
- app.js / styles.css: logica e interfaccia
- manifest.webmanifest / sw.js: installazione come PWA

COME PROVARLA SU PC
1. Apri un terminale dentro questa cartella.
2. Esegui: python -m http.server 8080
3. Apri http://localhost:8080

COME USARLA SU CELLULARE
La cartella va pubblicata su un hosting statico HTTPS (es. GitHub Pages, Netlify, Cloudflare Pages).
Poi apri il link dal telefono e scegli “Aggiungi alla schermata Home”.

DATI
Le modifiche posseduto/non posseduto sono salvate localmente nel browser (localStorage).
Non modificano il file Excel originale e non sono sincronizzate tra dispositivi in questa prima versione.

IMMAGINI
Gli sprite vengono caricati automaticamente da PokemonDB usando il nome del Pokémon.
Per forme o nomi non standard può comparire il fallback con iniziale; possiamo aggiungere una mappa specifica nella versione successiva.
