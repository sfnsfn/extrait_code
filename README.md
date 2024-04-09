## Extrait de code

Voici quelques fichiers source de mon précédent projet basé sur le framework FiveM dans le cadre d'un évènement communautaire.

Il est malheuresement impossible de réellement prendre en considération sans avoir le contexte du projet dans sa globalité, mais ces quelques fichiers illustrent en partie le fonction d'un des modules (ici, de la fonctionnalité Inventaire) parmis les plusieurs dizaines de modules existants.

Ce repo ne sert qu'à illustrer les différentes technologies et méthodes de programmation  utilisés, ainsi que de donner un aperçu du projet. Je reste disponible en cas de questions concernant le code voire pour en faire une demonstration.

Liens utiles
- Natives (API): https://docs.fivem.net/natives/
- Documentation: https://docs.fivem.net/docs/


### Arborescence

```bash
├── README.me
│ 
├── config # Fichiers de config utilisés à travers notre application
│		 └── items.js
│
├── nui # Front-end web React (Single Page Application injecté via CEF)
│		 │
│		 ├── components # Components réutilisés à travers l'app
│		 │		 ├── ItemDetails.jsx
│		 │		 └── index.styles.js
│		 │
│		 ├── package.json
│		 ├── index.jsx # Entry point
│		 │ 
│		 └── views # Vues rendues à chaque page de notre SPA, ex: ouverture d'inventaire
│		     └── Inventory.jsx
│ 
└── src # Code interagissant avec le jeu et le serveur nui<->client(jeu)<->database
	│
    ├── client # Client-side qui manipule le jeu + communique avec le NUI
    │		 │
    │		 ├── class # Classes réutilisés à travers l'app (client)
    │		 │		 ├── ScreenFX.ts
    │		 │		 └── Webview.ts
    │		 │	
    │		 ├── lib # Fonctions réutilisés à travers l'app
    │		 │		 └── callback.ts
    │		 │	
    │		 └── modules # Modules du projet, c'est ici que se trouvent les fonctionnalités
    │		     └── inventory.ts
    │
    ├── package.json
    │
    ├── server 
    │	 │	
    │    ├── class # Classes réutilisés à travers l'app (serveur)
    │    │		 └── Players.ts
    │    │	
    │    ├── models # Nos models (mongo) représentant nos collections, utilisés uniquement via les classes
    │    │		 └── Character.ts
    │    │	
    │    └── modules # Modules du projet, c'est ici que se trouvent les fonctionnalités
    │		 	└── inventory.ts
    │
    └── shared # Classes et fonctions réutilisés à travers l'app (client et serveur)
```