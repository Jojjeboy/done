# Done - Productive Todo App

A modern, offline-first Progressive Web App (PWA) for managing personal tasks, built with Vue 3, TypeScript, and Pinia.

## Features

### ✅ Task Management

- **Create & Edit**: Easily add tasks with titles, descriptions, priorities, and deadlines.
- **Read/Edit Modes**: Distraction-free reading view with a seamless toggle to edit mode.
- **Subtasks**: Break down complex tasks into smaller, manageable subtasks. Track progress with visual indicators (e.g., "1/3").
- **Deadlines**: Set due dates with a built-in datepicker. Simplified display shows "Today", "Tomorrow", or the date.
- **Categories**: Organize tasks into color-coded categories (Work, Personal, Hobby, Lifestyle).
- **Search**: Fast, responsive search to find any task instantly.

### 📱 User Experience

- **PWA Support**: Installable on mobile and desktop. Works fully offline.
- **Dynamic Greetings**: Welcomes you with "Good morning", "Good afternoon", etc., based on your local time.
- **Dark Mode**: Fully supported dark theme for all components.
- **Mobile First**: Horizontal category chips and bottom navigation optimized for mobile use.
- **Internationalization (i18n)**: Full support for English and Swedish.
- **Changelog**: View recent development updates with commit history, timestamps, and direct links to GitHub commits.
- **Version Tracking**: Latest commit information displayed in settings for transparency.

### 🛠 Technical Highlights

- **State Management**: Robust state handling with Pinia.
- **Persistence**: IndexedDB integration via `dexie` for reliable offline storage.
- **Type Safety**: Strictly typed with TypeScript.
- **CI/CD**: Automated linting, type-checking, and testing via GitHub Actions.

## Getting Started

### Prerequisites

- Node.js (v20+)
- npm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Testing & Validation

Run the full validation suite (Lint, Type-Check, Tests, Build):

```bash
npm run validate
```

### Build for Production

```bash
npm run build
```

## Project Structure

- `src/components`: UI components (TaskListView, TodoModal, etc.)
- `src/stores`: Pinia stores for state (todo, auth, theme, i18n)
- `src/views`: Main application views
- `src/i18n`: Localization files (en, sv)
- `src/db`: IndexedDB configuration

## License

MIT
