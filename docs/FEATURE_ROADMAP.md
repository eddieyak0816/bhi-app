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

### Status: DECISIONS MADE ✓

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

### Implementation Tasks
1. Set up Supabase Auth configuration
2. Create users table with role field
3. Build login page
4. Build registration page
5. Build forgot password flow
6. Implement session timeout (30 min)
7. Create role-based access control (protect Admin routes)
8. Build user management page (Super Admin only)
9. Seed first Super Admin account

---

## 2. Search Functionality

### Description
Global search capability across all pages to quickly find resources, lab markers, or categories.

### Proposed Behavior
- Search bar in the header, visible on all pages
- Searches across:
  - Resource titles and descriptions
  - Category names
  - Lab marker names
- Results grouped by type (Resources, Markers, Categories)
- Keyboard shortcut to focus search (e.g., Ctrl+K or /)

### Considerations
- Should search be instant (as-you-type) or require Enter?
- Minimum character requirement before searching?
- How to handle no results?

### Open Questions
1. Should search results link directly to items, or show a results page?
2. Include search history/recent searches?

---

## 3. Bookmarks Persistence

### Description
Save bookmarked resources to the database instead of localStorage, so bookmarks persist across devices.

### Proposed Behavior
- When a user bookmarks a resource, it's saved to their account
- Bookmarks sync across all devices where user is logged in
- Bookmarks page/section to view all saved resources

### Considerations
- Requires user authentication (Feature #1)
- Migration path for existing localStorage bookmarks?
- Bookmark folders/organization?

### Open Questions
1. Should users be able to organize bookmarks into folders?
2. Limit on number of bookmarks?

---

## 4. Recently Viewed Resources

### Description
Track and display resources the user has recently accessed.

### Proposed Behavior
- Track last N resources viewed (e.g., 10-20)
- Display on dashboard in "Recently Viewed" section
- Click to quickly return to a resource

### Considerations
- Store in database (requires auth) or localStorage?
- How long to retain history?
- Privacy: should users be able to clear history?

### Open Questions
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

### Critical Disclaimer
**Same as print/export - this is user-entered data for personal tracking only, not medical analysis.**

### Proposed Behavior
- Each lab result includes a date (when entered or test date)
- History view shows all past values for a marker
- Optional: simple line chart showing trend over time
- Clear labeling that this is personal tracking, not medical advice

### Considerations
- Need to add date field to lab result entries
- Chart library if showing trends (e.g., Recharts)
- How far back to show history?

### Open Questions
1. Should users enter the actual test date, or use entry date?
2. Show charts automatically, or as an optional view?
3. Allow users to delete individual historical entries?

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

*Document Version: 1.0*
*Last Updated: January 2026*

---

**© 2026 Eddie Yakubovich / Maximus Digital Marketing. All rights reserved. Confidential.**
