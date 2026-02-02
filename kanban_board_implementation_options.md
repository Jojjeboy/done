# Kanban Board View - Implementation Options & Discussion

## Overview

Your application already has a perfect foundation for a Kanban board:

- **3-step process**: `pending` → `in-progress` → `completed`
- **Tasks (TodoItem)** with status field
- **Subtasks** that also have status
- **Projects** for grouping

## 🎯 Implementation Approaches

### **Option 1: Separate Kanban View Route** ⭐ **RECOMMENDED**

Create a dedicated `/board` view alongside your existing list view.

#### Pros

- ✅ Clean separation of concerns - list view stays intact
- ✅ Users can choose their preferred view (list vs board)
- ✅ Easy to implement - new component without touching existing code
- ✅ Can have view-specific features (e.g., drag-and-drop between columns)
- ✅ Better performance - only renders when needed

#### Cons

- ⚠️ Requires navigation between views
- ⚠️ Two different UIs to maintain

#### Implementation Details

```
Routes:
  /home → Current list view (TaskListView.vue)
  /board → New Kanban board view (BoardView.vue)
  /board/:projectId → Board filtered by project
```

**Desktop Layout**: 3 horizontal columns (To Do | In Progress | Done)
**Mobile Layout**: Vertically stacked sections with collapsible headers

---

### **Option 2: Toggle View in Current Route**

Add a view switcher button in the header to toggle between list and board views.

#### Pros

- ✅ Quick switching between views
- ✅ Stays on same route with same filters/project
- ✅ Feels more integrated

#### Cons

- ⚠️ More complex component logic
- ⚠️ Both views loaded in memory even when not shown
- ⚠️ Header becomes more crowded

#### Implementation Details

- Add view mode toggle in `TaskListView.vue` header
- Conditional rendering: `v-if="viewMode === 'list'"` vs `v-if="viewMode === 'board'"`
- Store view preference in settings

---

### **Option 3: Sidebar Quick View (Desktop Only)**

Add a collapsible board sidebar that shows alongside the main view.

#### Pros

- ✅ Glanceable overview while working in list view
- ✅ Doesn't disrupt existing workflow
- ✅ Great for quick status checks

#### Cons

- ⚠️ Desktop-only feature
- ⚠️ Limited screen real estate
- ⚠️ Not a full replacement for board view

---

## 🎨 Layout Considerations

### Desktop Layout (≥769px)

```
┌─────────┬──────────────┬──────────────┬──────────────┐
│ Sidebar │   TO DO      │ IN PROGRESS  │     DONE     │
│         │   [Tasks]    │   [Tasks]    │   [Tasks]    │
│         │              │              │              │
│         │              │              │              │
│         │              │              │              │
└─────────┴──────────────┴──────────────┴──────────────┘
```

### Mobile Layout (<769px)

```
┌──────────────────────────┐
│      TO DO (3) ▼         │
├──────────────────────────┤
│ [Task 1]                 │
│ [Task 2]                 │
│ [Task 3]                 │
├──────────────────────────┤
│   IN PROGRESS (1) ▼      │
├──────────────────────────┤
│ [Task 4]                 │
├──────────────────────────┤
│      DONE (5) ▼          │
├──────────────────────────┤
│ [Task 5]                 │
│ [Task 6]                 │
│ ...                      │
└──────────────────────────┘
```

---

## 🚀 Project Management Features to Consider

### 1. **Visual Enhancements**

- **Task Cards**: More visual than current list items
  - Color-coded by priority
  - Project/category badges
  - Progress indicators (% of subtasks completed)
  - Due date badges with urgency colors
  - Assignee avatars (if you add collaboration later)

### 2. **Drag & Drop**

- Move tasks between columns (changes status)
- Reorder tasks within a column
- Move between projects (if multiple boards)
- Library suggestion: `@vueuse/gesture` or `vue-draggable-plus`

### 3. **Board Filters & Views**

- **Filter by Project**: Show only one project's tasks
- **Filter by Priority**: Show only high-priority tasks
- **Show/Hide Completed**: Toggle done column
- **WIP Limits**: Set max tasks allowed in "In Progress"
  - Visual warning when limit exceeded
  - Encourages finishing before starting new tasks

### 4. **Quick Actions on Cards**

- Quick edit title/description (inline editing)
- Quick change priority (dropdown or stars)
- Quick add subtask
- Quick move to next/previous status
- Archive/delete

### 5. **Board Header Statistics**

