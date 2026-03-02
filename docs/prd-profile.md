# Settings Menu — Product Requirements Document

**Version:** 1.0
**Author:** Product
**Status:** Draft
**Last Updated:** 2026-02-27

---

## Overview

The Settings Menu is the central place where users control their identity, privacy, and notification preferences within the chat app. Users access it from the sidebar icon and expect their choices to be immediately saved and reflected across all their devices.

The current Settings page exists but several sections are either placeholder ("coming soon") or visually present but not actually saving. This PRD defines what each section should do, the user experience expected, and the edge cases to handle.

---

## Goals

1. Users can confidently personalize how they appear to others
2. Users control what information about them is visible (presence, read receipts, photo)
3. Users are notified of new messages even when the app tab is not active
4. Every setting saves immediately — no "Save" button required (except password change)
5. Settings persist across sessions and devices

---

## What's Covered in Settings

The Settings menu is organized into four sections:

```
Settings
├── Profile
│   ├── Display Name
│   ├── Avatar / Profile Photo
│   ├── Profile Photo Visibility
│   └── Change Password
├── Privacy
│   ├── Who can see my online status
│   ├── Show when I'm online (presence toggle)
│   └── Send read receipts
├── Notifications
│   └── Push notifications for new messages
└── Account
    ├── Account info (email, username — read only)
    └── Log out
```

**Out of scope for this version:**

- Appearance / theme (dark mode, font size)
- Blocked users management
- Two-factor authentication
- Linked devices management
- Data export / account deletion

---

## Section 1 — Profile

### What it does

Users can update how they appear to other users: their name, photo, and who can view their photo.

### User Stories

- **US-P1:** As a user, I want to change my display name so that my contacts recognize me by a preferred name
- **US-P2:** As a user, I want to update my profile photo so that I have a visual identity in the app
- **US-P3:** As a user, I want to control who can see my profile photo so that I have privacy over my image
- **US-P4:** As a user, I want to change my password from within the app so that I can keep my account secure without needing to log out and use a "Forgot Password" flow

### Behaviors

**Display Name**

- Tap "Edit Profile" → modal opens with current name pre-filled
- Changes save when user confirms the modal
- Name is immediately reflected in sidebar, chat headers, and other users' contact lists

**Profile Photo**

- User can provide a photo URL or clear the existing photo
- If no photo is set, the app shows the user's initials as a fallback avatar
- Photo change is immediately visible to the user; other users see the change on next page load

**Profile Photo Visibility**

- Dropdown with three options: Everyone / My Contacts / Nobody
- Selection saves immediately (no Save button needed)
- "Nobody" means other users see the initials fallback instead of the photo
- "My Contacts" is shown as an option for future use — for now it behaves identically to "Everyone"

**Change Password**

- Accessed via a button "Change Password" in the Profile section
- Opens a modal with three fields: Current Password, New Password, Confirm New Password
- All three fields are required
- Modal has Cancel and Save buttons

### Edge Cases

| Scenario | Expected Behavior |
|---|---|
| User submits display name with only spaces | Reject — show inline error "Name cannot be empty" |
| Display name exceeds 100 characters | Reject — show character counter turning red, block submit |
| Avatar URL is not a valid image link | Save the URL but show a broken image fallback; don't block save |
| User clears the avatar field | Remove the photo; show initials fallback |
| Current password is wrong | Show error "Current password is incorrect" — do not close modal |
| New password and Confirm don't match | Show error "Passwords do not match" — disable Save |
| New password is too short (under 8 characters) | Show inline error "Password must be at least 8 characters" |
| New password is the same as the current one | Allow it — no restriction |
| User closes Change Password modal mid-fill | Discard all changes, no save |
| Network error while saving any profile field | Show toast "Failed to save. Please try again." — revert optimistic UI |

---

## Section 2 — Privacy

### What it does

Users control what behavioral signals they share with others: whether their online status is visible, and whether others know when they've read a message.

### User Stories

- **US-V1:** As a user, I want to choose who sees when I'm online so that I have control over my availability
- **US-V2:** As a user, I want to turn off my online status entirely so that I can use the app without being seen as available
- **US-V3:** As a user, I want to disable read receipts so that others don't know the exact moment I read their message

### Behaviors

**Who Can See My Online Status** (Presence Sharing)

- Dropdown: Everyone / My Contacts / Nobody
- "Nobody" means the user appears permanently offline to others, even while actively using the app
- "My Contacts" is future-ready; behaves like "Everyone" for now
- Saves immediately on selection change

**Show When I'm Online** (Presence Enabled Toggle)

