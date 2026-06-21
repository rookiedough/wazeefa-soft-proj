# Wazeefa — AI Recruitment Demo Platform

Wazeefa is a **demo web application** that presents an AI-assisted recruitment workflow. It demonstrates how candidate CVs can be uploaded, processed, scored, ranked, filtered, and reviewed through a centralized recruitment dashboard.

This project was created as a **prototype / MVP demo** for a Software Project Management and Agile sprint presentation. It is intended to show the concept and user flow of an AI recruitment platform, not to operate as a production-ready system.

---

## Overview

Wazeefa helps demonstrate how an HR team or recruiter could manage candidates through a digital recruitment pipeline. The platform includes candidate screening, dashboard summaries, candidate ranking, CV upload, insights, and user management features.

The project focuses on showing:

- Candidate CV upload and processing
- Candidate scoring and ranking
- Candidate filtering and search
- Recruitment dashboard visualization
- Candidate profile review
- Basic workflow actions such as scheduling interviews and moving candidates to the next stage
- Admin-style user management

---

## Demo Notice

> **Important:** This is a demo application.

Some data and metrics are simulated or estimated for presentation purposes. The project does not represent a complete production recruitment platform and should not be used for real hiring decisions without further development, validation, security, and compliance work.

---

## Key Features

### Dashboard

The dashboard provides a high-level overview of recruitment activity, including:

- Total candidates
- Interviews
- Offers
- Users
- Candidate rankings
- Hiring percentage chart by month

The dashboard is designed to help users quickly understand candidate status and recruitment progress.

---

### Candidate Rankings

Candidates are ranked based on their screening score. The ranking table displays:

- Candidate name
- Applied position
- Candidate summary
- Rank

Users can click a ranked candidate to open the candidate detail page.

---

### CV Upload

The CV Upload page allows users to upload candidate resumes in supported document formats such as:

- PDF
- DOC
- DOCX

Uploaded CVs are processed and converted into structured candidate information for review.

---

### Candidate Management

The Candidates page allows users to view and manage candidates in a table format. Users can:

- Search candidates
- Filter candidates by role
- Filter candidates by status
- Filter candidates by minimum score
- Open candidate profiles

---

### Candidate Detail Page

Each candidate has a detailed profile view that includes:

- Contact information
- Professional summary
- Experience
- Education
- Skills
- Application timeline
- Overall score
- Score breakdown

The detail page also includes workflow actions such as:

- Schedule Interview
- Move to Next Stage
- Send Email
- Add Notes
- Reject Candidate

---

### Application Timeline

The Application Timeline is based on recruitment actions performed in the app, such as:

- Application submitted
- Candidate moved to another stage
- Interview scheduled
- Candidate rejected

This timeline is not intended to be generated directly from CV processing.

---

### Insights Page

The Insights page presents recruitment-related metrics and charts. Since this is a demo, only metrics supported by available app data should be treated as reliable.

Examples of safer metrics include:

- Candidates processed
- Interviews scheduled
- Offer or hired candidates
- Average candidate score

Some metrics, such as cost reduction, time saved, or platform adoption, may be estimated unless real historical or operational data is collected.

---

### User Management

The User Management page demonstrates basic admin functionality, including:

- Viewing users
- Adding new users
- Assigning roles
- Activating or deactivating users
- Resetting user passwords in demo mode
- Removing users

---

## Technology Used

This demo uses a simple web technology stack:

- **HTML5** for structure
- **CSS3** for styling and responsive layout
- **Vanilla JavaScript** for interactivity
- **LocalStorage** for browser-based data persistence
- **JSON files** for sample data
- Optional API integration for CV processing

---

## Data Storage

Most demo data is stored in the browser using `localStorage`. This means:

- Data is saved only in the current browser
- Clearing browser storage removes saved candidates and workflow data
- The app does not use a production database by default

Common localStorage keys used by the demo include:

```text
wazeefa_uploaded_candidates
wazeefa_candidate_stage_history
wazeefa_candidate_stages
wazeefa_candidate_interviews
wazeefa_rejected_candidates
wazeefa_candidate_notes
wazeefa_users
wazeefa_auth_user
```

---

## How to Run Locally

1. Clone or download the project.
2. Open the project folder in your code editor.
3. If using Vercel or a local development server, run the project using your configured development command.
4. Open the app in your browser.
5. Log in using one of the demo users.

Example demo login behavior may depend on the configured `users.json` file or locally stored users.

---

## Suggested Demo Flow

For a presentation, a recommended demo flow is:

1. Open the dashboard and explain the recruitment overview.
2. Go to CV Upload and upload or process a sample CV.
3. View the candidate in the Candidates table.
4. Use filters to narrow down candidates.
5. Open a candidate profile.
6. Show candidate details, score breakdown, and timeline.
7. Schedule an interview or move the candidate to the next stage.
8. Open the Insights page and explain which metrics are demo-based or estimated.
9. Open User Management and show basic admin controls.

---

## Limitations

Because this is a demo prototype, it has several limitations:

- It is not production-ready.
- It does not include full authentication security.
- It does not include a full backend database by default.
- Some insights may be estimated or simulated.
- Candidate scoring should be further validated before real use.
- CV processing behavior depends on the configured implementation.
- Data stored in localStorage can be cleared by the browser.

---

## Future Improvements

Potential improvements include:

- Add a real database for persistent candidate and user records.
- Add secure authentication and role-based access control.
- Improve scoring logic and validation.
- Add structured stakeholder feedback collection.
- Track real historical data for accurate insights.
- Improve dashboard analytics.
- Add export functionality for reports.
- Add audit logs for recruitment actions.
- Improve accessibility and mobile responsiveness.

---

## Project Purpose

Wazeefa was built to demonstrate how an AI-assisted recruitment system could support HR teams by simplifying candidate review and decision-making. The project highlights candidate screening, scoring, ranking, and recruitment workflow management in an interactive demo format.

---

## Contributors

Group 4 — Wazeefa Project Team

Add team member names here if needed.

---

## License

This project is intended for educational and demonstration purposes.
