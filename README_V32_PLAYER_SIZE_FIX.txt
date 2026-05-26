Replace only these files:
- game.js
- index.html

Fixes:
- Keeps the larger player sprite sizing from v31.
- Removes the likely missing-texture green square by using the built-in star power-up texture instead of the sliced star file.
- Adds fallbacks for World 1 coin, skill, and bot assets so the game does not break if an asset file is missing or misnamed.
- Cache-bumped to game.js?v=32.

After replacing, run Live Server and press Ctrl+F5.