- On/Off toggle — default On
- When Off: user's online indicator is hidden from everyone, regardless of the "Who Can See" setting above
- When Off: the "Who Can See My Online Status" dropdown becomes grayed out (irrelevant)
- Saves immediately on toggle

**Send Read Receipts** (Read Receipts Toggle)

- On/Off toggle — default On
- When Off: the user still sees read receipts from others, but does not send them
- When Off: message senders only see "Delivered", never "Read" for this user's messages
- Saves immediately on toggle

### Edge Cases

| Scenario | Expected Behavior |
|---|---|
| User turns off Presence Enabled | "Who Can See" dropdown grays out; label explains it's disabled |
| User turns off Read Receipts mid-conversation | Existing already-sent receipts are not retracted; only future reads are affected |
| User's privacy settings fail to load (network error) | Show skeleton loaders; show error state with retry option — do not show default values that might mislead |
| User rapidly toggles Read Receipts on/off | Debounce — only save the final state after 500ms of inactivity |
| Two sessions: user changes privacy on mobile, opens desktop | Desktop reflects the saved setting on next page load; no real-time sync required |

---

## Section 3 — Notifications

### What it does

Users can opt into browser push notifications so they receive alerts for new messages even when the app tab is inactive or the browser is minimized.

### User Stories

- **US-N1:** As a user, I want to receive a notification when I get a new message while the app is in the background so that I don't miss important conversations
- **US-N2:** As a user, I want to turn off push notifications without affecting anything else so that I can have a quiet session when needed
- **US-N3:** As a user, I want the notification to show me who sent it and a preview of the message so that I can decide whether to switch back to the app

### Behaviors

**Enabling Push Notifications**

- Toggle labeled "Push Notifications" — default Off
- When user turns On: browser shows the OS permission dialog ("Allow notifications from this site?")
- If permission is granted: toggle stays On, preference is saved, notifications are active immediately
- If permission is denied by the user: toggle reverts to Off, show inline message: "Notifications were blocked. You can enable them in your browser settings."
- If permission was previously denied (browser blocked): skip the OS dialog (browser won't show it again); show a message guiding them to browser settings

**Notification Content**

- Notification title: sender's display name
- Notification body: first 80 characters of the message
- Notification icon: sender's avatar (or app icon fallback)
- Clicking the notification: brings the app tab into focus and opens the relevant conversation

**Disabling Push Notifications**

- Toggle Off: preference saved, no more push notifications sent
- The existing browser permission remains (user is not asked again)

### Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Browser does not support push notifications (e.g. Safari iOS < 16.4) | Toggle is hidden or grayed out with label "Not supported on this browser" |
| User grants permission then revokes it in browser settings | App cannot detect this immediately; next push attempt will fail silently; toggle should revert to Off on next page load |
| User has app open in two tabs | Notification still fires; clicking it focuses the already-open tab |
| Message is from a muted conversation | Still send the push notification (mute is a future feature) |
| User receives a message while in a different conversation | Notification fires; clicking it navigates to the sender's conversation |
| User receives a message while already in that conversation | Do not fire a push notification |
| Long message content in notification | Truncate body at 80 characters with ellipsis |
| Notification preference fails to save (network error) | Toggle reverts to previous state; show toast "Failed to save" |

---

## Section 4 — Account

### What it does

Displays the user's account identity and provides a way to log out.

### User Stories

- **US-A1:** As a user, I want to see my email and username in settings so that I can confirm which account I'm logged into
- **US-A2:** As a user, I want to log out so that I can switch accounts or end my session securely

### Behaviors

**Account Info**

- Display: Email address (read only), Username (read only)
- These fields are not editable — username and email are fixed at registration
- Display Name is editable but lives in the Profile section

**Logout**

- Single button: "Log Out"
- No confirmation dialog — action is immediately executed
- On logout: user is redirected to the Login page
- On logout: push notification subscription is cleared (no more notifications for this session)
- On logout: all local session data is cleared

### Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Logout fails (network error) | Show toast "Logout failed. Try again." — keep user logged in locally |
| User is logged out on another device while settings is open | Next API call fails with 401; redirect to login page |

---

## Success Criteria

A setting is considered "done" when:

1. The value the user selects is reflected correctly after a full page refresh
2. The value is consistent across different devices (desktop + mobile browser)
3. The setting actually affects behavior (e.g. read receipts off = no receipts sent)
4. Error states are handled gracefully — nothing silently fails
5. No setting requires a "Save" button (except Change Password which is a multi-field form)

---

## Non-Goals (Explicit Out of Scope)

- Appearance / Dark mode
- Notification sound customization
- Per-conversation notification mute
- Blocking users
- 2FA / security keys
- Account deletion
- Email change
