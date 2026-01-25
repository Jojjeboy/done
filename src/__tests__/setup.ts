import { vi } from 'vitest'

// Mock Firebase
vi.mock('@/firebase', () => ({
  auth: {
    currentUser: null,
    onAuthStateChanged: vi.fn(),
    signOut: vi.fn(),
  },
}))

// Also mock the firebase/app and firebase/auth modules if needed,
// but mocking the wrapper @/firebase is usually enough if that's what's imported.
// However, since firebase.ts executes side-effects (initializeApp), we must ensure
// that side-effect doesn't run or is harmless.
// By mocking '@/firebase', imports to it return the mock and don't execute the real file.
