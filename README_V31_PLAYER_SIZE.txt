Replace only these files in your local project folder:
- game.js
- index.html

What changed:
- Enlarged the in-level player sprite from 48x72 to 64x96.
- Enlarged crouch pose proportionally.
- Adjusted the invisible physics body so the larger sprite remains playable and not overly bulky.
- Spawn point moved slightly upward so the larger sprite settles more naturally onto the ground.
- index.html cache-bumped to game.js?v=31.

If the character still feels too small, the next test size should be 72x108.
If the character bumps into platforms too easily, reduce PLAYER_BODY_H or increase PLAYER_BODY_OFFSET_Y slightly.