```
┌───────────────────────────────────────────────┐
│  Project: Renovate Kitchen          [⚙️ ...]  │
│  📊 12 tasks • 3 in progress • 40% complete   │
└───────────────────────────────────────────────┘
```

### 6. **Subtask Handling**

Options for how to display subtasks:

- **A) Parent task only**: Show just the main task with progress indicator
- **B) Collapsed by default**: Click to expand and see subtasks
- **C) Subtasks as separate cards**: Each subtask gets its own card
- **D) Hybrid**: Main task card + subtask checklist inside

### 7. **Column Customization** (Future Enhancement)

Allow users to customize columns:

- Custom status names
- Custom colors
- Hide/show columns
- Rearrange column order

---

## 🔧 Technical Implementation Notes

### State Management

- Use existing `todo.ts` store
- Add computed properties:
  - `tasksByStatus` - groups tasks by status
  - `tasksByProjectAndStatus` - for project-specific boards

### Responsive Approach

```typescript
// Detect breakpoint
const isMobile = ref(window.innerWidth < 769)

// Mobile: Vertical accordion
// Desktop: Horizontal columns with CSS Grid
```

### Drag & Drop

```typescript
// Simple status change on drop
function onDrop(taskId: string, newStatus: TodoItem['status']) {
  todoStore.updateTodoItem(taskId, {
    status: newStatus,
    updatedAt: Date.now(),
  })
}
```

### Animations

- Use `<TransitionGroup>` for smooth task movements
- Card hover effects
- Column highlight on drag-over

---

## 📊 Comparison Matrix

| Feature                       | Option 1: Separate Route | Option 2: Toggle View | Option 3: Sidebar |
| ----------------------------- | ------------------------ | --------------------- | ----------------- |
| **Implementation Complexity** | Medium                   | Medium-High           | Low-Medium        |
| **User Experience**           | Excellent                | Excellent             | Good              |
| **Mobile Support**            | Full                     | Full                  | None              |
| **Maintains List View**       | Yes                      | Yes                   | Yes               |
| **Performance**               | Best                     | Good                  | Good              |
| **Future Extensibility**      | Excellent                | Good                  | Limited           |

---

## 🎯 My Recommendation: **Option 1** (Separate Route)

### Why?

1. **Clean Architecture**: Keeps code organized and maintainable
2. **Future-Proof**: Easy to add board-specific features later
3. **User Choice**: Power users can pick their preferred view
4. **Performance**: Only loads what's needed
5. **Mobile-Friendly**: Full mobile experience with vertical columns

### Suggested Implementation Plan

1. Create `BoardView.vue` component
2. Add route `/board` and `/board/:projectId`
3. Create `KanbanColumn.vue` component (reusable for 3 columns)
4. Create `TaskCard.vue` component (more visual than current list item)
5. Add view switcher in header (icon to toggle between list/board)
6. Implement drag-and-drop between columns
7. Add WIP limit warnings (optional)
8. Persist view preference in settings

---

## ❓ Questions for You

Before I create the detailed implementation plan, please let me know:

1. **View Preference**: Do you agree with Option 1 (separate route), or would you prefer Option 2 (toggle in current view)?

2. **Drag & Drop**: Is drag-and-drop a must-have for v1, or can we add it later?

3. **Subtask Display**: How should subtasks appear in board view?
   - A) Just show parent task with progress indicator (cleanest)
   - B) Show parent with expandable subtask list
   - C) Each subtask as separate card
   - D) Don't show subtasks in board view

4. **Project Filtering**: Should the board:
   - A) Show all tasks across all projects (with project badges on cards)
   - B) Show one project at a time (select from dropdown)
   - C) Both - with toggle option

5. **WIP Limits**: Should we add "Work In Progress" limits to the board?
   - E.g., "Max 3 tasks in In Progress column"
   - Visual warning when exceeded

6. **Completed Tasks**: How should the "Done" column work?
   - A) Show all completed tasks (could get very long)
   - B) Show only recent completions (last 7 days)
   - C) Collapsible/scrollable with "Show more" button
   - D) Hide by default with toggle to show

7. **Additional Features**: Which of these would add most value for you?
   - Progress % on task cards
   - Time estimates / tracking
   - Task labels/tags (beyond current categories)
   - Quick filters (by priority, deadline, etc.)
   - Swimlanes (horizontal grouping by project/priority)

---

## 🎨 Visual Mockup Ideas

Would you like me to generate some UI mockups showing:

- Desktop 3-column board layout
- Mobile vertical/stacked layout
- Task card design with different information density options

Let me know your thoughts and preferences, and I'll create a detailed implementation plan!
