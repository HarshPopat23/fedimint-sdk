import RNFS from 'react-native-fs'
import {
  ErrorCode,
  Exception,
  Mnemonic,
  openSdk,
  type Amount,
  type FederationLike,
  type SdkSession,
} from '@fedimint/react-native'

export const dataDir = `${RNFS.DocumentDirectoryPath}/fedimint`

let session: SdkSession | undefined
let opening: Promise<SdkSession> | undefined

// Screens that render session-derived state (whether a wallet exists, whether a federation
// is joined) subscribe here through `onChange` and re-check that state whenever the module
// singleton is replaced, instead of relying on being told directly by whichever screen
// triggered the change.
const listeners = new Set<() => void>()

/** Subscribes to session changes (open or reset); call the returned function to unsubscribe. */
export function onChange(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function notify(): void {
  for (const listener of listeners) listener()
}

// Checking storage must not initialize a wallet. Share this open with setup so
// concurrent screens never contend for the same storage location.
let loading: Promise<SdkSession> | undefined

function load(): Promise<SdkSession> {
  loading ??= openSdk({ dataDir }).catch((error: unknown) => {
    loading = undefined
    throw error
  })
  return loading
}

/** The shared session, with or without a seed, for discovery, preview and invite parsing. */
export const browse = (): Promise<SdkSession> => load()

/** A directory alone is not a wallet: interrupted setup can leave it seedless. */
export async function walletExists(): Promise<boolean> {
  return (await load()).sdk.hasMnemonic()
}

/** Opens an existing wallet, or initializes it with words chosen during onboarding. */
export function open(mnemonic?: string[]): Promise<SdkSession> {
  if (!opening) {
    opening = load()
      .then(async (opened) => {
        if (mnemonic) {
          await opened.sdk.setMnemonic(opened.Mnemonic.fromWords(mnemonic))
        }
        if (!opened.sdk.hasMnemonic()) {
          throw new Error('Choose Create or Restore to set up this wallet first.')
        }
        session = opened
        notify()
        return opened
      })
      .catch((error: unknown) => {
        opening = undefined
        throw error
      })
  }
  return opening
}

/** Closes the session and deletes the wallet's data, so a restore can seed the directory anew. */
export async function reset(): Promise<void> {
  // The session is dropped first, so a failing close still leaves the module without one, the
  // data still gets deleted and listeners still hear about it; the error surfaces afterwards.
  const closing = loading
  session = undefined
  opening = undefined
  loading = undefined
  try {
    if (closing) await (await closing).close()
  } finally {
    if (await RNFS.exists(dataDir)) await RNFS.unlink(dataDir)
    notify()
  }
}

export const current = (): SdkSession | undefined => session

/** The one federation these demos work with, once joined. */
export const federation = (): FederationLike | undefined => session?.sdk.federations()[0]

export const generateWords = (): string[] => Mnemonic.generate().words()

export const msatToSat = (amount: Amount): number => Number(amount / 1000n)

export function satToMsat(sats: string | number): Amount {
  const n = typeof sats === 'number' ? sats : Number(sats)
  if (!Number.isInteger(n) || n < 0) throw new Error('amount must be a whole number of sats')
  return BigInt(n) * 1000n
}

export function errorMessage(error: unknown): string {
  if (Exception.hasInner(error)) {
    const inner = Exception.getInner(error)
    return `${ErrorCode[inner.code()]}: ${inner.reason()}`
  }
  return error instanceof Error ? error.message : String(error)
}
