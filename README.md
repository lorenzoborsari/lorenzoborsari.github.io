# Sito statico — Lorenzo Borsari

Versione a file separati del bundle `index.html` originale. React, ReactDOM e il
runtime a componenti (~350 KB di JavaScript) sono stati rimossi: le pagine sono
pre-renderizzate una per lingua, e resta solo un piccolo file di comportamento.

## Struttura

```
site/
├── index.html                  pagina italiana (lingua di default)
├── en/index.html               inglese
├── es/index.html               spagnolo
├── robots.txt
├── sitemap.xml                 con annotazioni hreflang
├── site.webmanifest
└── assets/
    ├── css/site.css            design system + @font-face + media query
    ├── js/site.js              tema, scroll, reveal, contatori, starfield
    ├── fonts/*.woff2           16 file, selezionati via unicode-range
    └── img/
        ├── portrait.jpg        256px (reso a 76px)
        ├── portrait@2x.jpg     512px per schermi ad alta densità
        ├── portrait-source.jpg originale 400px, sorgente per i rebuild
        ├── og-card.png/.jpg    card social 1200×630
        ├── favicon.svg
        ├── apple-touch-icon.png
        └── icon-192.png / icon-512.png
```

## Prima di pubblicare

**Sostituire il dominio.** Le URL assolute usano il segnaposto
`https://lorenzoborsari.example`. Va sostituito in cinque file:

```bash
grep -rl 'lorenzoborsari.example' . | xargs sed -i 's|https://lorenzoborsari.example|https://IL-TUO-DOMINIO|g'
```

Interessa `canonical`, `hreflang`, `og:url`, `og:image`, il JSON-LD e la sitemap.
I percorsi degli asset sono già relativi alla root (`/assets/...`), quindi il
sito va servito dalla radice del dominio.

## Header consigliati

I nomi dei file non sono versionati con hash, quindi conviene tenere l'HTML
fresco e gli asset cacheabili ma rivalidabili:

```
/assets/fonts/*    Cache-Control: public, max-age=31536000, immutable
/assets/img/*      Cache-Control: public, max-age=2592000
/assets/css/*      Cache-Control: public, max-age=86400
/assets/js/*       Cache-Control: public, max-age=86400
/*.html            Cache-Control: public, max-age=0, must-revalidate
```

Abilitare gzip o brotli: HTML, CSS e JS si comprimono di circa il 75%. I woff2 e
i JPEG sono già compressi, non serve ricomprimerli.

## SEO

Ogni pagina include: `title`, `meta description`, `canonical`, `hreflang` per le
tre lingue più `x-default`, Open Graph completo, Twitter Card `summary_large_image`,
e JSON-LD con uno schema `Person` collegato a una `ProfilePage`. Il ritratto è un
`<img>` reale con `alt` — prima viveva nello shadow DOM di un custom element e
nessun crawler lo vedeva.

Il cambio lingua ora è navigazione vera (`/`, `/en/`, `/es/`) invece di uno stato
JavaScript: tre URL indicizzabili separatamente.

## Manutenzione dei contenuti

I testi sono pre-renderizzati dentro l'HTML, quindi per modificarli si edita
direttamente il markup della lingua interessata. Se i cambiamenti sono frequenti
e riguardano tutte e tre le lingue, conviene reintrodurre una fonte unica dei
testi e rigenerare le pagine da quella, invece di editarle in parallelo.

## Differenza di comportamento rispetto all'originale

Nel bundle originale il runtime applicava `#dc-root { height: 100% }`. Questo
limitava il blocco contenitore dell'header a un'altezza schermo, così l'header
`position: sticky` smetteva di restare in cima dopo il primo scroll. Il codice
della pagina però rimpicciolisce la topbar e le aggiunge un'ombra quando si
scorre — logica che ha senso solo se l'header resta visibile. Era un effetto
collaterale dell'impalcatura di bundling, non una scelta di design, e qui
l'header resta correttamente agganciato. Se si preferisce il comportamento
precedente, basta aggiungere a `site.css`:

```css
#dc-root { height: 100%; }
```
