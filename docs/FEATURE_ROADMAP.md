# BHI App - Feature Roadmap

---

**CONFIDENTIAL & PROPRIETARY**

© 2026 Eddie Yakubovich / Maximus Digital Marketing. All rights reserved.

This document contains confidential and proprietary information. Unauthorized reproduction, distribution, or disclosure is strictly prohibited and may result in legal action.

---

This document outlines planned features and enhancements for the BHI App. Each feature includes a description, considerations, and open questions to discuss.

---

## Table of Contents

1. [User Authentication & Roles](#1-user-authentication--roles)
2. [Search Functionality](#2-search-functionality)
3. [Bookmarks Persistence](#3-bookmarks-persistence)
4. [Recently Viewed Resources](#4-recently-viewed-resources)
5. [Print/Export Lab Results](#5-printexport-lab-results)
6. [Lab Result History](#6-lab-result-history)
7. [Reference Ranges Display](#7-reference-ranges-display)
8. [Resource Ratings/Feedback](#8-resource-ratingsfeedback)
9. [Related Resources](#9-related-resources)
10. [Rename Tags to Categories](#10-rename-tags-to-categories)
11. [Bulk Import/Export](#11-bulk-importexport)
12. [Analytics Dashboard](#12-analytics-dashboard)
13. [Draft/Publish Workflow](#13-draftpublish-workflow)
14. [Duplicate Detection](#14-duplicate-detection)
15. [Email Notifications](#15-email-notifications)
16. [Progress Tracking](#16-progress-tracking)
17. [Notes Feature](#17-notes-feature)

---

## 1. User Authentication & Roles

### Description
Implement a login system with different user roles that control access to features.

### Status: COMPLETED ✓

### Technical Implementation
**Authentication Service:** Supabase Auth (integrated with existing Supabase database)

### User Roles

| Role | Permissions |
|------|-------------|
| **User** | View resources, enter lab results, manage own profile, bookmark resources |
| **Admin** | All User permissions + manage resources, types, markers, categories, criteria |
| **Super Admin** | All Admin permissions + manage users, set reference ranges, access analytics, system configuration |

### Registration & Login

| Setting | Decision |
|---------|----------|
| **Registration** | Both self-registration AND admin invitations supported |
| **Login method** | Email/password only (username can be used instead of email) |
| **Required at signup** | Email (or username), name, password |
| **Email verification** | Not required |
| **Password requirements** | Minimum 6 characters, must include: uppercase, lowercase, and number |
| **Session timeout** | Auto-logout after 30 minutes of inactivity |
| **Password reset** | Standard "forgot password" email flow |

### Role Management

| Rule | Details |
|------|---------|
| **First Super Admin** | Created directly in database during initial setup |
| **Creating new Super Admins** | Only Super Admins can create other Super Admins |
| **Creating Admins** | Super Admins can create Admins |
| **Minimum Super Admins** | System prevents deleting the last Super Admin |
| **Account deletion protection** | A user's account can only be deleted by themselves (self-delete) |

### Implementation Status
✓ Set up Supabase Auth configuration
✓ Create users table with role field (profiles table)
✓ Build login page
✓ Build registration page (signup)
✓ Build forgot password flow (Supabase default)
✓ Create role-based access control (protect Admin routes)
⏳ Implement session timeout (30 min) - scaffolded, needs testing
⏳ Build user management page (Super Admin only) - planned next
✓ Seed first Super Admin account - can be done manually

---

## 2. Search Functionality

### Description
Global search capability across all pages to quickly find resources, lab markers, or categories.

### Status: PARTIALLY COMPLETED ✓

**Current Implementation:** Resource search is fully implemented on the Resources page.

### Current Behavior
- Search box in Resources page filters by keyword
- Searches across resource titles and descriptions
- Real-time filtering (instant as-you-type)
- Works alongside type and category filters

### Future Enhancement
- Global search bar in header
- Keyboard shortcut (Ctrl+K)
- Search lab markers and categories
- Search results page with grouped results

---

## 3. Bookmarks Persistence

### Description
Save bookmarked resources to the database instead of localStorage, so bookmarks persist across devices.

### Status: PARTIALLY COMPLETED ✓

**Current Implementation:** Users can bookmark resources and bookmarks are stored in localStorage (browser storage). 

**Next Phase:** Move bookmarks to database for cross-device sync (requires database schema update and API changes).

### Current Behavior
- Resources can be bookmarked from Resources page or resource details modal
- Bookmarks are persisted in browser localStorage
- Bookmark count displayed on dashboard
- Visual feedback (star icon) shows bookmarked status

### Future Enhancement (Next Phase)
- Sync bookmarks to database for cross-device access
- Bookmark organization/folders
- Limits on number of bookmarks

---

## 4. Recently Viewed Resources

### Description
Track and display resources the user has recently accessed.

### Status: COMPLETED ✓

### Current Implementation
- Dashboard displays recently viewed resources when user has not entered lab results yet
- Shows up to 3 recent resources as cards
- Displays resource type, title, and quick action buttons

### Usage
- View on Home (Dashboard) tab
- Click "Continue Reading" to revisit a resource

---### Open Questions
1. How many recent items to show?
2. Should viewing history be optional (privacy setting)?

---

## 5. Print/Export Lab Results

### Description
Allow users to generate a printable summary of their entered lab results.

### Critical Disclaimer
**The export must clearly state that this is user-entered data, not results analyzed or validated by the application.**

### Proposed Behavior
- "Export" or "Print" button on Lab Results page
- Generates a PDF or printable view containing:
  - User's name and date
  - List of entered lab values with dates
  - **Prominent disclaimer** that data was entered by the user
- No interpretation or recommendations included in export

### Considerations
- PDF generation library needed (e.g., jsPDF, react-pdf)
- Header/footer with BHI branding?
- Include date each result was entered?

### Open Questions
1. PDF download vs. print-friendly page view?
2. Should users select which results to include, or export all?
3. Exact disclaimer wording to use?

---

## 6. Lab Result History

### Description
Track lab results over time and optionally show trends.

### Status: COMPLETED ✓

### Current Implementation
- Lab results include date tracking (entry date shown)
- History view shows all past values for a marker
- Users can filter by marker and view detailed history table
- Color-coded status indicators (green for normal, red for outside range)
- Results sorted by date, most recent first
- Users can delete individual historical entries

### Usage
- Go to Lab Results tab
- Select a specific marker to view its full history
- See date, value, unit, and normal range
- Delete individual results with delete button

### Future Enhancement
- Optional trend charts (e.g., Recharts library)
- Export history to PDF

---

## 7. Reference Ranges Display

### Description
Show normal/optimal reference ranges alongside lab values.

### Proposed Behavior
- When entering or viewing a lab result, show the reference range
- Visual indicator if value is low/normal/high
- Reference ranges managed by Super Admin

### Super Admin Configuration
New admin section to set reference ranges per marker:
- Marker name
- Low threshold
- High threshold
- Optimal range (optional)
- Notes/source

### Considerations
- Reference ranges can vary by age, sex, lab - how to handle?
- Display only, not diagnostic
- Disclaimer that ranges are general guidelines

### Open Questions
1. Should ranges vary by user demographics (age, sex)?
2. Where do reference ranges come from? (Standard medical references?)
3. How to handle markers with no defined range?

---

## 8. Resource Ratings/Feedback

### Description
Allow users to rate resources and provide feedback on helpfulness.

### Proposed Behavior
- Rating system (e.g., 1-5 stars, or thumbs up/down)
- Optional text feedback
- Average rating displayed on resource cards
- Admin can view feedback

### Considerations
- Anonymous or tied to user account?
- Can users change their rating?
- How to handle low-rated resources?

### Open Questions
1. Star rating (1-5) or simple helpful/not helpful?
2. Should ratings affect resource visibility or recommendations?
3. Can admins respond to feedback?

---

## 9. Related Resources

### Description
Show "related resources" suggestions based on similarity.

### Proposed Matching Logic
Resources are considered related if they share:
- Categories (most weight)
- Resource type
- Keywords in title/description

### Proposed Behavior
- "Related Resources" section on resource detail view
- Show 3-5 related items
- Click to navigate to related resource

### Considerations
- Algorithm for calculating similarity
- Performance if many resources exist
- Avoid showing the same resource

### Open Questions
1. How many related resources to show?
2. Should related resources be manually curated or auto-generated?
3. What weight to give each matching factor?

---

## 10. Rename Tags to Categories

### Description
Change all references from "Tags" to "Categories" throughout the application for clarity.

### Status: COMPLETED ✓

### Completed Changes
- UI labels:
  - Admin tab: "Tags" → "Categories"
  - Filter labels: "Tag" → "Category"
  - Resource cards: Updated to show "Categories"
  - Profile page: Updated health insights references
- Documentation: USER_GUIDE updated
- Database field names: Kept as "tags" (no migration needed)
- Code references: Maintained for backward compatibility

### Implementation Notes
- Database remains unchanged (tags column)
- Backend API continues to use existing structure
- Frontend UI updated for user clarity
2. Any other terminology to standardize?

---

## 11. Bulk Import/Export

### Description
Allow admins to import and export data via CSV files.

### Supported Data Types
- Resources
- Categories
- Lab Markers
- Logic Rules (Criteria)

### Proposed Behavior
**Export:**
- Download button per data type
- Generates CSV with all records
- Includes all fields

**Import:**
- Upload CSV file
- Validate format and required fields
- Preview before confirming
- Report errors/successes

### Considerations
- CSV format specification needed
- How to handle duplicates on import?
- Validation rules

### Open Questions
1. What fields are required vs. optional for each type?
2. Should import overwrite existing records or skip duplicates?
3. Maximum file size/record count?

---

## 12. Analytics Dashboard

### Description
Admin dashboard showing platform usage statistics.

### Included Metrics
- **Resource Analytics:**
  - Most viewed resources
  - Resources by type
  - Resources by category
  - Recently added resources

- **User Activity (aggregate only):**
  - Total registered users
  - Active users (last 7/30 days)
  - New registrations over time

### Excluded (Privacy)
- Individual user lab results
- Personal health data
- Individual viewing history

### Considerations
- Data aggregation for privacy
- Time period filters (week, month, year)
- Export analytics data?

### Open Questions
1. What time periods to support?
2. Who can access analytics? (Admin, Super Admin only?)
3. Refresh frequency (real-time, daily, etc.)?

---

## 13. Draft/Publish Workflow

### Description
Allow resources to be saved as drafts before publishing to users.

### Proposed Statuses
| Status | Visibility |
|--------|------------|
| **Draft** | Admins only |
| **Published** | All users |
| **Archived** | Hidden, but retained |

### Proposed Behavior
- New resources default to Draft
- "Publish" button to make visible to users
- "Unpublish" to return to Draft
- "Archive" to hide without deleting
- Filter by status in admin view

### Considerations
- Status field added to resources table
- UI changes to show status badges
- Scheduled publishing? (future date)

### Open Questions
1. Should there be an approval workflow (submit for review)?
2. Notify admins when drafts are ready for review?
3. Archive vs. Delete - what's the difference in retention?

---

## 14. Duplicate Detection

### Description
Warn admins when creating content that may duplicate existing entries.

### Duplicate Criteria

**Resources are potential duplicates if:**
- Exact title match
- Very similar title (e.g., 90% similarity)
- Same URL

**Lab Markers are duplicates if:**
- Same name (case-insensitive)

**Categories are duplicates if:**
- Same name (case-insensitive)

**Criteria/Rules are duplicates if:**
- Same marker + overlapping value range + same category

### Proposed Behavior
- Check for duplicates when creating/saving
- Show warning with link to potential duplicate
- Allow user to proceed anyway or cancel

### Considerations
- Similarity algorithm for titles (Levenshtein distance?)
- Performance with large datasets
- False positives - should be warning, not blocker

### Open Questions
1. What similarity threshold for "similar" titles?
2. Block creation or just warn?
3. Should duplicate check run on edit as well as create?

---

## 15. Email Notifications

### Description
Optional email notifications for users about relevant updates.

### Notification Types
- New resources matching user's categories
- Weekly digest of new content
- (Future) Account-related notifications

### Proposed Behavior
- Users opt-in via Profile settings
- Frequency options: immediate, daily digest, weekly digest, none
- Unsubscribe link in every email

### Considerations
- Email service integration (SendGrid, AWS SES, etc.)
- Email templates
- GDPR/CAN-SPAM compliance
- Bounce/complaint handling

### Open Questions
1. Which email service to use?
2. What triggers an "immediate" notification vs. digest?
3. Should admins be able to send announcements?

---

## 16. Progress Tracking

### Description
Show users their progress exploring the resource library.

### Proposed Metrics
- Resources viewed: X of Y total
- Percentage of library explored
- Resources viewed per category
- Streak (days in a row with activity)?

### Proposed Behavior
- Progress displayed on dashboard
- Visual progress bar or chart
- Milestone celebrations? (e.g., "You've viewed 50 resources!")

### Considerations
- What counts as "viewed"? (Clicked, or spent time?)
- Reset progress option?
- Gamification elements?

### Open Questions
1. Is progress per-user or can it be seen by admins?
2. Should there be achievements/badges?
3. How to handle new resources added (progress percentage drops)?

---

## 17. Notes Feature

### Description
Allow users to add personal notes to resources or lab results.

### Proposed Behavior
- "Add Note" option on any resource or lab result
- Notes are private to the user
- View/edit/delete notes
- Notes visible when viewing the associated item

### Considerations
- Maximum note length?
- Rich text or plain text?
- Search within notes?

### Open Questions
1. Should notes be plain text or support formatting?
2. Export notes with lab results?
3. Attach notes to specific resources, lab results, or both?

---

## Implementation Priority

*To be discussed and determined based on business needs.*

| Priority | Feature |
|----------|---------|
| High | User Authentication & Roles |
| High | Rename Tags to Categories |
| High | Bookmarks Persistence |
| Medium | Search Functionality |
| Medium | Reference Ranges Display |
| Medium | Lab Result History |
| Medium | Print/Export Lab Results |
| Medium | Draft/Publish Workflow |
| Low | Related Resources |
| Low | Resource Ratings |
| Low | Analytics Dashboard |
| Low | Bulk Import/Export |
| Low | Email Notifications |
| Low | Progress Tracking |
| Low | Notes Feature |
| Low | Duplicate Detection |

---

## Next Steps

1. Review this document and answer open questions
2. Prioritize features based on user needs
3. Create detailed specifications for high-priority items
4. Begin implementation in priority order

---

*Document Version: 2.0*
*Last Updated: February 3, 2026*

---

## Recent Updates (February 2026)

### UI/UX Improvements
- **Resource URL Display:** Updated all resource URL displays to show "Visit Site" link instead of full URL text
  - Prevents layout breaking from long URLs
  - Applied across ResourceModal, Admin panels, and ResourcesPage
  - Clean, professional link display

### Expert Team Analysis Completed
- **Comprehensive Review:** 4-specialist team provided 28 recommendations across UX, Performance, Security, and Product Strategy
- **See:** `IMPROVEMENT_ROADMAP.md` for full strategic roadmap
- **Key Recommendations:**
  - UX: Guided onboarding, smart lab entry, resource personalization, mobile design
  - Performance: Code splitting, smart caching, database optimization
  - Security: RLS enforcement, API key rotation, audit logging, HIPAA/GDPR compliance
  - Features: Longitudinal dashboard, AI recommendations, expert consultation marketplace, wearables integration

### Next Priority Features (Recommended Order)
1. **Guided Onboarding Flow** - Interactive 3-4 step wizard (+25-35% adoption)
2. **Streamlined Lab Entry** - Quick-action buttons, visual status indicators (+40-50% frequency)
3. **Mobile-First Responsive Design** - Support 60%+ mobile users
4. **Longitudinal Health Dashboard** - Trend visualization, progress tracking (+40% dwell time)
5. **Expert Consultation Marketplace** - High-value monetization (+40% retention)

---

**© 2026 Eddie Yakubovich / Maximus Digital Marketing. All rights reserved. Confidential.**
