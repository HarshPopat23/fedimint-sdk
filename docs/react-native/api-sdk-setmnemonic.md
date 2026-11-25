---
title: 'setMnemonic()'
description: 'Initializes seedless storage with the chosen mnemonic.'
---

# SdkLike.setMnemonic

<!-- signature: SdkLike['setMnemonic'] -->

```ts
setMnemonic(mnemonic: MnemonicLike): Promise<void>
```

Saves the chosen mnemonic on the open session. Use `Mnemonic.generate()` for Create or `Mnemonic.fromWords(words)` for Restore. Setup is explicit; opening empty storage does not generate a seed.

**Parameters.** `mnemonic: MnemonicLike`, the generated or restored seed.

**Returns.** `Promise<void>`. Once it resolves, `hasMnemonic()` is true. Repeating the same seed succeeds without rewriting it.

**Throws.** [`SeedMismatch`](./errors.md#code-seedmismatch) for a different existing seed, [`StorageOrphaned`](./errors.md#code-storageorphaned) for state without a usable seed, [`Storage`](./errors.md#code-storage) for backend failures, or [`FederationClosed`](./errors.md#code-federationclosed) after shutdown. Existing state is never overwritten to repair a mismatch or orphaned store.

**Example**
{#example}

```ts [example.ts]
import { Mnemonic, type SdkLike } from '@fedimint/react-native'

declare const sdk: SdkLike

if (!sdk.hasMnemonic()) {
  // After the user chooses Create. For Restore use Mnemonic.fromWords(words).
  await sdk.setMnemonic(Mnemonic.generate())
  // Show sdk.exportMnemonic().words() privately and confirm the backup before joining.
}
```

**Used in.** [Seed words, setup](./seed-words.md#setup), [Share the session](./session.md#step-01)
