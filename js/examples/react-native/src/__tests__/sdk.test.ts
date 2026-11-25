import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  let seed: string[] | undefined
  const words = ['chosen', 'words']
  const sdk = {
    hasMnemonic: vi.fn(() => seed !== undefined),
    setMnemonic: vi.fn(async (mnemonic: { words: () => string[] }) => {
      const next = mnemonic.words()
      if (seed && seed.join(' ') !== next.join(' '))
        throw new Error('SeedMismatch')
      seed = next
    }),
    exportMnemonic: vi.fn(() => ({ words: () => seed })),
    federations: () => [],
  }
  const Mnemonic = {
    fromWords: vi.fn((words: string[]) => ({ words: () => words })),
    generate: vi.fn(() => ({ words: () => ['unexpected', 'generation'] })),
  }
  const close = vi.fn(async () => undefined)
  const opened = { sdk, Mnemonic, close }
  return {
    words,
    sdk,
    Mnemonic,
    close,
    openSdk: vi.fn(async () => opened),
    seed: (value: string[] | undefined) => {
      seed = value
    },
  }
})

vi.mock('@fedimint/react-native', () => ({
  openSdk: mocks.openSdk,
  Mnemonic: mocks.Mnemonic,
  ErrorCode: {},
  Exception: {},
}))
vi.mock('react-native-fs', () => ({
  default: {
    DocumentDirectoryPath: '/documents',
    exists: async () => true, // A leftover directory is the regression case.
    unlink: async () => undefined,
  },
}))
vi.mock('expo-file-system', () => ({
  Paths: { document: '/documents' },
  Directory: class {
    uri = 'file:///documents/fedimint'
    exists = true
    delete() {}
  },
}))

for (const [name, load] of [
  ['React Native', () => import('../sdk')],
  ['Expo', () => import('../../../expo-app/src/sdk')],
] as const) {
  describe(`${name} wallet onboarding`, () => {
    beforeEach(() => {
      vi.resetModules()
      vi.clearAllMocks()
      mocks.seed(undefined)
    })

    it('keeps a leftover seedless directory on onboarding without generating words', async () => {
      const app = await load()
      expect(await app.walletExists()).toBe(false)
      expect(app.current()).toBeUndefined()
      expect(mocks.sdk.setMnemonic).not.toHaveBeenCalled()
      expect(mocks.Mnemonic.generate).not.toHaveBeenCalled()
    })

    it('refuses implicit creation when opening a seedless session', async () => {
      const app = await load()
      await expect(app.open()).rejects.toThrow('Choose Create or Restore')
      expect(await app.walletExists()).toBe(false)
      expect(mocks.sdk.setMnemonic).not.toHaveBeenCalled()
    })

    it('reuses the checked session and saves the words already shown during Create', async () => {
      const app = await load()
      await Promise.all([app.walletExists(), app.walletExists()])
      const [first, second] = await Promise.all([
        app.open(mocks.words),
        app.open(mocks.words),
      ])
      expect(first).toBe(second)
      expect(mocks.openSdk).toHaveBeenCalledTimes(1)
      expect(mocks.sdk.setMnemonic).toHaveBeenCalledTimes(1)
      expect(first.sdk.exportMnemonic().words()).toEqual(mocks.words)
      expect(await app.walletExists()).toBe(true)
      expect(mocks.Mnemonic.generate).not.toHaveBeenCalled()
    })

    it('restores a seedless session with the submitted words', async () => {
      const app = await load()
      expect(await app.walletExists()).toBe(false)
      const restored = await app.open(['restored', 'words'])
      expect(restored.sdk.exportMnemonic().words()).toEqual([
        'restored',
        'words',
      ])
      expect(mocks.Mnemonic.generate).not.toHaveBeenCalled()
    })

    it('reopens a seeded wallet without changing its words', async () => {
      mocks.seed(mocks.words)
      const app = await load()
      expect(await app.walletExists()).toBe(true)
      await app.open()
      expect(mocks.sdk.setMnemonic).not.toHaveBeenCalled()
      expect(mocks.Mnemonic.generate).not.toHaveBeenCalled()
    })

    it('keeps setup retryable after saving fails', async () => {
      const app = await load()
      mocks.sdk.setMnemonic.mockRejectedValueOnce(new Error('Storage'))
      await expect(app.open(mocks.words)).rejects.toThrow('Storage')
      expect(app.current()).toBeUndefined()
      expect(await app.walletExists()).toBe(false)
      await app.open(mocks.words)
      expect(await app.walletExists()).toBe(true)
    })

    it('refuses restoring over a different stored seed', async () => {
      mocks.seed(mocks.words)
      const app = await load()
      await expect(app.open(['different', 'words'])).rejects.toThrow(
        'SeedMismatch',
      )
      expect(mocks.sdk.exportMnemonic().words()).toEqual(mocks.words)
    })

    it('closes even a seedless checked session before resetting', async () => {
      const app = await load()
      await app.walletExists()
      await app.reset()
      expect(mocks.close).toHaveBeenCalledTimes(1)
      await app.walletExists()
      expect(mocks.openSdk).toHaveBeenCalledTimes(2)
    })
  })
}
