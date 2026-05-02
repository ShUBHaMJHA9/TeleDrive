# TeleDrive Premium Design System

## Overview

TeleDrive uses a modern, premium design language inspired by **Stripe**, **Apple**, and **Notion**. This guide ensures consistency and beauty across all UI components.

---

## Core Design Principles

### 1. **Glassmorphism (Subtle)**
- Use frosted glass effect sparingly
- Backdrop blur: 8px
- Opacity: 5-8% for backgrounds
- Border: 1px solid with 8% white opacity

### 2. **Soft Shadows**
- Multiple shadow layers for depth
- Shadow blur: 4-32px
- Color: rgba(0, 0, 0, 0.1-0.2)
- Never harsh or sharp

### 3. **Smooth Animations**
- Duration: 150ms (fast), 250ms (base), 350ms (slow)
- Easing: cubic-bezier(0.4, 0, 0.2, 1)
- Micro-interactions on hover, focus, click

### 4. **Typography Hierarchy**
- Bold headlines (700 weight)
- Clear visual hierarchy
- Letter-spacing: -0.01em to -0.02em for headers
- Line-height: 1.2 for headers, 1.6 for body

### 5. **Color & Contrast**
- Dark mode as primary (slate-950 background)
- Telegram blue accent (#0084FF)
- Cyan highlight (#00D9FF)
- Gradient accents for emphasis
- Text contrast: AA+ (WCAG)

---

## Color Palette

```css
Primary: #0084FF (Telegram Blue)
Primary Dark: #0073E6
Primary Light: #E3F2FD

Accent: #00D9FF (Cyan)
Accent Gradient: linear-gradient(135deg, #0084FF, #00D9FF)

Backgrounds:
- Primary: #0F1419 (Dark)
- Secondary: #1A1F2E
- Tertiary: #25293D
- Hover: #2D3245

Text:
- Primary: #FFFFFF
- Secondary: #B0B8C1
- Tertiary: #8A91A1

Borders:
- Primary: rgba(255, 255, 255, 0.08)
- Secondary: rgba(255, 255, 255, 0.04)
```

---

## Component Library

### Buttons

#### Primary Button
- Background: Gradient (Blue → Cyan)
- Color: White
- Shadow: Glow effect on hover
- Hover: Scale up 2px, glow intensifies

#### Secondary Button
- Background: Dark with border
- Hover: Lighter background
- No shadow

#### Ghost Button
- Background: Transparent
- Hover: Subtle background

#### Icon Button
- Size: 40px
- Hover: Scale 1.05

### Input Fields
- Background: var(--bg-secondary)
- Border: 1px solid var(--border-primary)
- Focus: Blue ring + glow
- Placeholder: Gray text

### Cards (Glassmorphic)
- Background: rgba(255, 255, 255, 0.05)
- Backdrop Filter: blur(8px)
- Border: 1px solid var(--border-primary)
- Hover: Background becomes 0.08, border lightens
- Transition: 250ms

### Badges
- Background: Blue with 10% opacity
- Color: Cyan
- Size: Small (12px)
- Padding: 4px 12px

---

## Animation Patterns

### Entrance Animations
- **Fade In**: 0-100% opacity
- **Slide Up**: Translate Y from 16px to 0
- **Slide In**: Translate X from -16px to 0
- Duration: 250ms

### Hover Animations
- **Scale**: 1 → 1.05
- **Glow**: Shadow intensifies
- **Color Shift**: Subtle color change
- Duration: 150ms

### Loading States
- **Spinner**: Rotating border animation
- **Skeleton**: Shimmer effect (left to right)
- **Pulse**: 0.5s opacity pulse

### Floating Elements
- **Float**: Subtle Y-axis movement
- Duration: 3s
- Distance: 8px

---

## Layout & Spacing

### Spacing Scale
```
xs:   4px
sm:   8px
md:  12px
lg:  16px
xl:  24px
2xl: 32px
3xl: 48px
```

### Border Radius
```
sm:  8px
md: 12px
lg: 16px
xl: 24px
```

### Grid System
- 12-column responsive grid
- Gap: 16-24px
- Breakpoints: 768px (md), 1024px (lg), 1280px (xl)

---

## Dark Mode

All UI is designed for dark mode by default:

1. **Backgrounds**: Use slate/gray tones (50-950)
2. **Text**: High contrast white/gray
3. **Accents**: Blue/cyan gradients
4. **Shadows**: Dark with subtle variations

### Contrast Ratios
- Text: 7:1 (AAA standard)
- UI Components: 4.5:1 minimum

---

## Micro-Interactions Checklist

- ✅ Button click: Scale down 1px, fade on release
- ✅ Hover: Scale 1.05, shadow glow
- ✅ Focus: Blue ring (2px, 3px blur)
- ✅ Loading: Spinner or skeleton
- ✅ Success: Green checkmark, toast notification
- ✅ Error: Red highlight, error message
- ✅ Drag & Drop: Highlight zone, scale icon
- ✅ Upload Progress: Animated bar with percentage
- ✅ Transitions: Smooth between routes (fade in 300ms)

---

## Typography

### Font Family
- Primary: Inter, SF Pro, system fonts
- Monospace: SF Mono, Monaco, Courier

### Sizes & Weights
```
H1: 48px, 700 weight, -0.02em letter-spacing
H2: 36px, 700 weight, -0.015em
H3: 24px, 600 weight
H4: 18px, 600 weight
H5: 16px, 600 weight
H6: 14px, 600 weight
Body: 14px, 400 weight
Small: 12px, 400 weight
```

### Line Height
- Headers: 1.2
- Body: 1.6
- Compact: 1.4

---

## Responsive Design

### Breakpoints
```css
Mobile: < 640px
Tablet: 640px - 1024px
Desktop: > 1024px
```

### Guidelines
- Font sizes scale down on mobile
- Spacing tighter on mobile
- Full-width layouts on mobile
- Sidebar collapses/hides on tablet
- Touch targets: 44px minimum

---

## Accessibility

### Color
- Don't rely on color alone
- Use icons + text
- Maintain contrast ratios

### Keyboard Navigation
- Tab order matches visual order
- Visible focus states
- Escape key closes modals

### Screen Readers
- Semantic HTML (button, input, etc.)
- ARIA labels for icons
- Form labels associated

### Motion
- Respect prefers-reduced-motion
- No autoplaying videos
- Animations optional

---

## Prompts for Maintaining Premium Feel

When creating new components, ask:

1. **"Does this have glassmorphism thoughtfully applied?"**
   - Use only where it adds clarity
   - Always maintain readability
   - Subtle, not overwhelming

2. **"Are interactions smooth and delightful?"**
   - Hover states present?
   - Feedback on every action?
   - Animations non-distracting?

3. **"Is the spacing intentional?"**
   - Breathing room between elements
   - Consistent spacing scale
   - No cramped layouts

4. **"Does the color palette feel cohesive?"**
   - Using blue/cyan accents?
   - Dark backgrounds?
   - Contrast sufficient?

5. **"Is typography clear?"**
   - Hierarchy obvious?
   - Proper sizing?
   - Legible font?

6. **"Does this look like a high-end SaaS product?"**
   - No old-fashioned UI
   - Modern and minimal
   - Professional polish
   - Stripe/Apple/Notion inspired

---

## Component Examples

### Login Screen
- Large gradient logo
- Glassmorphic card
- Smooth animations
- Clear error states
- Loading spinner during auth

### Dashboard
- Sidebar with navigation
- Search bar (centered, modern)
- Grid view with hover effects
- Smooth transitions
- File preview cards
- Upload area with drag-drop

### Modal
- Semi-transparent backdrop (30% opacity)
- Glassmorphic content box
- Close button (top-right)
- Smooth entrance (slide + fade)
- Keyboard support (Esc to close)

### Upload Progress
- Animated bar (blue gradient)
- Percentage indicator
- File icon + name
- Cancel button
- Success animation on complete

### Share Modal
- Input field (copy-on-click)
- Permission toggles
- Expiring link options
- QR code (optional)
- Share buttons (social)

---

## Files & Structure

```
src/
├── styles/
│   ├── design-system.css (colors, animations, components)
│   └── global.css (tailwind, base styles)
├── components/
│   ├── AuthScreen.jsx (premium login)
│   ├── PremiumFileManager.jsx (dashboard)
│   ├── Dialogs.jsx (modals)
│   ├── UploadQueue.jsx (upload progress)
│   └── ...
├── pages/
│   ├── LandingPage.jsx (marketing site)
│   └── Dashboard.jsx (main app)
└── App.jsx (routing)
```

---

## Usage Instructions

1. **Import Design System**
   ```jsx
   import './styles/design-system.css';
   ```

2. **Use CSS Variables**
   ```jsx
   <div style={{ color: 'var(--primary)', padding: 'var(--spacing-lg)' }}>
   ```

3. **Apply Tailwind Classes**
   ```jsx
   <button className="btn btn-primary hover:scale-105 transition">
     Click me
   </button>
   ```

4. **Add Animations**
   ```jsx
   <div className="animate-fade-in animate-slide-up">
     Content
   </div>
   ```

---

## Quality Checklist

Before pushing any UI:

- [ ] Dark mode looks great
- [ ] Hover states implemented
- [ ] Loading states present
- [ ] Error handling visible
- [ ] Animations smooth (60fps)
- [ ] Mobile responsive
- [ ] Accessibility checked (contrast, keyboard, ARIA)
- [ ] No console errors
- [ ] Performance optimized
- [ ] Looks like Stripe/Apple/Notion (premium!)

---

## Questions?

When unsure, ask yourself:

> "Would Apple, Stripe, or Notion design it this way?"

If yes → Build it!
If no → Refine it.

Remember: **Simplicity is sophistication.**
