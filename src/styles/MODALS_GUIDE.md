# Unified Modal System - Complete Design Consistency

## Overview

All modals across the application now use a **single, consistent design system** with:
- ✅ **Centered positioning** on all screen sizes
- ✅ **Mobile-first responsive** design
- ✅ **Uniform styling** (colors, borders, shadows, spacing)
- ✅ **Appropriately sized text** (never too large)
- ✅ **Accessibility** compliance (keyboard nav, focus management)

---

## Core Features

### 1. Positioning: Always Centered

All modals are **centered on screen** regardless of viewport size.

```jsx
<Modal show={isOpen} onHide={handleClose} centered>
  {/* content */}
</Modal>
```

**Key**: Use the `centered` attribute on all modals.

---

### 2. Mobile-First Responsive

Automatically scales across all breakpoints:

| Breakpoint | Screen Size | Modal Width | Padding | Title Size | Body Text |
|-----------|-----------|------------|---------|-----------|-----------|
| **Mobile** | 0-640px | 100% - 32px | 16px | 16px | 13px |
| **Tablet** | 641-1024px | 100% - 64px | 20px | 17px | 13.5px |
| **Desktop** | 1025px+ | 600px | 24px | 18px | 14px |

**No component tweaking needed** - CSS handles all responsive scaling.

---

### 3. Uniform Styling

All modals share the same:

