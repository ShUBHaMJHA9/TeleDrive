# TeleDrive Premium UI - AI Prompts & Guidelines

## 🎨 Quick Reference: Creating Premium UI

Use these prompts when asking AI to create or modify UI components for TeleDrive:

---

## Prompt Templates

### 1. Creating a New Component

```
Create a React component called "[ComponentName]" for TeleDrive that:

Style Guidelines:
- Use a glassmorphic design with subtle frosted glass effect (backdrop-filter: blur(8px))
- Background: Dark mode (slate-950 to slate-900)
- Color scheme: Telegram blue (#0084FF) and cyan (#00D9FF) accents
- Shadows: Soft multi-layer shadows (not harsh)
- Border radius: 12-16px for modern look
- Spacing: Use generous padding (16-24px)

Component Features:
- [Feature 1]
- [Feature 2]
- [Feature 3]

Interactions:
- Smooth hover effects (scale 1.05 on buttons, glow effect on focus)
- Fade in/slide up animations on load (250ms duration)
- Loading state with skeleton or spinner
- Error handling with clear red feedback

Typography:
- Use system fonts (-apple-system, BlinkMacSystemFont, etc.)
- Hierarchy: Bold headers (600-700 weight), regular body (400 weight)
- Font sizes: Headers use -0.02em letter-spacing for premium feel

Accessibility:
- High contrast (7:1 ratio for AA+)
- Keyboard navigation support
- ARIA labels for icons
- Focus states clearly visible (blue ring)

Make it look like a high-end SaaS product (think Stripe, Apple, Notion).
```

### 2. Improving Existing Component

```
Refactor this React component to feel more premium and modern:

Current Issues:
- [Issue 1]
- [Issue 2]
- [Issue 3]

Improvements Needed:
- Add glassmorphism (subtle backdrop blur)
- Enhance animations (smooth 250ms transitions)
- Better spacing (use 16-24px padding)
- Gradient accents (blue to cyan)
- Soft shadows instead of flat design
- Dark mode with proper contrast
- Micro-interactions on every interactive element

Keep the functionality the same, just improve the visual design and feel.
Make it look like Stripe or Notion's UI.
```

### 3. Creating a Modal/Dialog

```
Create a premium modal component for TeleDrive that:

Modal Design:
- Glassmorphic card (backdrop-filter: blur(8px), rgba(255,255,255,0.05) background)
- Soft shadow (0 16px 32px rgba(0,0,0,0.2))
- Rounded corners 16px
- Max width 500px for most modals

Content:
- [Modal Title]
- [Modal Content]
- [Action Buttons]

Animation:
- Entrance: Fade in + slide up from bottom (250ms, cubic-bezier(0.4, 0, 0.2, 1))
- Backdrop: Semi-transparent blur (30% opacity, backdrop-filter: blur(4px))
- Exit: Fade out

Buttons:
- Primary button: Gradient (blue to cyan), white text, glow on hover
- Secondary button: Dark background with border, hover brightens
- Both: Smooth 150ms transitions

Close:
- X button top-right (icon button style)
- ESC key support
- Click outside to close (optional)

Color Scheme:
- Dark: #0F1419 (background)
- Border: rgba(255,255,255,0.08)
- Text: #FFFFFF and #B0B8C1 (secondary)
- Accent: #0084FF (blue)

Make it feel like a premium SaaS modal (not old-fashioned).
```

### 4. Creating a Dashboard Section

```
Design a premium dashboard section for TeleDrive:

Layout:
- Responsive grid layout (1 col on mobile, 3-4 cols on desktop)
- 16-24px gap between cards
- Full width container with max-width 1400px

Card Style:
- Glassmorphic design (backdrop blur, semi-transparent white background)
- Soft shadow on hover (0 8px 16px rgba(0,0,0,0.15))
- Hover effect: Scale 1.05 with enhanced shadow
- Border: 1px solid rgba(255,255,255,0.08)
- Rounded 16px corners

Content:
- Icon or preview (12px radius, gradient background)
- Title (16px font, 600 weight)
- Subtitle or description (14px, gray text)
- Action buttons or icons (hidden until hover)

Animations:
- Entrance: Fade in + slide up (stagger by 50ms per card)
- Hover: Scale 1.05 + shadow glow
- Loading: Skeleton loader with shimmer effect

Empty State:
- Centered icon (48px)
- Title + description
- Call-to-action button

Color:
- Dark slate background
- Blue/cyan accents
- Gray text for secondary content
- White for primary text

Make it look modern and premium, like Google Drive or Notion.
```

