# h@ven — App Documentation

> Snapshot of the codebase as of **2026-05-06**, written as a pre-backend audit. Covers what every feature does today, which screens exist, what icons are used, what data is stored where, and what is still missing before Supabase can be wired up.

---

## 1. What h@ven Is

h@ven is a native iOS/Android queer community app. It is **not a dating app and not a follower app.** The core loop is:

1. A user joins a small group chat anchored by a single conversation prompt (e.g. *"What are you unlearning right now?"*).
2. Before they can read the chat or see other people's answers, they must answer the prompt themselves (max **300 characters**).
3. The chat lasts **exactly 7 days**, then expires. Connections made along the way carry over (friend requests, gallery shares).

Safety, intentionality, and ephemerality are the design pillars — every feature should be evaluated through that lens.

## 2. Tech Stack

| Layer | Choice |
|---|---|
| Runtime | Expo SDK 54 + React Native 0.81 |
| Language | TypeScript |
| Navigation | Expo Router v6 (file-system routing under `app/`) |
| Animation | React Native Reanimated 4 + the legacy `Animated` API in older screens |
| Fonts | Manrope via `@expo-google-fonts/manrope` |
| Icons | Custom SVGs (`react-native-svg`) under `components/ui/icons/` + `@expo/vector-icons` (Ionicons) |
| Local persistence | `@react-native-async-storage/async-storage` + `expo-file-system` (gallery) |
| Image picker | `expo-image-picker` |
| State | React Context (`ActiveChatProvider`, `FriendsProvider`, `OnboardingProvider`) |
| Backend | **Not yet wired.** Mock data in `constants/mock-*.ts`, in-memory state, AsyncStorage. Phase 8 will introduce Supabase (Postgres + Realtime + Auth + Edge Functions). |

`app.json`, `tsconfig.json`, and `eslint.config.js` are stock Expo. The `app/_layout.tsx` registers every top-level Stack screen with `headerShown: false` and a `'fade'` animation for chat/answers/photos to make navigation feel instant.

---

## 3. Boot & Auth Flow

### 3.1 Cold launch

`app/_layout.tsx` does three things on boot:

1. **Loads Manrope fonts** in 6 weights via `useFonts`. While loading, the native splash screen is held with `SplashScreen.preventAutoHideAsync()`. As soon as fonts resolve, the native splash is hidden and the JS-side splash overlay takes over.
2. **Mounts `FriendsProvider` and `ActiveChatProvider`** at the root. Both hydrate from AsyncStorage and expose a `ready` / `isHydrated` flag.
3. **Renders the `SplashOverlay`** on top of everything until its 1250 ms delay + 260 ms fade-out completes. The branded "h@ven" logo letters animate in with a staggered upward bounce (`components/splash/animated-haven-logo.tsx`).

### 3.2 Boot router (`app/index.tsx`)

The welcome route is also the boot decision tree. It blocks rendering on `bootResolved: false` until two async checks resolve:

| Condition | Destination |
|---|---|
| `activeChatId` exists in AsyncStorage and is < 7 days old | `/chat` (jump back into the live room) |
| Intro tutorial seen (`@haven/has_seen_intro_v1 === '1'`) but no active chat | `/(tabs)/chat-selection` |
| First-time user — neither flag set | Render the welcome view |

Expired active chats are silently cleared during hydration in `contexts/active-chat-context.tsx` (the chat duration is `7 * 24 * 60 * 60 * 1000` ms, defined in `lib/active-chat-storage.ts`).

### 3.3 Welcome screen

Visual:

- h@ven logo (40×120 pt, centered).
- Mixed-weight headline: *"We're happy you're here. Building queer community is something we all deserve and need."* — extra-bold + regular + semi-bold + underlined-extra-light, all in the same `<Text>`.
- Decorative SVG art: a portrait (`face.png`) and flower (`flower.png`) overlaying the right side of the headline, plus three 5-pointed neon stars (`NeonStar` polygon component) anchored bottom-right with brand-color fill/stroke pairs (purple/cherry, cherry/green, green/magenta).
- Black "Begin" pill button (48 pt) with right arrow → opens the auth bottom sheet.

### 3.4 Auth bottom sheet

A custom-animated modal (300 ms parallel translate + opacity, 70%-black dim backdrop) presents 4 options:

| Provider | Icon | Status |
|---|---|---|
| Apple | `logo-apple` Ionicon | **Stub** (requires EAS Build later) |
| Google | `google-logo.png` | **Stub** (requires EAS Build later) |
| Phone | `call` Ionicon | **Stub** (Supabase SMS OTP planned) |
| Email | `mail` Ionicon | **Stub** (Supabase email/password planned) |

`handleAuth(provider)` currently does **not** authenticate — it clears bio + gallery storage (a TODO note acknowledges this should only fire on sign-up, not sign-in) and routes to `/onboarding`. A `CloseIcon` button dismisses the sheet; legal text at the bottom is non-interactive copy.

---

## 4. Onboarding

`app/onboarding/index.tsx` is a single-screen, 7-step animated form. State is held in `OnboardingContext` (`contexts/onboarding-context.tsx`) — **none of it is persisted to AsyncStorage during the flow.** Today, if a user kills the app between steps 3 and 7, they lose everything. Phase 8 must persist drafts (probably a Supabase `profile_drafts` row keyed to the auth user).

Each step is a `components/onboarding/steps/step-*.tsx` component that uses `useStepFlow()` to register its primary button label, validation gate, and optional secondary/back-handler overrides. Cross-fade + 32 px slide-out animation runs on every transition (280 ms, `Easing.out(Easing.cubic)`).

