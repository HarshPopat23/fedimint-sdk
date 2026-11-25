---
title: 'hasMnemonic()'
description: 'Checks whether the session has a seed.'
---

# SdkLike.hasMnemonic

<!-- signature: SdkLike['hasMnemonic'] -->

```ts
hasMnemonic(): boolean
```

Returns whether this session has a stored seed. Synchronous and safe to call before setup. A directory on disk does not imply a seed exists.

**Returns.** `boolean`.

**Throws.** No SDK error while the handle is live. Calls on a destroyed handle fail.

**Example**
{#example}

```ts [example.ts]
import type { SdkLike } from '@fedimint/react-native'

declare const sdk: SdkLike

if (!sdk.hasMnemonic()) {
  // Show Create or Restore; do not join or render a backup screen yet.
}
```

**Used in.** [Seed words, step 02](./seed-words.md#step-02), [Share the session](./session.md#step-01)
