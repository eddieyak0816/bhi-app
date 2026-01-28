# BHI App - User Guide

---

**CONFIDENTIAL & PROPRIETARY**

© 2026 Eddie Yakubovich / Maximus Digital Marketing. All rights reserved.

This document contains confidential and proprietary information. Unauthorized reproduction, distribution, or disclosure is strictly prohibited and may result in legal action.

---

## Overview

The Balanced Health Institute (BHI) App is an educational platform that helps users understand their lab results by providing curated health resources. This guide covers the current functionality of the application.

**Important:** This is an educational tool, not a medical diagnostic service. Always consult your healthcare provider for medical advice.

---

## Getting Started

### First Launch

When you first open the app, you'll see a welcome screen that explains:
- The purpose of the platform
- How to use the basic features
- An important disclaimer about the educational nature of the tool

Click **"Get Started"** to enter the main application, or **"Skip Introduction"** to bypass the welcome screen.

### Dark/Light Mode

A theme toggle button (sun/moon icon) appears in the top-right corner of every screen. Click it to switch between light and dark modes. Your preference is saved automatically.

---

## Navigation

The app has five main sections accessible from the top navigation bar:

| Tab | Purpose |
|-----|---------|
| **Home** | Dashboard with quick stats and personalized recommendations |
| **Resources** | Browse all health education materials |
| **Lab Results** | Enter and view your lab test results |
| **Profile** | Manage your account settings and preferences |
| **Admin** | Content management (admin users only) |

---

## Home (Dashboard)

The dashboard provides an overview of your activity:

### Stats Cards
- **Bookmarked Resources** - Number of resources you've saved
- **Lab Results** - Number of lab results you've entered
- **Health Insights** - Categories derived from your lab results
- **Recommendations** - Resources matched to your health profile

### Personalized Recommendations
If you've entered lab results, the dashboard shows resources specifically matched to your health insights. These are prioritized based on how many of your categories match the resource.

### Quick Actions
Shortcut buttons to:
- Log new lab results
- Browse resources
- Edit your profile

---

## Resources

Browse the library of health education materials.

### Viewing Options
- **Grid View** - Card layout showing resource previews
- **List View** - Compact list format

Toggle between views using the grid/list button.

### Filtering Resources

**Search** - Type keywords to find resources by title or description

**Type Filter** - Filter by resource type (e.g., video, article, guide)

**Category Filter** - Filter by health categories

### Resource Cards

Each resource displays:
- **Type** - The format of the resource
- **Title** - Resource name
- **Description** - Brief summary
- **Categories** - Health categories (categories matching your profile are highlighted)

### Resource Actions

- **Bookmark** - Save to your bookmarks (stored locally)
- **Open** - Visit the external resource link
- **View Details** - See full resource information in a modal

---

## Lab Results

Enter your lab test results to receive personalized resource recommendations.

### Entering Results

1. Select a lab marker from the dropdown (e.g., Vitamin D, Glucose, TSH)
2. Enter your test value
3. Submit to save the result

### How Matching Works

The app uses "logic rules" to match your lab values to health categories:
- Each lab marker has defined ranges (min/max values)
- When your result falls within a range, the associated category is applied to your profile
- Resources with matching categories are recommended to you

### Viewing Your Results

Your entered lab results are displayed with:
- The marker name
- Your entered value
- The unit of measurement

---

## Profile

Manage your account and preferences.

### Personal Information
- Full Name
- Email (display only)
- Age

### Health Goals
Select your primary health focus areas. These help personalize your experience.

### Preferred Resource Types
Choose which formats you prefer (videos, articles, guides, etc.)

### Notifications
- **In-App Notifications** - Alerts within the application
- **Email Updates** - Weekly summary of new resources

### Danger Zone
Option to delete your account (requires confirmation).

---

## Admin Section

*This section is for administrators managing the platform content.*

### Admin Tabs

| Tab | Purpose |
|-----|---------|
| **Resources** | Create, edit, and delete educational resources |
| **Resource Types** | Manage the types/formats of resources |
| **Lab Markers** | Define lab tests that users can enter |
| **Categories** | Manage health category categories |
| **Health Goals** | Configure available health goals for user profiles |
| **Criteria** | Set up logic rules that match lab values to categories |

---

### Managing Resources

#### Creating a Resource
1. In the "Create New Resource" section, select a type
2. Enter the title
3. Optionally add a URL link
4. Select applicable categories
5. Click "Create"

#### Filtering Resources
Use the Filter Resources box to search by:
- Keyword (searches titles)
- Type (multi-select)
- Categories (multi-select)

Click "Clear Filters" to reset.

#### Editing a Resource
Click "Edit" on any resource to modify its:
- Title
- Link URL
- Associated categories

Click "Save" to confirm or "Cancel" to discard changes.

#### Deleting Resources
- Single: Click "Delete" on any resource
- Bulk: Select multiple resources using checkboxes, then click "Bulk Delete"

---

### Managing Resource Types

Resource types define the format categories (e.g., "video", "article", "guide").

- **Add**: Enter a name and click "Add Type"
- **Edit**: Click Edit, modify the name, Save
- **Delete**: Click Delete (removes the type)

---

### Managing Lab Markers

Lab markers are the tests users can enter results for.

Each marker has:
- **Name** - The test name (e.g., "Vitamin D", "TSH")
- **Unit** - The measurement unit (e.g., "ng/mL", "mIU/L")

- **Add**: Enter name and optional unit, click "Add Marker"
- **Edit/Delete**: Use the action buttons on each marker

---

### Managing Categories

Categories are health categories used to match resources to users.

- **Add**: Enter a category name and click "Add"
- **Edit/Delete**: Use the action buttons

Categories appear in:
- Resource assignments
- User health insights (derived from lab results)
- Filtering options

---

### Managing Health Goals

Health goals are options users can select in their profile.

- **Add**: Enter a goal name and click "Add Goal"
- **Edit/Delete**: Use the action buttons
- **Active/Inactive**: Toggle whether a goal appears to users

---

### Managing Criteria (Logic Rules)

Criteria define how lab results map to categories. Each rule specifies:

| Field | Description |
|-------|-------------|
| **Lab Marker** | Which test this rule applies to |
| **Min Value** | Lower bound of the range (optional) |
| **Max Value** | Upper bound of the range (optional) |
| **Category to Apply** | The category assigned when the value matches |

#### Example Rule
- Marker: Vitamin D
- Min: 0
- Max: 29
- Category: "Low Vitamin D"

When a user enters a Vitamin D result of 25, they receive the "Low Vitamin D" category, and resources with that category are recommended.

---

## Data Storage

### What's Stored Locally (Browser)
- Dark/light mode preference
- Bookmarked resources

### What's Stored in the Database
- Resources and their metadata
- Lab markers and logic rules
- Categories and resource types
- Health goals
- User-entered lab results

---

## Tips

1. **Enter accurate lab values** - The recommendation system depends on correct data
2. **Use bookmarks** - Save resources you want to revisit
3. **Check the dashboard** - Personalized recommendations update as you add lab results
4. **Try both view modes** - Grid view for browsing, list view for scanning

---

## Troubleshooting

### Resources not loading
- Check your internet connection
- Refresh the page
- Clear browser cache if issues persist

### Recommendations not appearing
- Ensure you've entered lab results
- Verify that logic rules exist for your markers (admin)
- Check that resources have matching categories (admin)

### Dark mode not saving
- Ensure cookies/localStorage are enabled in your browser

---

*Document Version: 1.0*
*Last Updated: January 2026*

---

**© 2026 Eddie Yakubovich / Maximus Digital Marketing. All rights reserved. Confidential.**
