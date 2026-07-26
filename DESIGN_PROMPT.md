# Khalily Driver App — Visual Design System Request

---

## About This Project

**Khalily** (خليلي) is a motorcycle ride-hailing application built for the city of Nouakchott, Mauritania. It connects passengers with nearby motorcycle drivers in real-time. The app serves two user groups: **drivers** (Android app built with Kotlin/Jetpack Compose/Material 3) and **administrators** (web dashboard built with Bootstrap 5).

This brief focuses exclusively on the **driver's Android application**.

---

## Brand & Identity

| Element | Value |
|---|---|
| **App Name** | Khalily (خليلي) |
| **Tagline** | رفيقك في كل طريق |
| **Service Type** | Motorcycle ride-hailing |
| **City** | Nouakchott, Mauritania |
| **Language** | Arabic (RTL layout throughout) |
| **Currency** | MRU — Mauritanian Ouguiya |

---

## Current Problems (What Needs Fixing)

The current version of the app suffers from several visual and functional shortcomings:

1. **Oppressive Dark Background** — The main background color `#0B1849` (very deep navy) is used as a full-screen background, making the app feel heavy, dark, and uncomfortable for extended use. This color should be reserved for headers, navigation bars, and accent elements only.

2. **Visual Monotony** — Every screen uses the same white or off-white background with no color differentiation between sections. There is no visual hierarchy, no personality, and no warmth. The user cannot tell which section they are in without reading the title.

3. **Missing Login Button** — The login screen lost its primary action button in recent edits and needs to be restored properly.

4. **Empty Ride History** — The ride history section does not display past rides, their fares, or the calculated commission. This must be fixed.

5. **No Emotional Design** — The app feels like a technical prototype, not a product meant for daily use by real people in Nouakchott. It needs warmth, trust, and a sense of local identity.

---

## What I Need You to Design

I need you to act as a **senior mobile UI/UX designer** specializing in Arabic/Fintech applications for African markets. Please design a complete visual system that I can directly implement in Jetpack Compose (Material 3).

### 1. Color System

Design a **light-only theme** (no dark mode). The palette should feel:
- **Warm and inviting** — like a Saharan sunset, not a cold corporate dashboard
- **Trustworthy** — blues and greens that suggest reliability
- **Locally resonant** — colors that feel at home in Mauritania (desert golds, deep blues of the Atlantic, oasis greens)
- **Practically readable** — high contrast text on all backgrounds, WCAG AA minimum

Please provide:
- `primaryColor` (replacing the oppressive `#0B1849`)
- `onPrimaryColor`
- `primaryContainerColor`
- `onPrimaryContainerColor`
- `secondaryColor`
- `onSecondaryColor`
- `secondaryContainerColor`
- `tertiaryColor` (gold accent)
- `surfaceColor` (card backgrounds — NOT pure white)
- `surfaceVariantColor` (subtle tinted backgrounds per screen)
- `backgroundColor` (app-level background)
- `errorColor`
- `onBackgroundColor`
- `outlineColor` (borders and dividers)

Additionally, provide **per-screen accent tints** so each section has its own personality:
- Home / Map screen tint
- Ride Request dialog tint
- Ride History tint
- Settings tint
- Login screen tint

### 2. Typography

Using the **Cairo** font family (already imported from Google Fonts), define:

| Token | Size (sp) | Weight | Line Height | Color | Usage |
|---|---|---|---|---|---|
| displayLarge | ? | ? | ? | ? | Hero numbers on cards |
| displayMedium | ? | ? | ? | ? | Section counters |
| headlineLarge | ? | ? | ? | ? | Screen titles |
| headlineMedium | ? | ? | ? | ? | Dialog titles |
| titleLarge | ? | ? | ? | ? | Card headers |
| titleMedium | ? | ? | ? | ? | List item titles |
| titleSmall | ? | ? | ? | ? | Section subtitles |
| bodyLarge | ? | ? | ? | ? | Primary body text |
| bodyMedium | ? | ? | ? | ? | Secondary body text |
| bodySmall | ? | ? | ? | ? | Captions and timestamps |
| labelLarge | ? | ? | ? | ? | Button text |
| labelMedium | ? | ? | ? | ? | Tab labels |
| labelSmall | ? | ? | ? | ? | Badges |

Note: Arabic script requires approximately 10-15% larger sizes than Latin script for equivalent readability.

