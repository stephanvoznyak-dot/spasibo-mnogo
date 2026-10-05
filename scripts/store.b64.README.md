# store.b64.*

Payload for `src/ui/store.ts` lives in commit `36dc83de`.

`npm run restore:store` / postinstall always downloads those three parts via curl
and expands them. Local `store.b64.0/1/2` on this branch may be truncated — ignore them.

```bash
npm run restore:store
# → OK store.ts … DUAL_WRITE_LEGACY=false
```
