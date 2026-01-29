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

### Creating an Account

When you first open the app, you'll be presented with the login screen.

**To create a new account:**
1. Click "Sign Up" or "Create Account"
2. Enter your email address
3. Choose a password (minimum 6 characters, must include uppercase, lowercase, and number)
4. Enter your full name
5. Click "Create Account"

Your account is created immediately—no email verification required.

### Logging In

1. Enter your email and password
2. Click "Log In"
3. You'll be automatically logged in and taken to your dashboard

If you forget your password, click "Forgot Password?" to reset it via email.

### First Launch - Onboarding (Optional)

When you first log in, you may see a welcome screen that explains:
- The purpose of the platform
- How to use the basic features
- An important disclaimer about the educational nature of the tool

You can click **"Get Started"** to enter the main application, or **"Skip"** to go straight to your dashboard.

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

1. Go to the **Lab Results** tab
2. Click **"Log New Result"**
3. Select a lab marker from common presets (e.g., Blood Glucose, Cholesterol) or enter a custom marker
4. Enter your test value
5. The unit and normal range will auto-populate if available
6. Click **"Save Result"**

**Privacy Notice:** Your results are stored in your account for future reference. You have full control over this data.

### Viewing Your Results

Your lab results are displayed in a table showing:
- **Date** - When you entered the result
- **Marker** - The test name
- **Value** - Your measured value
- **Range** - Normal/optimal range for reference
- **Status** - Visual indicator (green for normal, red for outside range)

You can:
- **Filter by marker** - Click a marker name to see all results for that test over time
- **Delete results** - Click the delete button (✕) to remove a result
- **View history** - Select a marker to see all past values in a table

### How Matching Works

The app uses "logic rules" to match your lab values to health categories:
- Each lab marker has defined ranges (min/max values)
- When your result falls within a range, the associated category is applied to your profile
- Resources with matching categories are recommended to you

### Example
If you enter a Vitamin D level of 25 ng/mL, and a rule exists for "Low Vitamin D" (0-29), you'll receive the "Low Vitamin D" category. Resources tagged with that category will then be recommended on your dashboard.

---

## Profile

Manage your account and preferences. Access this section by clicking the **Profile** tab.

### Personal Information
- **Full Name** - Your name (editable)
- **Email** - Your login email (display only)
- **Age** - Your age for personalization (optional)

Click "Save Changes" after editing to update your information.

### Health Goals

Select your primary health focus areas to personalize your experience. These help the app recommend resources aligned with your interests.

**Selecting Goals:**
- Available goals are displayed as clickable options
- Click to toggle them on/off
- Multiple selections are allowed
- Only active goals appear (inactive goals are hidden)

Examples: Weight Management, Energy & Vitality, Athletic Performance, Preventative Care

### Preferred Resource Types

Choose which formats you prefer to see. This helps filter recommendations to match your learning style.

**Examples:**
- Videos
- Articles
- Guides
- Research papers

### Notifications

Configure how you receive updates:
- **In-App Notifications** - Alerts displayed within the application when new relevant resources are available
- **Email Updates** - Weekly summary of new resources matching your categories

### Account Management

#### Save Changes
Click **"Save Changes"** after editing any section to update your profile.

#### Delete Account
In the **Danger Zone** section at the bottom:
- Click **"Delete Account"** to permanently remove your account
- You'll be asked to confirm this action
- This cannot be undone—all your data will be deleted

---

## Admin Section

*This section is for administrators managing the platform content. Regular users won't see an Admin tab.*

### Accessing Admin Features

The **Admin** tab appears in the top navigation bar only if you have admin or super admin privileges. Click it to access content management tools.

### Admin Tabs Overview

The Admin section has 8 management tabs. Here's what each one does:

| Tab | Purpose | Who Uses It |
|-----|---------|-------------|
| **Resources** | Create, edit, and delete health education resources | Content managers |
| **Resource Types** | Manage resource format types (video, article, etc.) | System administrators |
| **Lab Markers** | Define the lab tests users can enter results for | Lab coordinators |
| **Tags** | Create organizational tags for labeling resources | Content managers |
| **Categories** | Create health categories for matching lab results | Content strategists |
| **Health Goals** | Set up health goals that users can select | Content strategists |
| **Criteria** | Create logic rules that connect lab values to categories | Data analysts |
| **Audit Log** | View a complete record of all changes made in the app | System administrators |

