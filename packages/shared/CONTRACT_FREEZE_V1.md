# Contract Freeze v1 - User Settings Shared Schemas

> **Status**: FROZEN  
> **Version**: v1.0.0  
> **Date**: 2026-03-02  
> **Owner**: Agent-1 (Foundation)  

This document defines the canonical shared Zod schemas for the User Settings feature (FEAT-013). These contracts serve as the single source of truth for both frontend and backend implementations.

---

## Schema Files

- `packages/shared/src/schemas/settings.ts` - Main schema definitions
- `packages/shared/src/schemas/settings.test.ts` - TDD test suite
- `packages/shared/src/index.ts` - Public exports

---

## Schemas Overview

### 1. Profile Settings

#### `profilePhotoVisibilitySchema`
```typescript
z.enum(['everyone', 'contacts', 'nobody'])
```
| Value | Description |
|-------|-------------|
| `everyone` | Anyone can see the profile photo |
| `contacts` | Only contacts can see the profile photo |
| `nobody` | Profile photo is hidden from everyone |

#### `profileSettingsSchema`
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `displayName` | string | Yes | Min 1, Max 100, trim whitespace, not spaces-only |
| `avatarUrl` | string \| null | Yes | Max 500 chars, valid URL format, nullable |
| `profilePhotoVisibility` | ProfilePhotoVisibility | Yes | One of: everyone, contacts, nobody |

#### `updateProfileSettingsSchema`
- Partial version of `profileSettingsSchema` for PATCH requests
- All fields optional
- Validates provided fields with same rules

---

### 2. Privacy Settings

#### `presenceSharingSchema`
- Re-exported from `presence.ts`
- Values: `['everyone', 'contacts', 'nobody']`

#### `privacySettingsSchema`
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `presenceEnabled` | boolean | Yes | Whether user shows online status |
| `presenceSharing` | PresenceSharing | Yes | Who can see online status |
| `readReceiptsEnabled` | boolean | Yes | Whether to send read receipts |

#### `updatePrivacySettingsSchema`
- Partial version for PATCH requests
- All fields optional

---

### 3. Notification Settings

#### `notificationSettingsSchema`
| Field | Type | Required |
|-------|------|----------|
| `pushNotificationsEnabled` | boolean | Yes |

#### `updateNotificationSettingsSchema`
- Partial version for PATCH requests

---

### 4. Combined Settings Response

#### `settingsResponseSchema`
Used for `GET /api/settings` response.

| Field | Type | Section | Notes |
|-------|------|---------|-------|
| `displayName` | string | Profile | |
| `avatarUrl` | string \| null | Profile | |
| `profilePhotoVisibility` | ProfilePhotoVisibility | Profile | |
| `presenceEnabled` | boolean | Privacy | |
| `presenceSharing` | PresenceSharing | Privacy | |
| `readReceiptsEnabled` | boolean | Privacy | |
| `pushNotificationsEnabled` | boolean | Notifications | |
| `email` | string (email) | Account | Read-only |
| `username` | string | Account | Read-only |

---

### 5. Change Password

#### `changePasswordSchema`
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `currentPassword` | string | Yes | Min 1 char |
| `newPassword` | string | Yes | Min 8, Max 100, uppercase, lowercase, number |
| `confirmPassword` | string | Yes | Min 1 char |

**Cross-field validation**: `newPassword` must equal `confirmPassword`

---

### 6. Push Subscription

#### `pushSubscriptionSchema`
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `endpoint` | string | Yes | Valid URL, Max 500 chars |
| `p256dhKey` | string | Yes | Min 1 char |
| `authKey` | string | Yes | Min 1 char |

---

### 7. Error Schemas

#### `apiFieldErrorSchema`
| Field | Type | Description |
|-------|------|-------------|
| `field` | string | Field name that caused error |
| `message` | string | Human-readable error message |

#### `apiErrorResponseSchema`
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `statusCode` | number | Yes | Positive integer HTTP status |
| `message` | string | Yes | General error message |
| `errors` | ApiFieldError[] | Optional | Array of field-level errors |

---

## TypeScript Type Exports

All schemas export corresponding TypeScript types:

```typescript
// Profile
export type ProfilePhotoVisibility = 'everyone' | 'contacts' | 'nobody';
export type ProfileSettings = { displayName: string; avatarUrl: string | null; profilePhotoVisibility: ProfilePhotoVisibility; };
export type UpdateProfileSettings = Partial<ProfileSettings>;

// Privacy
export type PresenceSharing = 'everyone' | 'contacts' | 'nobody';
export type PrivacySettings = { presenceEnabled: boolean; presenceSharing: PresenceSharing; readReceiptsEnabled: boolean; };
export type UpdatePrivacySettings = Partial<PrivacySettings>;

// Notifications
export type NotificationSettings = { pushNotificationsEnabled: boolean; };
export type UpdateNotificationSettings = Partial<NotificationSettings>;

// Combined
export type SettingsResponse = ProfileSettings & PrivacySettings & NotificationSettings & { email: string; username: string; };

// Other
export type ChangePasswordInput = { currentPassword: string; newPassword: string; confirmPassword: string; };
export type PushSubscriptionInput = { endpoint: string; p256dhKey: string; authKey: string; };
export type ApiFieldError = { field: string; message: string; };
export type ApiErrorResponse = { statusCode: number; message: string; errors?: ApiFieldError[]; };
```

---

## Endpoint Payload Mapping

| Endpoint | Request Schema | Response Schema |
|----------|---------------|-----------------|
| `GET /api/settings` | - | `settingsResponseSchema` |
| `PATCH /api/settings/profile` | `updateProfileSettingsSchema` | `profileSettingsSchema` |
| `PATCH /api/settings/privacy` | `updatePrivacySettingsSchema` | `privacySettingsSchema` |
| `PATCH /api/settings/notifications` | `updateNotificationSettingsSchema` | `notificationSettingsSchema` |
| `POST /api/auth/change-password` | `changePasswordSchema` | `{ message: string }` |
| `POST /api/settings/push-subscription` | `pushSubscriptionSchema` | `{ success: boolean }` |

---

## Error Response Shape

All validation errors return this structure:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    { "field": "displayName", "message": "Display name cannot be empty" },
    { "field": "avatarUrl", "message": "Avatar URL must be at most 500 characters" }
  ]
}
```

For single-field errors:
```json
{
  "statusCode": 401,
  "message": "Current password is incorrect"
}
```

---

## Breaking Changes Policy

- **v1.0.0**: Initial freeze
- **v1.x.x**: Additive changes only (new optional fields)
- **v2.0.0**: Requires coordination with Agent-2 and Agent-3

Any contract changes require:
1. Version bump in this document
2. Acknowledgment from all agents
3. Test updates in `settings.test.ts`
4. Typecheck confirmation

---

## Test Coverage

- **64 tests** covering all schemas
- Edge cases for display name whitespace trimming
- Password confirmation refinement
- URL length validation
- Enum value validation
- Type inference verification

Run tests: `cd packages/shared && bun test src/schemas/settings.test.ts`

---

## Dependencies

- `zod` ^4.3.6 - Schema validation
- Reuses `presenceSharingSchema` from `presence.ts`

---

## Change Log

### v1.0.0 (2026-03-02)
- Initial contract freeze
- Profile, Privacy, Notification schemas
- Change password with confirmation refinement
- Push subscription schema
- Error response schemas
- Aligned `presenceSharingSchema` enum to use `'contacts'` instead of `'friends'` per RFC