| Step | What it asks | Field(s) captured | Validation | Notes |
|---|---|---|---|---|
| 1. Username | `@handle` text input with animated `GlowUnderline` | `username: string` | ≥3 chars, no spaces, not in hardcoded taken-set `['jane', 'test', 'admin', 'user', 'haven']` | **Mocked** — real availability check needs an API |
| 2. Age | MM/DD/YYYY auto-formatted text input | `dateOfBirth: string` | Valid calendar date, 18+ via `lib/date-input.ts` `isAtLeast18` | Local-time parsing — no TZ awareness |
| 3. Lock | 4-digit PIN pad (3×4 grid) + dot indicators, plus a "Lock screen set!" success screen | `lockPin: string \| null`, `lockSkipped: boolean` | Exactly 4 digits when set | **Not actually wired** — PIN doesn't lock the app, isn't stored to Keychain |
| 4. Gender | `FlatList` of 15 radio rows (Cis Woman, Trans Woman, Nonbinary, Two-Spirit, Pangender, Agender, Questioning, etc.) with `CheckIcon` on selection | `genderId: GenderSymbol` | One required | Maps to one of 14 SVG avatar symbols in `components/ui/gender-avatar.tsx` |
| 5. Pronouns | 3 preset pills (He/Him, She/Her, They/Them) + custom text input. Selecting a preset clears custom and vice versa | `pronounPreset: string \| null`, `pronounsCustom: string` | At least one path filled | |
| 6. Out status | Two-phase: "Are you out?" (Yes/No/Sort-of). If "No" → second phase asks about accepting environment (5 levels from "Very accepting" → "I worry for my safety") | `outStatus`, `acceptingEnvironment` | One required per active phase | Custom back handler returns from phase 2 to phase 1 |
| 7. Identities | Multi-select `FlatList` of 15 checkboxes (AAPI, Black/African Descent, Differently Abled, Parent, Student, 65+, Indigenous, Mixed race, Immigrant, Rural, Urban, Veteran, Faith community, Neurodivergent, Latine) | `identities: string[]` | At least one | Final step — calls `finish()` which navigates to `/onboarding/intro`, but **does not persist anything** |

Options for steps 4, 5, 7 live in `constants/onboarding-options.ts`.

### 4.1 Intro tutorial (`app/onboarding/intro.tsx`)

A 3-slide button-driven walkthrough (no swipe gesture). Each slide has a full-bleed illustration (`tutorial-1/2/3.png`), a 40 pt semi-bold title, and a 16 pt grey body. Three animated progress bars at the bottom interpolate width + color based on the current slide.

Slides:

1. **Join a chat** — *"Find a group that's right for you."*
2. **Answer the prompt** — *"Get the conversation started and learn a little about each member."*
3. **Hang out for a week** — *"After a week, you get moved to a new chat. You can choose to keep in touch with people from the chat."*

On slide 3's "Finish" button: `markIntroSeen()` writes `@haven/has_seen_intro_v1 = '1'`, then `router.replace('/(tabs)/chat-selection')`.

---

## 5. Chat Lifecycle

This is the largest surface area of the app.

### 5.1 Chat selection (`app/(tabs)/chat-selection.tsx`)

The single visible tab. Renders a vertical list of `GroupCard`s sourced from `constants/mock-groups.ts`. Each `GroupCardData` carries:

```ts
{ id, promptColors: { bg, fg, support }, question, activeLabel, openSeats, members: GroupMember[], tags: IdentityTag[] }
```

A `GroupCard` (`components/home/group-card.tsx`) has 4 zones:

1. **Prompt block (top)** — colored background (color is deterministic per `id` via `getPromptColorsForId` in `constants/theme.ts`), with "Prompt" label, "Active 1d ago" timestamp, and the question. Tapping routes to `/prompt?id={groupId}`.
2. **Members section** — 3 `MemberRow` rows with avatars (`GenderAvatar` + handle + pronouns), plus a "+N more" or open-seats indicator. Each row is tappable to `/profile/[username]`.
3. **Identity tags** — `IdentityPill`s with cherry-bordered "matched" state vs. plain "unmatched" state.
4. **"Join the chat" button (bottom)** — also routes to `/prompt?id={groupId}`.

There's a defensive guard at the top of this screen: if `activeChatId` is set during render, it replaces with `/chat` to prevent two parallel chats.

### 5.2 Prompt-answer gate

The flow is **`/prompt` → save answer → `/answers` → `/chat`**. The 300-character cap is enforced in `app/prompt.tsx`:

```
const MAX_CHARS = 300;
const canShare = length > 0 && length <= MAX_CHARS;
setAnswer(t.slice(0, MAX_CHARS));
```

`canShare` gates the "Share with chat" button. On submit, `setPromptAnswerForGroup(groupId, card)` writes the answer to AsyncStorage (`@haven/prompt_answers_v1`, keyed by groupId), then navigates to `/answers?groupId={groupId}`.

### 5.3 Compose answer (`app/prompt.tsx`)

- Top bar: black back chevron, background tinted to `promptColors.bg`.
- Body: "Prompt" label + character counter (`45/300`), large 32 pt semi-bold question colored with `promptColors.fg`.
- Multiline `TextInput` (min 160 pt) with placeholder *"Share honestly — this is your space."*
- Footer: "Share with chat" button pinned above the keyboard.

The status bar adapts (`light` vs. `dark`) based on whether the prompt's support color is white or black.

### 5.4 Browse answers (`app/answers.tsx`)

Horizontal snap-to-interval `ScrollView` of 317 pt-wide cards (clamped to device width). Each card has:

- Author row: 36 pt avatar with white ring, handle + pronouns (`@grover (She/her)`).
- Answer text in `AutoFitText` (16–24 pt range).
- Action row: **Reply** button (no functional handler today) and **Like** button using inline `LikeIcon` / `LikeFilledIcon` SVGs.

Cards animate in stacked (card 0 scales up; card 1 slides from behind) and have focus-based scaling (1.0 in center, 0.8 off-center). The "Like" button has a spring `1 → 1.4 → 1.0` scale + iOS haptic.

Liking a card is the **connection-creation event**:

```
addPendingConnection({ handle, pronouns, avatarColor, avatarSymbol, answer, question, promptColors });
```

These pending connections are popped on `/chat` mount and rendered as tilted-card "system-connection" messages at the top of the message list.

The user's own answer (loaded from AsyncStorage) is appended at the end of the deck. A `SegmentedPagination` bar tracks scroll position. Closing the screen routes to `/chat`.

### 5.5 The chat room (`app/chat.tsx`)

A 1700-line file containing the message list, composer, and 4 sheet/overlay surfaces.

**Header**

| Slot | Element | Action |
|---|---|---|
| Left | `PromptIcon` (custom SVG, document with "?") | `/answers?groupId={activeChatId}` |
| Center | `GroupHeaderCenter` — stacked avatars of first 3 members + "N members" pill | Opens `GroupSheet` |
| Right | `ProfileIcon` | `/profile` |