---

## Design Tokens

Always use these in new components:

### Colors
```
Primary Blue: #0084FF
Accent Cyan: #00D9FF
Gradient: linear-gradient(135deg, #0084FF, #00D9FF)

Backgrounds:
- bg-primary: #0F1419
- bg-secondary: #1A1F2E
- bg-tertiary: #25293D
- bg-hover: #2D3245

Text:
- text-primary: #FFFFFF
- text-secondary: #B0B8C1
- text-tertiary: #8A91A1

Borders:
- border-primary: rgba(255,255,255,0.08)
- border-secondary: rgba(255,255,255,0.04)
```

### Shadows
```css
/* Soft shadows - use these instead of harsh shadows */
--shadow-sm: 0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 1px rgba(0, 0, 0, 0.08);
--shadow-md: 0 8px 16px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 16px 32px rgba(0, 0, 0, 0.2), 0 4px 8px rgba(0, 0, 0, 0.1);
--shadow-glow: 0 0 32px rgba(0, 132, 255, 0.2); /* Glow effect */
```

### Spacing
```
xs:   4px
sm:   8px
md:  12px
lg:  16px (default)
xl:  24px
2xl: 32px
3xl: 48px
```

### Border Radius
```
sm:  8px
md: 12px
lg: 16px (default)
xl: 24px
```

### Transitions
```
--transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1)
--transition-base: 250ms cubic-bezier(0.4, 0, 0.2, 1)
--transition-slow: 350ms cubic-bezier(0.4, 0, 0.2, 1)
```

---

## Component Examples

### Button
```jsx
// Primary (use for main CTA)
<button className="btn btn-primary">Action</button>

// Secondary (use for alternative actions)
<button className="btn btn-secondary">Cancel</button>

// Ghost (subtle buttons)
<button className="btn btn-ghost">More</button>
```

### Input Field
```jsx
<input
  type="text"
  placeholder="Search..."
  className="input-field"
/>
```

### Card (Glassmorphic)
```jsx
<div className="glass-card p-6 hover:scale-105 transition">
  {/* Content */}
</div>
```

### Badge
```jsx
<span className="badge">Popular</span>
```

### Loading State
```jsx
<div className="skeleton h-48 rounded-lg"></div>
```

### Animations
```jsx
<div className="animate-fade-in animate-slide-up">
  Content fades in and slides up
</div>
```

---

## Micro-Interactions Checklist

When creating interactive elements, include:

- [ ] **Hover**: Scale 1.05, shadow glow, color shift
- [ ] **Active/Click**: Scale 0.98, immediate feedback
- [ ] **Focus**: Blue ring (2px, 3px blur), visible from keyboard
- [ ] **Loading**: Spinner or skeleton with shimmer
- [ ] **Disabled**: Opacity 50%, cursor not-allowed
- [ ] **Success**: Green checkmark, toast notification
- [ ] **Error**: Red highlight, error message visible
- [ ] **Transitions**: Smooth 250ms between states
- [ ] **Entrance**: Fade in + slide (250ms)
- [ ] **Exit**: Fade out (150ms)

---

## What NOT to Do (Anti-Patterns)

❌ **Avoid:**
- Sharp corners (use 12-16px radius)
- Harsh shadows (use soft multi-layer)
- Flat design (add depth with glassmorphism)
- Bright neon colors (use subtle gradients)
- Slow animations (max 350ms)
- No feedback on interaction (always give feedback)
- Light mode as primary (dark is premium)
- Old-fashioned UI (Outlook 2010 style)
- Accessibility ignored (maintain contrast)
- Clutter and too much spacing

