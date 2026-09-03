# Racing

A modern web application showing today's horse racing entries from the UK & Ireland, featuring advanced sorting and performance analytics.


## ✨ Key Features

- **Today's Entries:** View full racecards for upcoming UK and IRE meetings.
- **Advanced Sorting:** Rank runners by horse number, average rating of the last three runs, or highest career rating.
- **💬 Community Chat:** Real-time, anonymous WebSocket chat for discussing runners and sharing tips. Features a theme-aware, floating UI that stays accessible while you browse.
- ** Secure Access:** Protected by JWT-based authorization with third-party login integration.
- **Performance Analytics:** Interactive line charts visualizing horse ratings over time using `recharts`.
- **Smart Filtering & Highlighting:**
    - **📅 Date Picker:** Click on the main header to select a date to fetch that specific days race data.
    - **📅 Multi-Month History:** Flexible form history filtering (3, 6, 9, or 12 months) using a stepped slider.
    - **⏱️ Follow:** Real-time filtering to show only upcoming races, automatically removing finished events.
    - **📊 Odds Movement:** A summary view of price changes across the entire card.
    - **⭐ Value Finder:** Highlights horses with high form ratings (>80) that are priced at double digits (>9/1).
    - **� Fiddle Detection:** Identifies "well-connected" horses from high-profile owners and trainers when they are running at larger odds.
- **Detailed Form:** Comprehensive breakdown of past performances including date, time, course conditions (distance/going), finishing position, and weight carried.
- **Mobile Optimized:** Responsive design with a theme-aware interface (optimized for Dark Mode).

## 🔐 Security

The application implements a robust security layer using an `AuthGuard` pattern:
- **JWT Authorization:** Access is controlled via JSON Web Tokens.
- **Third-Party Integration:** Seamless authentication flow through a centralized login service.
- **Session Persistence & Validation:** Secure cookie handling with periodic background session pings to the `authservice` to ensure account validity.


## 🛠 Tech Stack

- **Framework:** React 19
- **Build Tool:** Vite
- **Visualization:** Recharts
- **Deployment:** GitHub Pages

# Examples
Timeline and Chart
<img width="1173" height="914" alt="image" src="https://github.com/user-attachments/assets/4f6d8cf5-ca73-4017-993f-fc6f13a0b8f6" />

Race
<img width="1742" height="992" alt="image" src="https://github.com/user-attachments/assets/97156ce1-4711-4f40-a9ac-0af4c278c4c3" />
