# Code style

- Utiliser par défaut des arrow functions assignées à des `const` dans les fichiers JavaScript et TypeScript nouveaux ou modifiés.
- Déclarer les composants React avec `const ComponentName = (...) => ...`.
- Exporter ensuite le composant, ou utiliser `export const`, selon le type d’export attendu par Next.js.
- Conserver une déclaration `function` uniquement lorsqu’une API, le hoisting ou une surcharge TypeScript la rend réellement utile.
- Ne pas déclarer de `class` sans en discuter au préalable avec l’utilisateur et obtenir son accord explicite.
- Utiliser des single quotes et ne pas ajouter de point-virgule en fin de ligne.

# Communication

- Ne jamais inclure de diff unifié dans les réponses, sauf demande explicite de l’utilisateur.
- Après une modification, fournir uniquement un résumé clair, les fichiers concernés et les vérifications effectuées. Le diff reste consultable dans Git et Visual Studio Code.
