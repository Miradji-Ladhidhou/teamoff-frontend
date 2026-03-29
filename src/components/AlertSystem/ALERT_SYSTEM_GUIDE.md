# Alert System Guide - Unified Design System

## Overview

This unified Alert System ensures all overlays and floating notifications follow a **single, consistent visual design** across the entire application.

### Core Principles

✅ **One Position**: Bottom-center (fixed at bottom, horizontally centered)  
✅ **One Animation**: Slide from bottom + fade  
✅ **One Stack**: Vertical with consistent spacing  
✅ **One Style**: Unified colors, shadows, borders, typography  
✅ **Mobile First**: Responsive scaling (16px→24px bottom margin)  
✅ **Accessible**: No blocking, auto-dismiss, pause on hover, focus management

---

## Components

### 1. ToastContainer + Toast

**Location**: `src/components/AlertSystem/ToastContainer.jsx`

Displays auto-dismissing notifications at the bottom-center.

**Usage** (from any component):

```jsx
import { alertService } from '../../services/alertService';

// Add success toast
alertService.success('Operation completed!');

// Add error toast
alertService.error('Something went wrong');

// Add info toast
alertService.info('Note: This feature is new');

// Add with custom duration (0 = no auto-dismiss)
alertService.addToast('Custom message', 'success', 6000);
```

**Features**:
- Auto-dismiss after 4 seconds (configurable)
- Pause on hover (timer pauses, resumes on mouse leave)
- Manual close button
- Deduplication (same message+type won't show twice)
- Max 5 toasts at once (older ones are removed)

**Styled for**:
- `success` - Green (#28a745)
- `error` - Red (#dc3545)
- `info` - Blue (#0d6efd)
- `warning` - Yellow (#ffc107)

---

### 2. ConfirmationModal

**Location**: `src/components/AlertSystem/ConfirmationModal.jsx`

Blocking modal for critical confirmations (delete, deactivate, etc.).

**Usage** (from any component):

```jsx
import { useAlert } from '../../hooks/useAlert';

const MyComponent = () => {
  const { openConfirmation } = useAlert();

  const handleDelete = () => {
    openConfirmation({
      title: 'Delete Item?',
      description: 'This action cannot be undone.',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      danger: true, // Red button
      onConfirm: () => {
        // Do the deletion
      },
      onCancel: () => {
        // Optional: handle cancellation
      },
    });
  };

  return <button onClick={handleDelete}>Delete</button>;
};
```

**Features**:
- Blocking (disables main UI)
- Centered on screen
- Focus trap (auto-focus cancel button)
- ESC to cancel, ENTER to confirm
- Danger mode (red button)

---

## Styling

**CSS File**: `src/components/AlertSystem/AlertSystem.css`

All styles are centralized. **Do not create custom alert styles**.

### Key CSS Classes

```css
.toast-container        /* Container for toasts (bottom-center) */
.toast-item             /* Individual toast */
.toast-success          /* Success variant */
.toast-error            /* Error variant */
.toast-info             /* Info variant */
.toast-warning          /* Warning variant */
.modal-overlay          /* Dimming backdrop */
.confirmation-modal     /* Modal box */
```

### Customization (Not Recommended)

If you absolutely must customize, use:
- Duration: `alertService.addToast(msg, type, durationMs)`
- Danger style: `openConfirmation({ danger: true })`

---

## Migration Guide

### From React-Toastify (OLD)

```jsx
// ❌ OLD
import { toast } from 'react-toastify';
toast.success('Done!');

// ✅ NEW
import { alertService } from '../../services/alertService';
alertService.success('Done!');
```

### From React Bootstrap Alert (OLD)

```jsx
// ❌ OLD
import { Alert } from 'react-bootstrap';
<Alert variant="success">Message</Alert>

// ✅ NEW
import { alertService } from '../../services/alertService';
alertService.success('Message');
```

### From Custom Modal (OLD)

```jsx
// ❌ OLD
<ConfirmModal open={isOpen} onConfirm={...} />

// ✅ NEW
const { openConfirmation } = useAlert();
openConfirmation({ ... });
```

---

## Position Reference

### Desktop (1025px+)
- Bottom: **24px**
- Width: **max 500px**
- Left: **50% (centered)**

### Tablet (641px - 1024px)
- Bottom: **20px**
- Width: **calc(100% - 32px)**
- Left: **50% (centered)**

### Mobile (max 640px)
- Bottom: **16px + safe-area-inset-bottom**
- Width: **calc(100% - 16px)**
- Left: **50% (centered)**

---

## Animations

### Toast Entry
```
Slide up: 0px → 20px (from bottom)
Fade: 0% → 100% opacity
Duration: 300ms (ease-out)
```

### Toast Exit
```
Slide down: 0px → 20px (to bottom)
Fade: 100% → 0% opacity
Duration: 300ms (ease-in)
```

---

## Accessibility

✅ ARIA labels and roles  
✅ Focus management (modal focus trap)  
✅ Keyboard navigation (ESC, ENTER)  
✅ Screen reader support (aria-live)  
✅ No content blocking  
✅ Sufficient color contrast

---

## Files Changed

- `src/components/AlertSystem/AlertSystem.css` - Unified styling (BOTTOM-CENTER)
- `src/components/AlertSystem/ToastContainer.jsx` - Toast display
- `src/components/AlertSystem/ConfirmationModal.jsx` - Confirmation modal
- `src/components/NotificationSystem.jsx` - WebSocket → AlertSystem bridge
- `src/components/NotificationModal/FloatingNotification.jsx` - Old context → AlertSystem bridge
- `src/index.css` - Removed legacy styles (marked deprecated)
- `src/App.jsx` - Already integrated (no changes needed)

---

## Troubleshooting

### Toasts not appearing?
1. Check: Is `alertService.addToast()` being called?
2. Check: Is `ToastContainer` in App.jsx? (Yes, it is)
3. Check: Is `AlertProvider` wrapping the app? (Yes, it is)

### Modal not blocking clicks?
1. Check: Is `openConfirmation()` being called (not `alertService`)?
2. Check: Is `ConfirmationModal` in App.jsx? (Yes, it is)

### Wrong position?
1. Desktop/mobile CSS is auto-applied
2. Safe-area-inset is respected for notches/home indicators
3. Check responsive breakpoints (640px, 1024px)

---

## Future Enhancements

- [ ] Toast action buttons (undo, retry)
- [ ] Toast progress indicator
- [ ] Sound notifications (with preference)
- [ ] Notification center (persistent history)
- [ ] Custom theme colors per toast

---

## Questions?

Check `alertService.js` for full API or `AlertContext.jsx` for context integration.