✅ **Do:**
- Smooth rounded corners
- Soft, subtle shadows
- Glassmorphic depth
- Gradient accents
- Fast, snappy animations
- Clear interactive feedback
- Dark mode first
- Modern, minimalist
- WCAG AAA contrast
- Clean, breathing space

---

## AI Prompts for Quick Tweaks

### "Make this more premium"
```
Refactor this UI to feel more premium and modern:
- Add glassmorphism (backdrop blur)
- Use soft shadows instead of flat
- Add gradient accents (blue/cyan)
- Improve spacing (16-24px)
- Smooth animations (250ms)
- Dark mode colors
- Better typography hierarchy
```

### "Add animations"
```
Add smooth micro-interactions to this component:
- Entrance: Fade in + slide up (250ms)
- Hover: Scale 1.05, glow effect
- Click: Brief scale down to 0.98
- Loading: Spinner or skeleton
- Error: Red highlight + message
- Success: Green checkmark + toast

Use cubic-bezier(0.4, 0, 0.2, 1) timing function.
```

### "Make it responsive"
```
Make this component fully responsive:
- Mobile (< 640px): Stack vertically, full width
- Tablet (640-1024px): 2 columns, adjusted spacing
- Desktop (> 1024px): 3-4 columns, generous spacing
- Touch-friendly buttons (44px minimum)
- Readable font sizes on all devices
```

---

## File Structure

```
src/
├── styles/
│   ├── design-system.css (colors, components, animations)
│   └── global.css (tailwind, base styles)
├── components/
│   ├── AuthScreen.jsx (premium login)
│   ├── PremiumFileManager.jsx (dashboard)
│   ├── Dialogs.jsx (modals)
│   └── ...
└── App.jsx
```

---

## Testing Checklist

Before shipping any UI component:

- [ ] **Visual**: Looks premium and modern
- [ ] **Dark Mode**: Beautiful in dark mode
- [ ] **Responsive**: Works on mobile, tablet, desktop
- [ ] **Animations**: Smooth and non-distracting
- [ ] **Accessibility**: Keyboard nav, ARIA labels, contrast
- [ ] **Performance**: No jank (60fps), fast interactions
- [ ] **Consistency**: Matches design system
- [ ] **Feedback**: User knows what's happening (loading, errors)
- [ ] **Hover States**: Interactive elements react to hover
- [ ] **No Console Errors**: Clean browser console

---

## Real-World Inspirations

Look at these for inspiration:

- **Stripe**: Clean spacing, soft shadows, gradient accents
- **Apple**: Minimalist, bold typography, breathing room
- **Notion**: Softshadows, rounded corners, dark modes
- **Linear**: Modern interactions, smooth animations
- **Codeflow**: Glassmorphism, gradient accents
- **Mirror World**: Dark mode with glowing accents

---

## Final Golden Rule

> **"If Stripe, Apple, or Notion designed it, you're on the right track."**

When in doubt between two designs, pick the one that:
1. Has more breathing room
2. Has softer shadows
3. Looks more modern
4. Feels more premium
5. Is easier to read

Remember: **Simplicity is sophistication.**

---

## Connect This to Your Backend

```jsx
// API calls with modern loading states
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);

const handleAction = async () => {
  setLoading(true);
  setError(null);
  try {
    const res = await api.doSomething();
    toast.success('Done!');
  } catch (err) {
    setError(err.message);
    toast.error(err.message);
  } finally {
    setLoading(false);
  }
};

// Render
return (
  <>
    {loading && <div className="skeleton h-48" />}
    {error && <div className="text-red-400">{error}</div>}
    {!loading && !error && <YourContent />}
  </>
);
```

---

## Need Help?

When implementing new features:

1. **Reference DESIGN_SYSTEM.md** for all tokens and components
2. **Use CSS variables** (var(--primary), var(--spacing-lg), etc.)
3. **Apply Tailwind utilities** for responsive design
4. **Add animations** using animate-* classes
5. **Test** on mobile, tablet, desktop
6. **Compare** with Stripe/Apple/Notion
7. **Ask AI** using the prompts above

Good luck building premium UIs! 🚀