✅ **Borders**: 1px solid #e9ecef (light gray)  
✅ **Border radius**: 12px (mobile), 16px (tablet+)  
✅ **Shadows**: 0 10px 40px (mobile) → 0 20px 60px (desktop)  
✅ **Background**: White (#ffffff)  
✅ **Header border-bottom**: 1px solid #e9ecef  
✅ **Footer background**: Light gray (#f8f9fa)  
✅ **Typography**: Consistent scaling per breakpoint

---

### 4. Text Sizing

All text is appropriately sized:

- **Modal Title**: 16px (mobile) → 18px (desktop)
- **Body Text**: 13px (mobile) → 14px (desktop)
- **Form Labels**: 12px (mobile) → 13px (desktop)
- **Form Inputs**: 12px (mobile) → 13px (desktop)

**Result**: Never too large, always readable, scales smoothly.

---

## Usage

### Basic Modal

```jsx
import { Modal, Button } from 'react-bootstrap';

export default function MyComponent() {
  const [show, setShow] = useState(false);

  return (
    <>
      <Button onClick={() => setShow(true)}>Open Modal</Button>

      <Modal show={show} onHide={() => setShow(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Modal Title</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Modal content goes here
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShow(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave}>
            Save
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
```

### Modal with Form

```jsx
<Modal show={show} onHide={() => setShow(false)} centered backdrop="static">
  <Modal.Header closeButton={!loading}>
    <Modal.Title>Edit Item</Modal.Title>
  </Modal.Header>
  <Modal.Body>
    <Form.Group className="mb-3">
      <Form.Label>Name</Form.Label>
      <Form.Control
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={loading}
      />
    </Form.Group>
  </Modal.Body>
  <Modal.Footer>
    <Button variant="secondary" onClick={() => setShow(false)} disabled={loading}>
      Cancel
    </Button>
    <Button variant="primary" onClick={handleSave} disabled={loading}>
      {loading ? 'Saving...' : 'Save'}
    </Button>
  </Modal.Footer>
</Modal>
```

### Modal Sizes

```jsx
{/* Default (600px on desktop) */}
<Modal show={show} onHide={handleClose} centered>

{/* Large (700px on desktop) */}
<Modal show={show} onHide={handleClose} size="lg" centered>

{/* Small (500px on desktop) */}
<Modal show={show} onHide={handleClose} size="sm" centered>
```

---

## Attributes Reference

### Essential Attributes

| Attribute | Value | Purpose |
|-----------|-------|---------|
| `centered` | true | **Always use** - centers modal on screen |
| `backdrop` | "static" | Optional - prevents closing by backdrop click |
| `keyboard` | false | Optional - prevents closing with ESC key |
| `size` | "lg", "sm" | Optional - modal width |
| `show` | boolean | Controls modal visibility |
| `onHide` | function | Called when modal closes |

### Examples

```jsx
{/* Confirmation modal - blocks interaction */}
<Modal show={show} onHide={close} centered backdrop="static" keyboard={false}>

{/* Loading modal - no close button visible */}
<Modal show={show} centered backdrop="static">
  <Modal.Header closeButton={!loading}>

{/* Simple modal - allow ESC to close */}
<Modal show={show} onHide={close} centered>
```

---

## CSS Classes

All styling is handled automatically via these CSS classes:

```css
.modal                  /* Container */
.modal-dialog           /* Dialog wrapper (always centered) */
.modal-content          /* Content box */
.modal-header           /* Header section */
.modal-title            /* Title text */
.modal-body             /* Body section */
.modal-footer           /* Footer section */
.btn-close              /* Close button */
```

---

## Animations

Smooth fade-in animation (300ms) with subtle scale:

```
From: opacity: 0, scale: 0.95
To:   opacity: 1, scale: 1
```

Automatically applied to all modals. Disabled for users with `prefers-reduced-motion`.

---

## Accessibility

✅ **Keyboard Navigation**
- `TAB` - Move between elements
- `ESC` - Close (if keyboard enabled)
- `ENTER` - Confirm action

✅ **Screen Reader Support**
- `role="dialog"` on modal
- `aria-label` and `aria-modal="true"` attributes
- Semantic HTML structure

✅ **Focus Management**
- Focus trap (stays within modal while open)
- Focus restored to trigger element on close

✅ **Color Contrast**
- WCAG AA compliant (4.5:1 minimum)

✅ **High Contrast Mode**
- Thicker borders (2px instead of 1px)

✅ **Reduced Motion**
- Animations disabled for users with `prefers-reduced-motion: reduce`

---

## Mobile-First Buttons

Buttons in modal footers automatically adapt:

**Mobile (≤640px)**:
- Full width
- Stacked vertically (flex-direction: column-reverse)
- Taller for touch (38px min-height)
- Smaller font (12px)

**Tablet/Desktop**:
- Inline layout (flex-direction: row)
- Normal sizing
- 36px min-height

---

## Dark Mode Support

Modals automatically detect dark mode preference:

```css
@media (prefers-color-scheme: dark) {
  /* Automatically applies dark colors */
}
```

Results in:
- Dark background instead of white
- Light text instead of dark
- Adjusted shadows for visibility

---

## Common Patterns

### Confirmation Modal

```jsx
<Modal show={show} onHide={close} centered backdrop="static">
  <Modal.Header closeButton={!loading}>
    <Modal.Title>Confirm Delete?</Modal.Title>
  </Modal.Header>
  <Modal.Body>
    This action cannot be undone.
  </Modal.Body>
  <Modal.Footer>
    <Button variant="secondary" onClick={close} disabled={loading}>
      Cancel
    </Button>
    <Button variant="danger" onClick={handleDelete} disabled={loading}>
      {loading ? 'Deleting...' : 'Delete'}
    </Button>
  </Modal.Footer>
</Modal>
```

### Form Modal

```jsx
<Modal show={show} onHide={close} size="lg" centered backdrop="static">
  <Modal.Header closeButton={!loading}>
    <Modal.Title>Edit Profile</Modal.Title>
  </Modal.Header>
  <Modal.Body>
    <Form.Group className="mb-3">
      <Form.Label>Email</Form.Label>
      <Form.Control type="email" value={email} onChange={...} />
    </Form.Group>
    <Form.Group className="mb-3">
      <Form.Label>Name</Form.Label>
      <Form.Control type="text" value={name} onChange={...} />
    </Form.Group>
  </Modal.Body>
  <Modal.Footer>
    <Button variant="secondary" onClick={close}>Cancel</Button>
    <Button variant="primary" onClick={save}>Save</Button>
  </Modal.Footer>
</Modal>
```

### Success Modal

```jsx
<Modal show={show} onHide={close} centered>
  <Modal.Header closeButton>
    <Modal.Title>Success!</Modal.Title>
  </Modal.Header>
  <Modal.Body>
    Your changes have been saved successfully.
  </Modal.Body>
  <Modal.Footer>
    <Button variant="primary" onClick={close}>OK</Button>
  </Modal.Footer>
</Modal>
```

---

## Updated Pages

All modals in these pages have been updated to use `centered`:

1. ✅ `src/pages/ServicesPage.jsx`
2. ✅ `src/pages/JoursFeriesPage.jsx`
3. ✅ `src/pages/PolitiqueCongesPage.jsx`
4. ✅ `src/pages/SuperAdmin/UsersPage.jsx`
5. ✅ `src/pages/SuperAdmin/ServicesPage.jsx`
6. ✅ `src/pages/JoursBloquesPage.jsx`
7. ✅ `src/pages/SuperAdmin/AuditLogsPage.jsx`
8. ✅ `src/pages/Conges/CongeDetailsPage.jsx`
9. ✅ `src/pages/SuperAdmin/CompaniesPage.jsx`
10. ✅ `src/pages/Conges/CongesPage.jsx` (validation/rejection modals)

---

## Files Created/Modified

### Created
- `src/styles/modals.css` - Unified modal styling (mobile-first responsive)

### Modified
- `src/main.jsx` - Import modals.css

### Updated Pages (added `centered` attribute)
- 9 pages with modals

---

## Troubleshooting

### Modal not centered?
- Ensure `centered` attribute is present on `<Modal>` component
- Check browser console for CSS errors
- Verify `modals.css` is imported in main.jsx

### Text too large on mobile?
- This is handled automatically by responsive CSS
- No component changes needed
- Check if custom CSS is overriding default sizes

### Footer buttons overflow?
- Automatically stacks on mobile
- Check if custom padding is applied
- Verify `modal-footer` class is present

### Modal still using old styling?
- Clear browser cache (Ctrl+Shift+Delete)
- Rebuild frontend (`npm run build`)
- Hard refresh page (Ctrl+Shift+R)

---

## Best Practices

✅ **DO:**
- Use `centered` on all modals
- Use `backdrop="static"` for forms/critical actions
- Set `keyboard={false}` during async operations
- Disable buttons while loading
- Use appropriate `size` attribute (lg, sm, or default)

❌ **DON'T:**
- Position modals manually (CSS does this)
- Use inline styles for positioning
- Create custom modal wrappers (use Bootstrap Modal)
- Override modal width/padding
- Make text size hardcoded (CSS scales it)

---

## Future Enhancements

- [ ] Modal animations (fade, scale, slide)
- [ ] Nested modals support
- [ ] Modal state management service
- [ ] Preset modal templates (confirm, alert, form)
- [ ] Modal size presets (xs, sm, md, lg, xl)