### 3. Component Library

Design and provide **Compose code** for these components:

#### a) KhalilyCard (3 variants)
- **DefaultCard** — neutral, for general content
- **AccentCard** — tinted background, for stats and highlights
- **UrgentCard** — attention-grabbing, for ride requests

#### b) KhalilyButton (4 variants)
- **PrimaryButton** — filled, for main actions (Accept Ride, Login)
- **SecondaryButton** — outlined, for secondary actions (Decline, Cancel)
- **DangerButton** — for destructive actions (End Ride)
- **GhostButton** — text-only, for navigation

#### c) KhalilyTextField
- Custom styled input field with Arabic placeholder support
- Focused and unfocused states

#### d) StatusBadge
- Different colors for: pending, accepted, in_progress, completed, cancelled
- Pill-shaped, Arabic text

#### e) RideInfoRow
- Icon + label + value layout
- For displaying ride details (pickup, dropoff, distance, fare, commission)

#### f) SectionHeader
- For dividing settings and history screens
- Subtle background, icon, title

### 4. Screen Designs

For each screen, provide the exact **background color**, **content container colors**, and **Compose structure**:

#### A. Login Screen
- Warm, welcoming background (NOT deep blue)
- Centered card with login form
- App logo prominently displayed
- Large, confident login button
- Company branding at the bottom

#### B. Home Screen (Map View)
- Map fills most of the screen
- Top status bar with driver name and online/offline toggle
- The toggle should be a large, satisfying switch with clear color feedback (green = online, gray = offline)
- Bottom quick-info panel showing today's earnings and ride count
- Floating action button to view ride history

#### C. Ride Request Dialog (Popup)
- This is the MOST important screen — it must grab attention immediately
- Pulsing gold icon at the top
- Warm background (gold or amber tinted)
- Passenger name and phone prominently displayed
- Pickup and dropoff addresses clearly shown
- Distance and fare in large, bold text
- Big green "Accept" button
- Subtle "Decline" link below

#### D. Active Ride Detail Screen
- Step-by-step journey indicator
- Large pickup/dropoff address cards
- Call passenger button (blue)
- WhatsApp passenger button (green)
- Complete ride button (prominent)

#### E. Ride History Screen
- Each ride as a card with:
  - Passenger name
  - Pickup → Dropoff route
  - Distance
  - Fare earned
  - Commission deducted (in red)
  - Net earnings (in green)
  - Status badge
  - Date/time
- Cards should alternate subtle background tints for visual rhythm
- Empty state: friendly illustration + "No rides yet" message in Arabic

#### F. Settings Screen
- Organized into clear sections with headers
- Contact info cards (phone, WhatsApp)
- Balance/top-up section
- About section with app version
- Each section should have its own subtle color identity

---

## Design Principles

1. **Flat Design Only** — No gradients, no shadows heavier than `elevation = 2.dp`, no 3D effects
2. **Warm Over Cold** — Prefer warm tones (cream, gold, soft green) over cold grays and whites
3. **Arabic-First** — All text is Arabic. Number formatting uses Arabic-Indic numerals where appropriate. Layout is RTL.
4. **Accessible** — Minimum 4.5:1 contrast ratio for body text, 3:1 for large text
5. **Local Identity** — Colors should evoke Nouakchott: the Atlantic Ocean, the Sahara, desert gold, oasis green
6. **Functional Color** — Every color must serve a purpose. Green = success/online/earnings. Red = error/offline/loss. Gold = brand/highlight. Blue = info/secondary actions.

---

## Deliverables

Please provide:

1. **Complete `Color.kt`** file with all color definitions
2. **Complete `Type.kt`** file with all typography styles
3. **Complete `Theme.kt`** file with `MaterialTheme` color scheme and typography setup
4. **Sample Composable code** for each component listed above
5. **Brief design rationale** explaining your color and typography choices

All code should be production-ready Kotlin/Jetpack Compose code that I can directly copy into my project's `com.khalily.driver.ui.theme` package.

---

## Constraints

- Material 3 only (no Material 2)
- Cairo font family (imported from Google Fonts via `googlefonts` dependency)
- RTL layout throughout
- No dark mode
- No gradients
- Flat solid colors only
- Must work on Android 8.0 (API 26) and above
- Screen sizes: primarily phones (5.0" to 6.7")
