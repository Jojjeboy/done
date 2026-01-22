# Done

**Done** is an exclusive Progressive Web App (PWA) for personal productivity. Built with Vue 3, TypeScript, and Firebase, it provides a calm, distraction-free environment for managing your tasks and achieving peace of mind.

## Vision

Done is designed to be a calm oasis in a world full of distractions. It provides uninterrupted productivity with an offline-first architecture, ensuring the app works flawlessly even without an internet connection. The interface uses Soft UI principles to create a tactile, reliable, and instantaneous experience.

## Core Principles

- **Uninterrupted Productivity**: No loading spinners for core functions. Works flawlessly offline.
- **Intentional Design**: Soft UI (Neumorphism-light) creates an interface with physical form.
- **Data Sovereignty**: Your data is yours. Seamless sync, but always local-first.

## Tech Stack

- **Framework**: Vue 3 (Composition API, Script Setup)
- **Language**: TypeScript (Strict mode)
- **Routing**: Vue Router with WebHashHistory (GitHub Pages compatible)
- **Styling**: Tailwind CSS (Mobile-first, Soft UI ready)
- **State Management**: Pinia
- **Authentication**: Firebase Authentication (Google Sign-In only)
- **PWA**: vite-plugin-pwa (Offline support and caching)

## Prerequisites

- Node.js ^20.19.0 or >=22.12.0
- npm or yarn
- A Firebase project with Authentication enabled

## Project Setup

### 1. Install Dependencies

```sh
npm install
```

### 2. Configure Firebase

#### Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select an existing one
3. Enable **Authentication** → **Sign-in method** → **Google** provider
4. Add your domain to authorized domains if deploying

#### Get Firebase Configuration

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Scroll down to **Your apps** section
3. Click the **Web** icon (`</>`) to add a web app
4. Copy your Firebase configuration values

#### Create Environment File

Create a `.env` file in the root directory with your Firebase configuration:

```sh
VITE_FIREBASE_API_KEY=your-api-key-here
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

**Note**: You can use `.env.example` as a template. Copy it to `.env` and fill in your values.

### 3. Development

Start the development server:

```sh
npm run dev
```

The app will be available at `http://localhost:5173/done/`

### 4. Build for Production

```sh
npm run build
```

The production build will be in the `dist/` directory, ready for deployment to GitHub Pages.

### 5. Validate

Run linting, type-checking, tests, and build:

```sh
npm run validate
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run test:unit` - Run unit tests in watch mode
- `npm run test:ci` - Run unit tests once
- `npm run lint` - Lint and fix code
- `npm run type-check` - Type-check TypeScript
- `npm run validate` - Run lint, type-check, tests, and build
- `npm run format` - Format code with Prettier

## Deployment to GitHub Pages

1. Update `vite.config.ts` base path if your repository name differs from `/done/`
2. Build the project: `npm run build`
3. Configure GitHub Pages to serve from the `dist/` directory
4. The app will be available at `https://yourusername.github.io/done/`

## Project Structure

```
src/
├── components/      # Reusable Vue components
│   └── Layout.vue  # Main layout with header
├── router/         # Vue Router configuration
│   └── index.ts    # Routes and auth guards
├── stores/         # Pinia stores
│   └── auth.ts     # Authentication store
├── views/          # Page components
│   ├── HomeView.vue
│   └── LoginView.vue
├── firebase.ts     # Firebase initialization
└── main.ts         # Application entry point
```

## Authentication Flow

- **Landing Page**: Unauthenticated users see the login screen
- **Google Sign-In**: Only Google authentication is supported
- **Auth Guard**: All routes except `/login` are protected
- **User Scoping**: All data is scoped to `auth.currentUser.uid`

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (disable Vetur if installed).

## Recommended Browser Setup

- **Chromium-based browsers** (Chrome, Edge, Brave):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter](http://bit.ly/object-formatters)
- **Firefox**:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## License

Private project - All rights reserved.