**Message list**

Three message types:

1. **System connection card** — tilted -5°, colored card showing a friend's profile + their prompt answer + like badges + "N replies" link.
2. **User's own messages** — right-aligned blue bubbles, white text. Bubble corner radii adapt based on whether the bubble is the first / last in a sequential group from the same author. Optional GIF (220×220), reply preview chip above bubble, like stack below.
3. **Others' messages** — left-aligned gray bubbles with black text. Avatar shows only on the last bubble of a group; a name+pronouns chip shows only on the first. Multi-stage entrance animation: avatar → name → bubble → tip, each delayed 90 ms.

Interactions on every message:

- **Double-tap** → like (tracked in `likesByMessage`).
- **Long-press** (350 ms) → opens `FocusOverlay` with Reply / Report actions.
- **Tap reply preview chip** → scrolls to the parent message.
- **Long-press like stack** → opens `LikesSheet` listing everyone who liked the message.
- **Tap "N replies" link** → opens `ThreadSheet`.

**Composer (input bar)**

- Left: GIF button → `GifPickerSheet`.
- Center: optional reply preview chip with × clear, optional staged GIF thumbnail with × clear, multiline `TextInput`.
- Right (inside input): blue send arrow.

Submitting creates a local message:

```
{ id: 'local-{timestamp}', authorId: 'me', body, gif?, replyToId? }
```

Marked "fresh" for 500 ms to drive a fade+scale entrance animation.

### 5.6 Surfaces inside chat

| Surface | Trigger | What it shows |
|---|---|---|
| `GifPickerSheet` | GIF button | Search input + 2-col grid of `MOCK_GIFS` (12 GIFs: hi, yes, love, clap, dance, laugh, cry, wow, hug, pride, party, sparkle). Tap → `stagedGif` + close sheet. |
| `FocusOverlay` | Long-press a message | Dim backdrop + cloned bubble + menu (Reply / Report). Report shows a 1.5 s "Message reported" toast. |
| `ThreadSheet` | Tap "N replies" link | 85% sheet with parent message at top, all replies below, full composer at bottom. Sends with `replyToId: parentId`. |
| `LikesSheet` | Long-press like stack | List of likers as member rows. |
| `GroupSheet` | Tap header center | **Members view** (default): close button, "Members" title + `formatMsLeft(msLeft)` countdown, member rows with "You :)" / "Friend" / "Add Friend" affordance, divider, red **Leave the chat** button, helper *"You can only leave 1 chat per day."* **Leave confirmation view**: confirm modal with Cancel + Leave buttons. |
| `ChatEndedOverlay` | `justExpired === true` from context | "This chat has ended" + "Your 7 days are up. The chat is closed, but the people you connected with are saved." + **Back to chats** button. |

### 5.7 Active chat persistence

`contexts/active-chat-context.tsx` is the single source of truth for "am I in a chat right now":

- **Hydrates** from `@haven/active_chat_v1` on mount; if `joinedAt + CHAT_DURATION_MS <= Date.now()`, silently clears storage.
- **Ticks** every 30 s and on `AppState` foreground events to recompute `msLeft`.
- **Sets `justExpired = true`** when `msLeft` first crosses 0 — this is what triggers `ChatEndedOverlay`.
- **Exposes** `joinChat(chatId)` and `leaveChat()` mutators.

`formatMsLeft(ms)` (`lib/active-chat-storage.ts`) returns one of: `"7d left"`, `"6d 12h left"`, `"23h left"`, `"<1h left"`, `"ended"`.

### 5.8 Welcome drip

When the user first enters a chat, `WELCOME_DRIP_MESSAGES` (in `constants/mock-chat.ts`) are scheduled via `setTimeout` at 5–10 s intervals to simulate existing members welcoming the new person. Pure mock — replace with Realtime subscriptions in Phase 8.

---

## 6. Profile System

Two distinct routes feed the same component library:

| Route | Used for | Editable? |
|---|---|---|
| `/profile` (`app/profile/index.tsx`) | Viewing your own profile | Bio + gallery only (everything else is one-shot from onboarding) |
| `/profile/[username]` (`app/profile/[username].tsx`) | Viewing someone else's | No — share-gated |

Both screens are vertically scrollable feeds composed of:

