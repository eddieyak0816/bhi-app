Project Specification: Balanced Health Institute Digital Platform
Date: January 2026

Project Lead: Team Lead, App Development & Digital Marketing

Client: Balanced Health Institute (BHI)

Version: 4.0 (Unified Technical & Functional Spec)

1. Executive Summary
The Balanced Health Institute app is a centralized digital platform designed for employee health education, engagement, and guided navigation. The platform acts as a trusted curator of vetted, evidence-based healthcare resources while maintaining strict legal boundaries. It is strictly an educational decision-support tool and is not a diagnostic or treatment platform.

2. Technical Stack & Architecture
To ensure speed, security, and scalability, the platform utilizes a modern Headless Architecture:

Frontend: React 19 (Vite) for a fast interface; Tailwind CSS for employer-specific branding.

Backend/Database: Supabase (PostgreSQL) using Row-Level Security (RLS) for data separation.

Storage: Supabase Storage for high-definition "teaser" videos and educational documents.

Testing: Playwright for end-to-end validation of navigation logic.

3. Functional Specifications & Dynamic Logic
A. User Onboarding & Authentication
User Data: Storage of standard profile data (First Name, Last Name, Email, Password).

Introductory Journey: Mandatory welcome videos explaining the platform’s purpose.

Employer Customization: Capability to inject branded content based on email domains.

B. Educational Health Navigation (The "Trigger Engine")
Dynamic Lab Inputs: Users voluntarily input blood test markers (e.g., Vitamin D, Glucose).

Mapping Logic: These values query the Supabase logic_rules table to assign tags (e.g., Low_D).

Multi-Media Results: The engine serves a filtered list of expert-led videos, research documents, and podcasts.

C. Vetted Expert Content Library
Categorization: Organized into Metabolic Health, Hormone Health, Preventative Care, and Nutrition.

Expert Spotlights: Profiles including teaser videos and links to external channels.

Keyword Discovery: Tagging system for searching content, including drugs and homeopathic options.

4. Database Setup & Implementation Code
The following structure has been initialized in the Supabase production environment:

SQL Schema

SQL

CREATE TABLE lab_markers (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT, unit TEXT);
CREATE TABLE logic_rules (marker_id UUID REFERENCES lab_markers(id), min_value NUMERIC, max_value NUMERIC, tag_to_apply TEXT);
CREATE TABLE resources (type TEXT, title TEXT, description TEXT, link_url TEXT, tags text[]);
Sample Data Logic (The "Low_D" Test Case)

SQL

INSERT INTO lab_markers (name) VALUES ('Vitamin D');
INSERT INTO logic_rules (marker_id, min_value, max_value, tag_to_apply) 
VALUES ((SELECT id FROM lab_markers WHERE name = 'Vitamin D' LIMIT 1), 0, 30, 'Low_D');

INSERT INTO resources (type, title, tags) VALUES ('video', 'Understanding Low Vit D', ARRAY['Low_D']);
INSERT INTO resources (type, title, tags) VALUES ('doctor', 'Dr. Jane Smith', ARRAY['Low_D']);
INSERT INTO resources (type, title, tags) VALUES ('homeopathic', 'D3 + K2 Drops', ARRAY['Low_D']);
5. Data Privacy & Compliance (Mandatory)
No PHI Storage: No Personal Health Information is stored; lab values are processed in local state only.

Voluntary Interaction: All data entry by users remains voluntary and user-controlled.

Boundary: Results are presented as guidance/education, never as medical treatment plans.

6. Developer Launch Checklist
[ ] Verify Tables: Ensure lab_markers, logic_rules, and resources exist in Supabase.

[ ] Set Array Types: Ensure resources.tags is defined as text[] (text array).

[ ] Stateless Processing: Code the React input form to calculate tags without saving the numeric value to the DB.

[ ] Branding Toggles: Implement the logic to filter resources by employer_id for custom content.

[ ] RLS Activation: Enable Row-Level Security so Employer A cannot see Employer B’s data.

---

### Assistant interaction preferences (short)
Refer to `ASSISTANT_PREFERENCES.md` for the canonical assistant behavior and project-specific rules (answer brevity, identity, model string, tool-call preface, and replace-string conventions). The assistant will follow and reference that file for future edits and checks.