### Key Concept: Tags vs. Categories

**Important:** Tags and Categories serve different purposes:

- **Tags** - Organizational labels used to tag resources (e.g., "Heart Health", "Weight Management", "Stress"). Admins create tags and then apply them to resources for easy filtering and organization. Tags don't automatically trigger anything—they're just labels.

- **Categories** - Health conditions triggered by lab results (e.g., "Low Vitamin D", "High Blood Glucose", "Elevated Cholesterol"). When a user's lab result matches a category's criteria, that category is automatically assigned to the user. Resources tagged with matching categories are then recommended.

**Example to illustrate the difference:**
- A tag might be "Vitamin Health" (just a label on a resource)
- A category might be "Low Vitamin D" (triggered when a user's Vitamin D result is below 30)
- When a user enters a Vitamin D result of 25, they automatically get the "Low Vitamin D" category
- All resources tagged with "Vitamin Health" AND marked with the "Low Vitamin D" category appear in their recommendations

---

### Managing Resources

Resources are the health education materials that users browse and receive as recommendations. Each resource has a type, title, URL, and is associated with categories and tags.

#### Creating a Resource

**Step-by-step:**
1. In the "Create New Resource" section, select a **Resource Type** (e.g., Video, Article)
2. Enter the **Resource Title** (what users will see)
3. Optionally add a **URL Link** - The external link where this resource lives
   - The link protocol (https://, etc.) is auto-added if you just enter the domain
4. Select one or more **Categories** - When users have these categories, they'll see this resource
5. Select one or more **Tags** - Organizational labels for grouping (optional but recommended)
6. Click **"Create"**

**Best Practices:**
- **Meaningful titles** - "10 Natural Ways to Improve Sleep" is better than "Resource 1"
- **Working URLs** - Test the link before saving to ensure it's valid
- **Relevant categories** - Choose categories where this resource would be useful
- **Useful tags** - Add tags for easy filtering and organization

#### Viewing Resources

Choose your preferred view:
- **Grid View** (card layout) - Good for browsing and visual overview
- **Table View** (list format) - Good for scanning many resources and bulk operations

Toggle using the view mode button.

#### Filtering Resources

Use filters to find resources you want to edit or delete:

**Keyword Search**
- Search by resource title or description
- Type to filter in real-time

**Type Filter** (Multi-select)
- Select one or multiple resource types
- Only resources of selected types appear

**Category Filter** (Multi-select)
- Select one or multiple categories
- Only resources assigned to selected categories appear

**Clear Filters**
- Click to reset all filters and see all resources

#### Editing a Resource

1. Find the resource (use filters if needed)
2. Click **"Edit"** on the resource card or table row
3. Modify:
   - **Title** - The display name
   - **URL** - The external link
   - **Categories** - Which health categories this applies to
   - **Tags** - Organizational labels
4. Click **"Save"** to confirm or **"Cancel"** to discard changes

#### Deleting Resources

**Single Resource**
- Click **"Delete"** on any resource
- Confirm the deletion
- The resource is immediately removed from the platform

**Multiple Resources (Bulk Delete)**
1. Select multiple resources using checkboxes
2. Click **"Bulk Delete"** button
3. Confirm the deletion
4. All selected resources are immediately removed

**Important:** Deletion is permanent and affects users immediately. Deleted resources no longer appear in recommendations.

---

### Managing Resource Types

Resource types define the format or medium of resources (e.g., "Video", "Article", "Podcast", "Guide", "Infographic").

#### Why Resource Types Matter
Resource types help users filter and find content in their preferred format. Users can set preferences in their profile to see more of the types they prefer.

#### Add a Type
1. Enter a type name in the "Add Type" field
2. Click **"Add Type"**

**Example types:** Video, Article, Podcast, Guide, Research Paper, Infographic, Webinar, Case Study

#### Edit a Type
1. Click **"Edit"** on the type
2. Modify the name
3. Click **"Save"**

#### Delete a Type
- Click **"Delete"** on any type
- **Note:** You cannot delete a type that's currently assigned to resources
- **Workaround:** First, edit all resources using that type to assign them a different type, then delete the unused type

---

### Managing Tags

Tags are organizational labels applied to resources to make them easier to find and organize. Think of tags like filing system labels—they help organize content but don't automatically trigger anything.

#### When to Use Tags
Use tags to organize resources by topic, method, or audience:
- **By Topic:** "Sleep Optimization", "Nutrition", "Mental Health"
- **By Method:** "Meditation", "Supplements", "Exercise"
- **By Audience:** "Beginners", "Advanced", "For Parents"
- **By Goal:** "Weight Management", "Energy", "Recovery"

#### Add a Tag
1. Go to the **Tags** tab
2. Enter a tag name in the "Add Tag" field
3. Click **"Add Tag"** or press Enter

**Naming Tips:**
- Keep tag names short and descriptive (2-4 words)
- Use consistent naming: "Stress Management" not "Stress Mgmt" or "Stress"
- Avoid redundancy: Don't create "Sleep" if "Sleep Optimization" already exists

#### View All Tags
Tags are displayed in either **Card View** or **Table View**:
- **Card View** - Visual grid layout
- **Table View** - List showing tag name and usage count

Toggle between views using the view mode button.

#### Filter Tags
Use the search box to find tags by name. Start typing to see matching tags.

#### Edit a Tag
1. Click **"Edit"** on the tag (or click the tag name)
2. Modify the tag name
3. Click **"Save"**

#### Delete a Tag
1. Click **"Delete"** on any tag
2. Confirm the deletion
3. **Result:** The tag is removed from all resources and no longer available for use

#### View Tag Usage
In table view, each tag shows **"Used in X places"**. This tells you how many resources have that tag applied, helping you identify which tags are actively used.

---

### Managing Lab Markers

Lab markers are the specific health tests that users can enter results for. Each marker represents a measurable health metric.

#### Understanding Lab Markers

Each lab marker has:
- **Name** - The test name (e.g., "Vitamin D", "Blood Glucose", "TSH", "Cholesterol")
- **Unit** - The measurement unit (e.g., "ng/mL", "mg/dL", "mIU/L", "mg/dL")

**Examples of markers:**
- Vitamin D (ng/mL)
- Blood Glucose (mg/dL)
- TSH (mIU/L)
- Cholesterol (mg/dL)
- Cortisol (µg/dL)

#### Add a Marker

1. Enter the **Marker Name** (exact name of the test)
2. Enter the **Unit** (measurement unit, optional but recommended)
3. Click **"Add Marker"**

**Best Practices:**
- **Standard names** - Use widely-recognized names (e.g., "Vitamin D", not "Vit D")
- **Correct units** - Use proper abbreviations for accuracy
- **Consistent formatting** - Don't create "Vitamin D", "vitamin d", and "VITAMIN D" separately

#### Edit a Marker

1. Click **"Edit"** on the marker
2. Modify the:
   - **Name** - The test name
   - **Unit** - The measurement unit
3. Click **"Save"**

#### Delete a Marker

- Click **"Delete"** on any marker
- **Caution:** Deleting a marker will also delete all associated logic rules (criteria)
- **Impact:** Users who entered results for this marker will retain their results, but no new results can be entered for this marker

#### Filter Markers

Use the search box to find markers by name or unit.

---

### Managing Categories

Categories represent health conditions or states triggered by lab results. They're used to group resources and match them to users based on their lab values.

#### Understanding Categories

A category is a health topic that:
- Is triggered when a user's lab result matches a criteria
- Groups related resources together
- Appears in user recommendations when triggered

**Examples:**
- "Low Vitamin D"
- "High Blood Glucose"
- "Elevated Cholesterol"
- "Optimal Energy Levels"
- "Thyroid Imbalance"

#### Add a Category

1. Enter a **Category Name** (the health condition or state)
2. Optionally add a **Description** (helps explain what triggers this category)
3. Click **"Add"**

**Naming Tips:**
- Be specific: "Low Vitamin D" is better than just "Vitamin D"
- Include the direction: "High Blood Glucose" vs. "Low Blood Glucose"
- Keep it clear: Users will see this in recommendations

#### Edit a Category

1. Click **"Edit"** on the category
2. Modify the:
   - **Name** - The category display name
   - **Description** - What this category represents (optional)
3. Click **"Save"**

#### Delete a Category

- Click **"Delete"** on the category
- **Result:** The category is removed from all resources and logic rules
- **Impact:** Users currently with this category won't be affected; future users won't receive it

#### View Category Usage

Each category shows how many resources and rules use it:
- **"Used in X resources"** - How many resources are tagged with this category
- **"Used in X rules"** - How many logic rules assign this category

This helps you identify which categories are actively used and important.

---

### Managing Health Goals

Health goals are options that users can select in their profile to personalize their experience and help the platform recommend relevant content.

#### Understanding Health Goals

Health goals are topics users are interested in. When users select goals:
- They receive recommendations aligned with those goals
- Their profile reflects their interests
- Content is personalized to their needs

**Examples of health goals:**
- Weight Management
- Energy & Vitality
- Athletic Performance
- Preventative Care
- Sleep Optimization
- Stress Management
- Hormone Balance
- Mental Clarity

#### Add a Health Goal

1. Enter a **Goal Name** (the health focus area)
2. Optionally add a **Description** (what this goal means)
3. Click **"Add Goal"**

**Naming Tips:**
- Be action-oriented: "Weight Management" vs. "Weight"
- Be specific: "Sleep Optimization" vs. "Sleep"
- Keep it positive: "Energy & Vitality" vs. "Low Energy"

#### Edit a Health Goal

1. Click **"Edit"** on the goal
2. Modify the:
   - **Name** - The goal display name
   - **Description** - What achieving this goal means
3. Click **"Save"**

#### Active/Inactive Toggle

Health goals can be toggled on or off:
- **Active Goals** - Visible to users in their Profile (they can select these)
- **Inactive Goals** - Hidden from users (they cannot select these)

**To toggle status:**
- Click **"Activate"** to make a goal available to users
- Click **"Deactivate"** to hide a goal from users

**Important:** Deactivating a goal doesn't remove it from users who already selected it—it just hides it for new selections.

#### Delete a Health Goal

- Click **"Delete"** on any goal
- **Result:** The goal is permanently removed from the system
- **Impact:** Users who had this goal selected will no longer see it in their profile, but their selections won't be forcibly removed

---

### Managing Criteria (Logic Rules)

Criteria are logic rules that define the connection between lab values and health categories. They're the "engine" that powers personalized recommendations.

#### Understanding Logic Rules

A logic rule specifies:
- **Which lab marker to monitor** - What test are we looking at?
- **The acceptable value range** - What values trigger this category?
- **Which category to apply** - What should be recommended when this range is matched?
- **The operator** - How to evaluate the range (greater than, less than, equal to, etc.)

#### How Rules Work (Example)

**Rule:** 
- Marker: Vitamin D
- Min Value: 0
- Max Value: 29
- Category: "Low Vitamin D"

**What this means:**
When a user enters a Vitamin D result between 0-29, they automatically receive the "Low Vitamin D" category. All resources categorized as "Low Vitamin D" then appear in their recommendations.

#### View All Rules

Rules are displayed in **Table View** showing:
- **Marker** - The test being monitored
- **Min/Max Values** - The range that triggers the category
- **Category** - The category assigned when matched
- **Usage** - How many times this rule is active

#### Filter Rules

Use the filter options to find specific rules:
- **By Marker** - Find rules for a specific test
- **By Category** - Find rules that assign a specific category
- **By Value Type** - Filter by min or max values
- **By Operator** - Filter by comparison type

#### Creating a Rule

1. Select a **Lab Marker** (which test)
2. Enter **Min Value** (lowest value in the range, optional)
3. Enter **Max Value** (highest value in the range, optional)
4. Select a **Category to Apply** (what gets recommended)
5. Click **"Create Rule"** or **"Add"**

**Step-by-step example:**
1. Marker: "Vitamin D"
2. Min: 0
3. Max: 29
4. Category: "Low Vitamin D"
5. Click Create → Rule is live

#### Editing a Rule

1. Click **"Edit"** on the rule
2. Modify the:
   - **Marker** - The test being monitored
   - **Min/Max Values** - The range
   - **Category** - The target category
3. Click **"Save"**

#### Deleting a Rule

- Click **"Delete"** on any rule
- **Result:** The rule is removed
- **Impact:** This only affects future matches; users who already have the category won't lose it

#### Best Practices for Criteria

1. **No overlapping ranges** - Avoid two rules with overlapping values for the same marker
   - ❌ Bad: Rule 1 (0-29), Rule 2 (20-50) for same marker
   - ✅ Good: Rule 1 (0-29), Rule 2 (30-59)

2. **Define all ranges** - For users to get recommendations, you need rules
   - ❌ Bad: Only create a rule for "Low Vitamin D", no rule for "Optimal Vitamin D"
   - ✅ Good: Create rules for all relevant ranges

3. **Use meaningful categories** - Make it clear what each rule means
   - ❌ Bad: "VitD-Low" vs. "VitD-Mid" vs. "VitD-High"
   - ✅ Good: "Low Vitamin D" vs. "Adequate Vitamin D" vs. "Optimal Vitamin D"

4. **Test your rules** - Add a sample lab result to verify recommendations appear
   - Enter a test result
   - Check Dashboard → should see matching recommendations
   - Delete the test result when done

5. **Use operators correctly** - If using <, >, ≤, ≥, make sure the logic makes sense
   - ❌ Bad: "TSH > 10" but you meant "TSH < 0.5" (mixed up direction)
   - ✅ Good: Double-check operator before saving

---

## Logging Out

To log out, click the **"Logout"** or **"Sign Out"** button in the top navigation bar (often in the account menu or near your name). You'll be returned to the login screen.

---

## Data Storage

### What's Stored Locally (In Your Browser)
- Dark/light mode preference
- Bookmarked resources (temporary, until synced to database)

### What's Stored in the Database (Your Account)
- Your profile information (name, email, age, preferences)
- Your health goals selection
- Your preferred resource types
- Resources and their metadata
- Lab markers and logic rules (admin only)
- Categories and resource types (admin only)
- Your entered lab results (for history and recommendations)
- Your bookmarked resources (persisted)

### Privacy & Security
- Your data is stored securely in our database
- Only you can access your personal information
- Admins can only see resources and system configuration, not individual user data
- Lab values are used only for generating category recommendations

---

## Tips & Best Practices

1. **Create an account** - Sign up to save your lab results and bookmarks securely
2. **Enter accurate lab values** - The recommendation system depends on correct data to provide relevant suggestions
3. **Use bookmarks** - Save resources you want to revisit or learn more about later
4. **Update your profile** - Select health goals and resource types to get better recommendations
5. **Check the dashboard regularly** - Personalized recommendations update as you add lab results
6. **Review your history** - Click on a lab marker to see all your past results over time
7. **Use both view modes** - Grid view for browsing, list view for scanning and bulk operations (admin)
8. **Set up comprehensive rules** - Admins should create rules for all relevant marker ranges to ensure users get proper recommendations

---

### Viewing Activity Audit Log

The **Audit Log** is a complete history of all administrative changes made in the system. This includes who made changes, what was changed, and when.

#### Accessing the Audit Log
1. Go to the Admin section
2. Click the **"Audit"** tab (last tab)

#### What's Recorded
The audit log records:
- **Action** - What was done (created, updated, deleted, etc.)
- **Table** - Which feature was affected (resources, markers, categories, etc.)
- **User** - Who made the change (admin email)
- **Timestamp** - Exactly when the change was made
- **Details** - What changed (old value → new value)

#### Why This Matters
The audit log:
- Provides accountability for platform changes
- Helps troubleshoot issues ("When did this change?")
- Prevents accidental data loss ("Who deleted that resource?")
- Supports compliance and documentation needs

#### Filtering the Audit Log
Use the filter options to find specific changes:
- **Action** - Filter by type of change (create, update, delete)
- **Table** - Filter by feature (resources, markers, categories, etc.)

#### Viewing Details
In table view, each row shows:
- The action performed
- The table/feature affected
- The admin who made the change
- The exact timestamp
- A brief description of what changed

---

## Troubleshooting - Admin Issues

### I can't see the Admin tab
- **Check your role** - Only users with Admin or Super Admin roles can access Admin features
- **Verify your permissions** - Contact your Super Admin to confirm your role
- **Log out and back in** - Sometimes permissions take a moment to apply
- **Check the database** - Super Admins can verify roles in the users/profiles table

### I deleted something by accident
- **Check the Audit Log** - See exactly when and what was deleted
- **Recreate the item** - Unfortunately deletions are permanent, but you can recreate them:
  - **Resources:** Use the Create New Resource form
  - **Markers:** Use the Add Marker form
  - **Categories/Tags:** Use the Add Category/Tag form
  - **Resource Types:** Use the Add Type form
- **Contact your Super Admin** - If you need help recovering data, they may have backups

### Resources won't create or update
- **Check all required fields** - Ensure title and type are filled in
- **Verify categories exist** - Make sure at least one category is selected
- **Check internet connection** - Network errors can cause save failures
- **Review error message** - Copy any error messages and share with technical support

### Criteria/Rules aren't matching user results
- **Verify marker exists** - Check that the marker is created and spelled correctly
- **Check value ranges** - Ensure min/max values are logical (min < max usually)
- **Confirm category exists** - The target category must exist in the system
- **Test with a sample result** - Add a test lab result to verify the rule works
- **Check operator** - If using operators like <, >, make sure they're correct

### Changes aren't showing to users
- **Wait a moment** - Changes propagate within seconds, but may need a page refresh
- **Ask users to refresh** - Tell users to press F5 or refresh their browser
- **Clear cache** - Instruct users to clear browser cache if changes still don't appear
- **Check user roles** - Ensure users have the right access level for the content

---

### I can't log in
- **Check your credentials** - Verify email and password are correct
- **Reset password** - Click "Forgot Password?" and follow the email instructions
- **Clear browser cache** - Try clearing cookies and cached data
- **Try a different browser** - Test if the issue is browser-specific

### Resources not loading
- **Check your internet connection** - Ensure you have an active connection
- **Refresh the page** - Press F5 or Ctrl+R to reload
- **Clear browser cache** - Remove cached data and try again
- **Try a different browser** - Test if the issue is browser-specific

### Recommendations not appearing
- **Ensure you've entered lab results** - Go to Lab Results tab and add at least one result
- **Verify logic rules exist** - Admins should check Criteria tab for relevant rules
- **Check category matching** - Confirm resources have the same categories as your rules
- **Re-enter lab values** - Try adding a new lab result to trigger recommendations

### My bookmarks disappeared
- **Check if you're logged in** - Bookmarks are stored per account
- **Verify bookmarks exist** - Go to Resources and check the bookmark status
- **Clear browser data** - If using localStorage, clearing browser data will remove bookmarks

### Dark mode not saving
- **Enable browser storage** - Ensure cookies and localStorage are enabled
- **Check privacy mode** - Private/Incognito mode won't persist preferences
- **Refresh after toggling** - Try switching modes again and refreshing the page

### Lab results not matching categories
- **Check value ranges** - Verify the rule's min/max values match your lab result
- **Confirm rule exists** - Admins should verify the rule was created successfully
- **Check category assignment** - Ensure the rule assigns the correct category
- **Refresh recommendations** - Try adding another lab result to refresh recommendations

### Profile changes not saving
- **Click Save Changes** - Ensure you clicked the save button after making edits
- **Check internet connection** - A lost connection can prevent saves
- **Verify changes were made** - Refresh the page to confirm the update

### I accidentally deleted something
- Unfortunately, deletions are permanent
- For resources or markers: Admins can recreate them
- For lab results: Users can re-enter them
- For categories: Admins can recreate them (users who had the category won't be affected)

### Still having issues?
- **Note the exact error message** - This helps with troubleshooting
- **Check browser console** - Press F12 to open developer tools and check for errors
- **Try logging out and back in** - Sometimes this resolves authentication issues
- **Contact support** - Reach out to your administrator with details about the issue

---

*Document Version: 2.1*
*Last Updated: January 28, 2026*

**Changes in Version 2.1:**
- Added comprehensive Admin Tabs Overview table
- Added Key Concept section explaining Tags vs. Categories distinction
- Added complete "Managing Tags" section with best practices
- Enhanced "Managing Resource Types" section with naming tips
- Enhanced "Managing Lab Markers" section with examples and filtering
- Enhanced "Managing Categories" section with naming tips and usage tracking
- Completely rewrote "Managing Health Goals" section with clarity and toggling explanation
- Completely rewrote "Managing Criteria (Logic Rules)" section with detailed best practices and operator guidance
- Added "Viewing Activity - Audit Log" section with explanation of what's recorded and why it matters
- Added comprehensive "Troubleshooting - Admin Issues" section covering:
  - Missing Admin tab access
  - Accidental deletions
  - Resource creation/update failures
  - Criteria/rules not matching
  - Changes not showing to users

**Changes in Version 2.0:**
- Added authentication (login/signup) details
- Expanded Lab Results section with history and date tracking
- Enhanced Profile section with detailed goal and preference management
- Comprehensive Admin section with detailed instructions
- Added Logging Out section
- Expanded Tips & Best Practices
- Enhanced Troubleshooting with more scenarios
- Updated Data Storage section with privacy notes

---

**© 2026 Eddie Yakubovich / Maximus Digital Marketing. All rights reserved. Confidential.**