1. **`ProfileHero`** — 300 pt tall, large `GenderAvatar` (320 pt, positioned `top: -40, left: -40` to bleed), back arrow + configurable trailing button (settings on own profile, "Friend Status" pill on a friend's profile, or none). Animated `heroTranslateY` + `heroScale` interpolate as the user scrolls.
2. **`ProfileInfoBlock`** — handle, pronouns, identity pills (`IdentityPill` with cherry → light-purple gradient border), bio (with empty/edit/read states).
3. **Stats row** *(own profile only)* — colored tiles for chats joined and friend count (uses live `useFriendCounts()` hook).
4. **`MyFriendsPreview`** *(own profile only)* — 3-column × 2-row grid of top 6 friends; empty slots show promotional `friend-empty-1..6.png` cards.
5. **`ProfileGallerySection`** — 3-col grid of 6 photo slots. On own profile, slots are tappable to upload via `expo-image-picker`. On friend profiles, only tappable to launch `/photos`.
6. **`ProfilePromptDeck`** — `SwipeableDeck` pan-responder card stack. Shows past prompt answers. Friend-profile version uses `SegmentedPagination` instead of simple bars.

### 6.1 Own profile specifics

- The hero's trailing slot is a `'settings'` icon → currently a **no-op** (`console.log`). No settings screen exists.
- The bio row supports inline editing: tap → 150-char `TextInput`, blur/submit calls `setBio()` or `clearBio()` (`lib/bio-storage.ts`, key `@haven/profile_bio_v1`).
- Gallery slots use `expo-image-picker` to launch the device picker, then `persistPickedImage()` copies the file to `${documentDir}/gallery/${timestamp}-${random}.${ext}`. The URI is appended to the 6-slot array in `@haven/profile_gallery_v1`. Tapping a filled slot opens an in-screen modal preview with a **Remove** button that deletes the file from disk and re-compacts the array.
- `MOCK_PROMPT_CARDS` (3 hardcoded cards) drive the prompt deck. **There is no wiring from real chat prompt answers into the profile deck yet.**
- **Pronouns, age, gender symbol, and identities are not editable** anywhere in the app after onboarding. There is no `/settings` or `/profile/edit` route.

### 6.2 Friend profile specifics (`app/profile/[username].tsx`)

`getProfileByUsername(username)` (`lib/profile-directory.ts`) looks up the profile in the static `MOCK_PEOPLE_DIRECTORY`, deduped by lowercased handle from `MOCK_GROUP_CARDS` + `MOCK_CHAT_MEMBERS`. If not found, the screen returns a "Profile not found" early state.

`useRelationship(profile.id)` returns `{ state: 'self' | 'friend' | 'pending-sent' | 'pending-received' | 'blocked' | 'stranger', sharesGallery, sharesPrompts, iShareGallery, iSharePrompts }`. The screen uses these flags to:

- Show a `FriendActionButton` (hero variant, absolute-positioned at the bottom) when not friends. Renders *Add Friend* / *Requested* / *Accept+Decline* / *Friends ✓* / *Blocked* depending on state.
- Render the gallery section only if `sharesGallery === true`. Tapping a photo navigates to `/photos?owner={handle}&start={index}`.
- Render the prompt deck only if `sharesPrompts === true`. Data comes from `getPromptsFor(handle)` → `MOCK_FRIEND_PROMPTS` (`constants/mock-friend-content.ts`).
- Show an empty state ("Learn more about them by becoming friends.") when not a friend.

The trailing hero button is a **"Friend Status" pill** with chevron icon → opens `ProfileOverflowSheet`.

### 6.3 Profile overflow sheet

A modal dropdown anchored under the hero pill. Menu rows:

| Row | Action |
|---|---|
| **Share Gallery** / **Stop Sharing Gallery** | Toggles `share()`/`unshare()` for `'gallery'` |
| **Share Prompt Answers** / **Stop Sharing Prompts** | Toggles `share()`/`unshare()` for `'prompts'` |
| **Unfriend** | Native `Alert` confirm → `unfriend(targetId)` |
| **Block** | Native `Alert` confirm → `blockUser(targetId)` |
| **Report** | Switches to a nested report panel (300-char textarea + Submit) → writes to `@haven/friend_reports_v1` |

Destructive items render in `Colors.cherry`. Faint white dividers separate rows.

### 6.4 Photos screen (`app/photos.tsx`)

Fullscreen carousel. Reads `?owner={handle}&start={index}` params. Calls `getGalleryFor(owner)` to pull the photos. Horizontal paging `ScrollView` with `pagingEnabled` + fast deceleration; `contentFit="contain"` so nothing crops. Initial scroll offset is `startIndex * windowWidth`. Floating UI: top-left close button (frosted black bg) + bottom-center "page / total" counter pill.

---

## 7. Friends System

Friendship is **first-class and independent of chat membership.** A user can be your friend after the chat ends; conversely, being in the same chat does not auto-friend you.

### 7.1 Friends home (`app/friends/index.tsx`)

Single screen with:

- **Header**: search bar (filters confirmed friendships by handle).
- **`RequestsCarousel`** *(only visible if `incomingRequests.length > 0`)* — horizontal paginated cards with sender avatar/handle/pronouns + Accept/Reject buttons. Pagination dots track position.
- **Friends list**: vertical list of `FriendListRow`. Each row shows avatar/handle/pronouns + a heart toggle (top friend pin/unpin).
- **Footer hint**: count of pinned top friends.

### 7.2 Friend request lifecycle

Requests are append-only rows in `@haven/friend_requests_v1`. Each row:

```ts
{ id, senderId, recipientId, status: 'pending' | 'accepted' | 'declined' | 'cancelled',
  createdAt, resolvedAt, sharedChatId }
```

| Action | What happens |
|---|---|
| **Send** (`sendFriendRequest`) | Validates: not self, not blocked, no existing friendship, no existing pending row. **Critically: `findSharedChat` (lib/shared-chat-gate.ts) must return a non-null chat id** — i.e., both users must have or have had a common group card or active chat. Then writes a row with `status: 'pending'`. |
| **Accept** (`acceptFriendRequest`) | Mutates row to `'accepted'` + `resolvedAt: now`, then writes a `Friendship` row to `@haven/friendships_v1`. |
| **Decline** (`declineFriendRequest`) | Mutates row to `'declined'` + `resolvedAt`. No friendship created. |
| **Cancel** (`cancelFriendRequest`) | Mutates row to `'cancelled'` + `resolvedAt`. |
| **Block (cascade)** | Cancels all pending requests in both directions via `cancelPendingFromTo`. |

The **`useRelationship(targetId)` hook** is the centralized resolver every UI component reads. It returns one of `'self' | 'blocked' | 'friend' | 'pending-sent' | 'pending-received' | 'stranger'` plus the four share flags. `FriendActionButton` (`components/friends/friend-action-button.tsx`) renders the appropriate UI per state — hero or compact variant.

### 7.3 Top friends

`@haven/top_friends_v1` stores up to 6 `TopSlot` rows per user `{ userId, friendId, position, updatedAt }`. The UI uses **"compact on read"**: storage may have gaps, but `getTopFriends(userId)` returns a packed array `[6]`. Toggling a heart in the friends list either pins to the first empty slot or removes the existing slot for that friend.

`removeFriendFromTopFriends(friendId)` is called on unfriend/block to sweep all owners' lists.

### 7.4 Blocks

Stored unidirectionally in `@haven/blocks_v1` as `{ blockerId, blockedId, createdAt }`, but checked **bidirectionally** by `isBlocked()`. So if A blocks B, B also sees A as blocked. The block cascade does:

1. Unfriend.
2. Remove from top friends (both sides).
3. Unshare gallery + prompts (both sides).
4. Cancel pending requests in both directions.
5. Write the block row.

**Unblock UI is unreachable today** — the action exists in `FriendsProvider.unblockUser` but no button is wired to it. The blocked button is a `console.log` placeholder ("Phase 7").

### 7.5 Profile shares

`@haven/profile_shares_v1` — directional `{ ownerId, viewerId, kind: 'gallery' | 'prompts', sharedAt }`. Independent of friendship. Accepting a friend request does **not** auto-share. Today, shares are written by the dev seed panel and the overflow sheet (and revoked by unfriend/block cascades).

### 7.6 Reports

`@haven/friend_reports_v1` — append-only `{ reporterId, reportedId, reason, at }`. Written by the profile overflow sheet's report panel and by the chat focus overlay's report action. **No moderation pipeline yet** — these are just local logs.

### 7.7 Dev seed panel (`components/dev/dev-seed-panel.tsx`)

`__DEV__`-only collapsible panel for stress-testing UI states without driving full flows:

- **Seed friends** — adds `['grover', 'Staceygirl', 'Cindry Chan', 'janey', 'river_codes']` as confirmed friends with gallery+prompt shares open.
- **Seed pending** — writes `['Rain', 'amadabeans', 'mats_nb']` as incoming, `['xXrXx', 'xXrkXx']` as outgoing requests (bypassing the shared-chat gate).
- **Seed top 6** — pins the first 4 seeded friends to slots 1–4.
- **Block Cindry Chan** — exercises blocked state.
- **Restart from welcome** — clears intro + active chat to send the user back to `/`.
- **Clear all friends data** — danger button, wipes everything.

---

## 8. Design System Reference

Source of truth: `constants/theme.ts` + Figma file `y9pR7oN6c889TITEfjuKuA`, node `92:1768`.

### 8.1 Brand spectrum

Eight intentional brand colors running green → cherry:

```
green       #00FF40    teal         #00FFAA    skyBlue      #00E9FF    blue        #0015FF
purple      #5500FF    lightPurple  #C000FF    magenta      #FF00D4    cherry      #FF006A
```

Each prompt color combo (12 in total) is exported from `getPromptColorsForId(id)` — same group id always produces the same combo, so a chat's color is stable across screens and remounts.

### 8.2 Typography

**Manrope** in 6 weights via `@expo-google-fonts/manrope`. `TextStyle` exports H1/H2/H3/H4/Body/BodyBold/Caption/CaptionBold with **letter-spacing converted from Figma's percentage to RN px**:

| Token | Size / LH | Letter spacing |
|---|---|---|
| H1 | 40 / 44 | -2.4 |
| H2 | 32 / 40 | -1.28 |
| H3 | 24 / 32 | -0.96 |
| H4 | 20 / 24 | -0.8 |
| Body / Bold | 16 / 20 | 0 |
| Caption / Bold | 12 / 16 | 0 / -0.24 |

### 8.3 Spacing & radii

```
Spacing: xs=4  sm=8  md=16  lg=24  xl=32  xxl=48
Radius:  xs=4  sm=8  md=12  lg=16  xl=24  xxl=32  full=9999
```

### 8.4 Notable conventions

- **Buttons**: black background, white text, 48 pt height, `Radius.lg` (16).
- **Bottom sheets**: white background, 70%-opacity black overlay, `Radius.xxl` (32) on top corners only.
- **Card shadow**: `0 0 16 rgba(0,0,0,0.08)`.
- **"New!" badge**: green bg + blue text. **Selected pill**: cherry bg.
- **Prompt cards**: brand color bg with sky-blue or green text on dark, black text on light.

---

## 9. Icons Inventory

All icons are **24×24 SVG** in `components/ui/icons/` (and a handful of inline SVGs in feature files). Originating Figma node: `88:3606`.

| File | Used in |
|---|---|
| `add-favorite-icon.tsx` | Friends list heart toggle |
| `add-friends-icon.tsx` | Empty profile (non-friend) state, friends empty state |
| `chat-icon.tsx` | Member rows (chats-joined count) |
| `check-icon.tsx` | Onboarding gender/identity selections |
| `close-icon.tsx` | Auth sheet, bottom sheets, modal previews |
| `dots-icon.tsx` | Profile overflow trigger |
| `edit-icon.tsx` | Profile bio edit affordance |
| `friend-icon.tsx` | Member rows ("Friend" badge), group sheet rows |
| `gif-icon.tsx` | Chat composer |
| `profile-icon.tsx` | Chat header (right) |
| `reply-icon.tsx` | Answer card actions, focus overlay |
| `search-icon.tsx` | Friends header, GIF picker |
| `settings-icon.tsx` | Own profile hero (no-op today) |
| `star-icon.tsx` | Top friends affordance |

**Inline SVGs** (defined locally in their feature files):

| Icon | File | Used for |
|---|---|---|
| `PromptIcon` | `app/chat.tsx` | Chat header (left) — document w/ "?" |
| `LikeIcon` / `LikeFilledIcon` | `app/chat.tsx`, `app/answers.tsx` | Heart outline / filled |
| `WarningIcon` | `components/chat/focus-overlay.tsx` | Report action |
| `NeonStar` | `app/index.tsx` | Welcome screen decoration |

**Asset files**:

- 14× `sym-*.svg` — gender avatar symbols (rendered through `GenderAvatar`).
- `friend-empty-1..6.png` — empty top-friend slot promos.
- `icon-add-friend-circle.png`, `icon-add-friend-plus.png` — friend-CTA art.
- `icon-like.svg`, `icon-like-filled.svg`, `icon-reply.svg` — answer card actions.
- `tutorial-1..3.png` — onboarding intro.
- `face.png`, `flower.png`, `haven_logo_black.png` — welcome screen.
- `google-logo.png` — auth sheet.

**Ionicons used** (from `@expo/vector-icons`): `arrow-forward`, `arrow-back`, `logo-apple`, `call`, `mail`, `chevron-back`, `chevron-down`.

---

## 10. Storage Map (Authoritative)

| Key | Shape | Written by | Read by | Description |
|---|---|---|---|---|
| `@haven/has_seen_intro_v1` | `'1' \| null` | `markIntroSeen()` | Boot router | Onboarding intro completion flag |
| `@haven/active_chat_v1` | `{ chatId: string; joinedAt: number }` | `joinChat()`, `leaveChat()` | `ActiveChatProvider` | Single active chat session, 7-day TTL |
| `@haven/profile_bio_v1` | `string \| null` | `setBio()`, `clearBio()` | `getBio()` (own profile) | Plain-text bio, 150 char max enforced in UI |
| `@haven/profile_gallery_v1` | `(string \| null)[6]` | `setGallery()`, `persistPickedImage()` | `getGallery()`, `MyFriendsPreview` overlay logic | URIs into `${documentDir}/gallery/` |
| `${documentDir}/gallery/*` | Image files | `persistPickedImage()` | `removePersistedImage()` | Actual photo files, named `${ts}-${rand}.${ext}` |
| `@haven/prompt_answers_v1` | `Record<groupId, StoredAnswerCard>` | `setPromptAnswerForGroup()` | `getPromptAnswerForGroup()`, `/answers` self-card | Locked answer per group with author snapshot |
| `@haven/friendships_v1` | `Friendship[]` | `addFriendship()` (on accept), seed | `FriendsProvider` (hydrate, isFriend, getFriendIds) | Confirmed bidirectional friendships |
| `@haven/friend_requests_v1` | `FriendRequest[]` | `sendRequest`, `accept`, `decline`, `cancel`, `cancelPendingFromTo` | `FriendsProvider`, `RequestsCarousel`, `useRelationship` | Append-only request log |
| `@haven/top_friends_v1` | `TopSlot[]` | `setSlot`, `removeFriendFromTopFriends` | `getTopFriends(userId)` (compacts on read) | Up to 6 favorite friends per user |
| `@haven/blocks_v1` | `BlockEntry[]` | `block()`, cascade | `isBlocked()`, `useRelationship` | Directional storage, bidirectional checks |
| `@haven/profile_shares_v1` | `ShareEntry[]` | `share()`, `unshare()`, cascades | `useRelationship`, `MyFriendsPreview`, friend profile gating | Per-`kind` (gallery/prompts) directional permissions |
| `@haven/friend_reports_v1` | `ReportEntry[]` | `reportUser()` (overflow sheet, focus overlay) | `getReports()` — no UI today | Local moderation log |
| *(in-memory)* `pending-connections.ts` | `PendingConnection[]` | `addPendingConnection()` (from `/answers` like) | `popPendingConnections()` on `/chat` mount | Cross-screen handoff for system-connection cards |
| *(in-memory)* `pending-toast.ts` | `string \| null` | `setPendingToast()` | `popPendingToast()` | Cross-screen toast queue |

**Note on `lib/current-user.ts`**: returns hardcoded `{ id: 'me', handle: 'Jane_o_0', pronouns: 'They/them', avatarSymbol: 'pangender' }`. This is the only abstraction over "the logged-in user" today. Phase 8 must replace this with `supabase.auth.getUser()` + a `profiles` row fetch.

---

## 11. Proposed Supabase Schema

A direct translation of the storage map into Postgres, with RLS sketches. All `id` columns are `uuid default gen_random_uuid()` primary keys unless noted. `created_at` defaults to `now()`. Uses `auth.users(id)` from Supabase Auth as the identity anchor.

### 11.1 Core identity

```sql
-- One profile row per auth user. Created at end of onboarding.
create table profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  handle          text unique not null check (length(handle) >= 3 and handle !~ '\s'),
  date_of_birth   date not null,           -- 18+ enforced at signup
  gender_symbol   text not null,           -- one of the 14 enum values
  pronoun_preset  text,                    -- 'he/him' | 'she/her' | 'they/them' | null
  pronouns_custom text,
  out_status      text not null,           -- 'yes' | 'no' | 'sort-of'
  accepting_environment text,              -- only when out_status = 'no'
  identities      text[] not null,         -- multi-select tags
  bio             text,
  lock_pin_hash   text,                    -- bcrypt; null if user skipped
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- RLS:
-- everyone can SELECT (handle/avatar/pronouns are public),
-- only the owner can UPDATE,
-- only authed users can INSERT their own row.
```

### 11.2 Chat

```sql
-- A group chat. Created server-side with a 7-day expiry.
create table chats (
  id          uuid primary key default gen_random_uuid(),
  question    text not null,
  prompt_bg   text not null,               -- hex from PROMPT_COLOR_COMBOS
  prompt_fg   text not null,
  prompt_support text not null,
  open_seats  int not null default 5,
  created_at  timestamptz default now(),
  expires_at  timestamptz not null         -- created_at + 7 days
);

-- Membership row. join_at is the visibility cutoff for messages.
create table chat_members (
  chat_id    uuid references chats(id) on delete cascade,
  user_id    uuid references profiles(id) on delete cascade,
  joined_at  timestamptz default now(),
  left_at    timestamptz,                  -- null = active
  primary key (chat_id, user_id)
);

-- The user's prompt answer for this chat. One per (chat, user).
create table prompt_answers (
  chat_id    uuid references chats(id) on delete cascade,
  user_id    uuid references profiles(id) on delete cascade,
  answer     text not null check (length(answer) <= 300),
  created_at timestamptz default now(),
  primary key (chat_id, user_id)
);

-- Likes from /answers screen — these create "connections" surfaced in chat.
create table answer_likes (
  id          uuid primary key default gen_random_uuid(),
  chat_id     uuid not null,
  liker_id    uuid not null references profiles(id) on delete cascade,
  liked_user_id uuid not null references profiles(id) on delete cascade,
  created_at  timestamptz default now(),
  unique (chat_id, liker_id, liked_user_id),
  foreign key (chat_id, liker_id) references chat_members(chat_id, user_id),
  foreign key (chat_id, liked_user_id) references chat_members(chat_id, user_id)
);

-- Rate-limit table for the "leave 1 chat per day" rule.
create table user_leave_events (
  user_id   uuid references profiles(id) on delete cascade,
  chat_id   uuid references chats(id) on delete cascade,
  left_at   timestamptz default now(),
  primary key (user_id, left_at)
);
create index on user_leave_events (user_id, left_at desc);
```

**Edge functions** (atomic writes — RLS alone is insufficient):

- `join_chat(chat_id)` — inserts `chat_members` row + system message in one transaction.
- `leave_chat(chat_id)` — checks `user_leave_events` for last 24h, updates `chat_members.left_at`, inserts system message, writes `user_leave_events`.

### 11.3 Messages

```sql
create table messages (
  id           uuid primary key default gen_random_uuid(),
  chat_id      uuid not null references chats(id) on delete cascade,
  author_id    uuid references profiles(id) on delete set null,  -- null for system msgs
  body         text,
  gif_url      text,
  gif_title    text,
  gif_aspect   numeric,
  reply_to_id  uuid references messages(id) on delete set null,
  kind         text not null default 'user',   -- 'user' | 'system-join' | 'system-leave' | 'system-connection'
  created_at   timestamptz default now()
);
create index on messages (chat_id, created_at);

create table message_likes (
  message_id uuid references messages(id) on delete cascade,
  user_id    uuid references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (message_id, user_id)
);

-- Moderation. Append-only.
create table message_reports (
  id           uuid primary key default gen_random_uuid(),
  reporter_id  uuid references profiles(id) on delete set null,
  message_id   uuid references messages(id) on delete cascade,
  reason       text,
  created_at   timestamptz default now()
);
```

**RLS for messages**: a user can SELECT messages from a chat where they have a `chat_members` row, **but only those with `created_at >= chat_members.joined_at`** — this is the "new members see history from join_at onward" rule. Encode as a Postgres view or a policy with a join.

```sql
create policy messages_visible_after_join on messages for select using (
  exists (
    select 1 from chat_members m
    where m.chat_id = messages.chat_id
      and m.user_id = auth.uid()
      and messages.created_at >= m.joined_at
  )
);
```

**Realtime**: enable Supabase Realtime on `messages`, `message_likes`, `chat_members`. The chat client subscribes to `chat_id = X`.

### 11.4 Friends

```sql
create table friendships (
  user_a_id  uuid not null references profiles(id) on delete cascade,
  user_b_id  uuid not null references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  shared_chat_id uuid references chats(id) on delete set null,
  check (user_a_id < user_b_id),                -- canonical pair
  primary key (user_a_id, user_b_id)
);

create table friend_requests (
  id            uuid primary key default gen_random_uuid(),
  sender_id     uuid not null references profiles(id) on delete cascade,
  recipient_id  uuid not null references profiles(id) on delete cascade,
  status        text not null default 'pending',  -- 'pending' | 'accepted' | 'declined' | 'cancelled'
  created_at    timestamptz default now(),
  resolved_at   timestamptz,
  shared_chat_id uuid references chats(id),
  unique (sender_id, recipient_id, status) deferrable
);

create table top_friends (
  user_id    uuid references profiles(id) on delete cascade,
  friend_id  uuid references profiles(id) on delete cascade,
  position   int not null check (position between 1 and 6),
  updated_at timestamptz default now(),
  primary key (user_id, friend_id)
);

create table blocks (
  blocker_id uuid references profiles(id) on delete cascade,
  blocked_id uuid references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (blocker_id, blocked_id)
);

create table profile_shares (
  owner_id   uuid references profiles(id) on delete cascade,
  viewer_id  uuid references profiles(id) on delete cascade,
  kind       text not null check (kind in ('gallery', 'prompts')),
  shared_at  timestamptz default now(),
  primary key (owner_id, viewer_id, kind)
);

create table friend_reports (
  id           uuid primary key default gen_random_uuid(),
  reporter_id  uuid references profiles(id),
  reported_id  uuid references profiles(id),
  reason       text,
  created_at   timestamptz default now()
);
```

**Edge functions**:

- `send_friend_request(recipient_id)` — checks shared chat (a row in `chat_members` for both users in the same `chat_id`, even if `left_at` is set), checks not blocked either way, checks no existing pending row, inserts.
- `accept_friend_request(request_id)` — updates row to `accepted` + writes friendship pair (sorted) atomically.
- `block_user(blocked_id)` — runs the 5-step cascade (unfriend, top-friends sweep, unshare both directions, cancel both-direction pending requests, insert block) in one transaction.

### 11.5 Gallery

```sql
-- Metadata table; actual image bytes live in Supabase Storage bucket 'profile-galleries'.
create table profile_gallery (
  user_id    uuid references profiles(id) on delete cascade,
  position   int not null check (position between 1 and 6),
  storage_path text not null,              -- e.g. 'profile-galleries/{user_id}/{ts}-{rand}.jpg'
  uploaded_at timestamptz default now(),
  primary key (user_id, position)
);
```

Storage RLS: read access requires either `auth.uid() = user_id` or a row in `profile_shares (owner_id = user_id, viewer_id = auth.uid(), kind = 'gallery')`.

### 11.6 RLS summary

| Table | Read | Write |
|---|---|---|
| `profiles` | Anyone authed (handle/pronouns/avatar are public). Bio + identities should be public too unless we add granular privacy. | Owner only |
| `chats` | Anyone authed (browse list). | Server only (Edge function) |
| `chat_members` | Members of the chat | `join_chat` / `leave_chat` Edge functions |
| `messages` | Members of the chat **with `created_at >= joined_at`** | Members of the chat (insert), author (update/delete soft) |
| `prompt_answers` | Members of the chat (so the `/answers` deck works) | Owner only |
| `friendships`, `friend_requests`, `top_friends`, `blocks`, `profile_shares` | Either party | Edge functions for the cascade-heavy operations; direct insert for simple ones |
| `profile_gallery` | Owner OR (viewer with a `profile_shares` row) | Owner only |
| Reports | Reporter only | Authed users |

---

## 12. Pre-Backend Gap Analysis

Things that need a screen, a UI fix, or a wiring-up **before** Phase 8 can start cleanly. Roughly ordered by blast radius.

### 12.1 Missing screens

1. **Profile editing** — there is no `/settings` or `/profile/edit` route. After onboarding, a user cannot change pronouns, identities, gender symbol, age, or even their handle. The settings gear on the own-profile hero is a `console.log` no-op. **Required** before backend (otherwise users are stuck with whatever they entered on day 1).
2. **Onboarding draft persistence** — the 7-step form has no autosave. Killing the app between steps loses everything. Needs either AsyncStorage draft writes or a `profile_drafts` table.
3. **Lock screen enforcement** — step 3 collects a 4-digit PIN but nothing actually locks the app on launch or background. Needs an app-state listener + a lock-screen route + Keychain storage.
4. **Unblock UI** — `FriendsProvider.unblockUser` exists but no button calls it. Either add an "unblock" item to the overflow sheet on a blocked profile, or surface a settings list of blocked users.
5. **Friend overflow on the friend list row** — Phase 5 placeholder. Should let users unfriend / block / toggle shares from the row directly, not just from the profile.
6. **Settings screen** — pretty much everything (notifications, privacy, blocked list, sign out, delete account) needs a home.
7. **Pre-expiry warning** — chats end silently in the background tick. Push notification at, say, 1 day and 1 hour remaining. Belongs in Edge functions + Expo push.
8. **Keep-in-touch flow** — the rule says "on chat expiry or voluntary leave, surface a prompt to send friend requests to chat members." There is no such screen today. The `ChatEndedOverlay` just says "people you connected with are saved" — but the connection list is implicit (system-connection cards) and there's nowhere to act on them.
9. **Real-auth wiring** — `handleAuth(provider)` is a stub. Apple + Google require EAS Build (per project memory), so phone+email should land first via Supabase Auth.
10. **Notifications** — none of the rules ("3 days inactivity → friendly warning push; 4 days → removed from chat") have any client-side or server-side wiring. Needs `expo-notifications` setup + push token registration + Edge function cron.

### 12.2 Bugs / inconsistencies worth fixing first

1. **Username availability is hardcoded** to `['jane', 'test', 'admin', 'user', 'haven']`. Replace with a debounced Supabase query before backend.
2. **`lib/current-user.ts` returns `'me'`** — every place that calls `getCurrentUserId()` will need updating once the auth user id is real. Search for `'me'` literals before/after the migration.
3. **Date parsing has no timezone awareness** (`lib/date-input.ts`) — could cause off-by-one-day errors at the date line. Consider storing DOB as a `date` (no time) in Postgres.
4. **`profile_gallery_v1` references local file URIs** — these break if the user migrates devices. Phase 8 needs to upload existing files to Supabase Storage on first sign-in.
5. **Welcome drip messages** in `mock-chat.ts` are scheduled via `setTimeout` — replace with real `messages` rows on the server side.
6. **GIF picker is fully local** — `MOCK_GIFS` has 12 entries. Either keep the curated set as a server-side table, or integrate Giphy/Tenor.
7. **Connection passing via in-memory `pending-connections.ts`** — this is fragile (lost on cold start, lost on background reload). The system-connection cards should derive from `answer_likes` joined on the user's `joined_at`, not from an in-memory queue.
8. **`MOCK_PROMPT_CARDS`** on own profile (3 hardcoded cards) — these need to be derived from real `prompt_answers` history.
9. **System-connection cards** are tilted decorative artifacts in the message list. They need a stable data shape (`messages.kind = 'system-connection'`) and need to render across cold starts.
10. **The "Reply" button in `/answers`** has no handler. Decide whether replying to an answer goes into a thread, sends a DM (no DM system exists), or is just removed.
11. **Block check is bidirectional but the UI only says "Blocked"**, not who initiated it. Consider whether that matters — it might be intentional for safety reasons.
12. **`@haven/profile_bio_v1` tracks one bio for the only-current-user**, but `MyFriendsPreview` has no concept of a friend's bio. Schema should pull bio from `profiles.bio`, not AsyncStorage.

### 12.3 Things the architecture handles well

Worth noting so they don't get refactored away:

- **Single source of truth for relationships** via `useRelationship()`. Keep this hook — it should just swap its data source from context to a Supabase query.
- **Compaction on read** for top friends. Mirrors well to a Postgres `ORDER BY position` query.
- **Chat-membership-then-join_at visibility rule** is already encoded in the `ActiveChatProvider`. Backend RLS just needs to mirror it.
- **Custom SVG icon library** — keeps everything crisp on every density and lets color be controlled via props. Keep it.
- **Determinism in prompt colors** (`getPromptColorsForId(id)`) — colors stay stable across screens and remounts. Keep it.
- **Animated splash + cross-fade onboarding transitions** are part of the brand. Keep them.

---

## 13. Screens Index (Quick Reference)

| Route | File | Purpose |
|---|---|---|
| `/` | `app/index.tsx` | Welcome + auth sheet + boot router |
| `/onboarding` | `app/onboarding/index.tsx` | 7-step form |
| `/onboarding/intro` | `app/onboarding/intro.tsx` | 3-slide tutorial |
| `/(tabs)/chat-selection` | `app/(tabs)/chat-selection.tsx` | Group cards list |
| `/(tabs)/explore` | `app/(tabs)/explore.tsx` | Scaffolding only |
| `/prompt` | `app/prompt.tsx` | Compose prompt answer |
| `/answers` | `app/answers.tsx` | Browse other answers + like |
| `/chat` | `app/chat.tsx` | Live chat room |
| `/profile` | `app/profile/index.tsx` | Own profile |
| `/profile/[username]` | `app/profile/[username].tsx` | Friend profile |
| `/photos` | `app/photos.tsx` | Fullscreen gallery viewer |
| `/friends` | `app/friends/index.tsx` | Friends + requests |
| `/modal` | `app/modal.tsx` | Stock Expo Router modal scaffold (unused) |

---

## 14. Phase 8 Suggested Order

Once Supabase is added:

1. **Auth (email + phone first)** — replace `handleAuth` stub, store session, switch `lib/current-user.ts` to `supabase.auth.getUser()`.
2. **Profiles table + onboarding write** — `finish()` in onboarding posts to `profiles`; bio + gallery migration too.
3. **Chats + chat_members + prompt_answers** — wire `chat-selection`, `/prompt`, `/answers`, `joinChat()`.
4. **Messages + Realtime** — replace mock messages with a subscription; encode the `joined_at` visibility rule in RLS.
5. **Friend requests + friendships + blocks** — Edge functions for cascades; switch `useRelationship` to a server query.
6. **Profile shares + gallery storage** — Supabase Storage bucket + RLS, gallery upload + URL signing.
7. **Edge functions for join/leave/block** + the 24h leave rate-limit check.
8. **Notifications + cron** — 3-day warning, 4-day removal, expiry warnings.
9. **Apple + Google auth** (requires EAS Build).
10. **Delete leftover mocks** — `mock-friends`, `mock-chat`, `mock-gifs`, `mock-friend-content`, `mock-groups`. Keep the design tokens.
