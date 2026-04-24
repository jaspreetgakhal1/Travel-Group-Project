# High-Level Overview

## Project Name
SplitNGo

## Project Purpose
SplitNGo is an AI-assisted travel planning application designed to help users plan smarter and more organized trips. The main goal of the project is to reduce the stress of trip planning by allowing users to search travel information, explore destinations, manage trip details, and use AI-supported features to generate helpful travel suggestions.

The application is useful for people who want a simple way to organize travel ideas, compare options, and build a clearer travel plan without switching between many different websites.

## Problem Being Solved
Planning a trip can become difficult because users often need to search for flights, destinations, budgets, activities, and schedules across multiple platforms. This can lead to confusion, missed details, and poor organization. 

SplitNGo solves this problem by bringing travel-related features into one application. It helps users organize travel information in a central place and supports decision-making with AI-assisted suggestions.

## Target Users
The target users for SplitNGo include:

- Students planning group trips
- Friends or families planning vacations
- Travellers looking for destination ideas
- Users who want AI help with itinerary planning
- Users who want a more organized travel planning experience

## Main Features
The completed project includes the following main features:

- Travel search functionality
- AI-assisted travel suggestions
- Trip planning support
- Destination or itinerary-related information
- Database storage using Neon PostgreSQL
- Backend API logic for handling requests
- Frontend user interface for interacting with the app
- Environment configuration using `.env.example`

## Technology Stack

### Frontend
The frontend is built using React, TypeScript, Vite, and Tailwind CSS. These tools were chosen because they allow fast development, reusable components, and a clean user interface.

### Backend
The backend is built using Node.js and Express. Express is used to create API routes that connect the frontend to the server-side logic.

### Database
The project uses PostgreSQL through Neon.tech. Neon was selected because it provides a cloud-hosted PostgreSQL database that is easy to connect to and works well for full-stack applications.

### ORM / Database Access
Prisma is used to manage database models and queries. Prisma helps keep database operations organized and easier to understand.

### External APIs
The project uses the Amadeus Travel API to support travel-related data such as destination or travel search information.

### AI Support
AI tools were used to assist with planning, debugging, code explanation, and documentation. The project also includes AI-assisted travel planning features where applicable.

## System Architecture

SplitNGo follows a full-stack client-server architecture.

The frontend is responsible for displaying pages, forms, buttons, and travel information to the user. When the user interacts with the app, the frontend sends requests to the backend.

The backend receives those requests through Express API routes. It processes the request, communicates with external APIs or the database when needed, and sends a response back to the frontend.

The database stores project data in a structured format using PostgreSQL. Prisma is used to communicate with the database safely and consistently.

## Basic Data Flow

1. The user interacts with the frontend.
2. The frontend sends a request to the backend API.
3. The backend validates or processes the request.
4. The backend may contact the database or an external travel API.
5. The backend sends data back to the frontend.
6. The frontend displays the result to the user.

Example:

User searches for travel information  
→ frontend sends request  
→ backend processes search  
→ Amadeus API or database returns data  
→ frontend displays results

## Key Design Decisions

### 1. Full-Stack Structure
The project separates frontend and backend code so the application is easier to understand, debug, and expand.

### 2. React Components
The frontend uses reusable components so repeated UI sections can be maintained more easily.

### 3. PostgreSQL Database
PostgreSQL was chosen because it is reliable, structured, and commonly used in production applications.

### 4. Prisma
Prisma was used to simplify database queries and reduce raw SQL complexity.

### 5. Environment Variables
Sensitive information such as API keys and database URLs are handled through environment variables. The real `.env` file is not included in GitHub, while `.env.example` shows what variables are required.

### 6. Documentation
Documentation was added to explain how the system works, how it is structured, and how future developers can contribute.

## User Experience Goals

The user interface was designed to be simple and clear. The goal was to make the app feel easy to use even for users who are not technical.

Important UX goals include:

- Clear navigation
- Easy-to-understand buttons and forms
- Helpful travel information
- Clean visual layout
- Reduced confusion during trip planning

## Scalability

The project can be extended in the future by adding more travel features, authentication, saved user profiles, group trip planning, expense splitting, and more AI-powered recommendations.

Because the project separates frontend, backend, and database logic, future features can be added without completely rebuilding the application.

## Limitations

Some features may still have room for improvement, such as deeper AI personalization, more advanced trip collaboration, stronger validation, or more detailed error handling. These are documented as possible future improvements.

## Future Improvements

Future versions of SplitNGo could include:

- User login and authentication
- Saved travel profiles
- Group trip collaboration
- Expense splitting
- More advanced AI itinerary generation
- Admin dashboard
- Mobile app version
- Better notification system
- Improved accessibility and responsiveness

## Summary

SplitNGo is a full-stack AI-assisted travel planning application that combines a modern frontend, backend API logic, database storage, and travel API integration. The project focuses on helping users plan trips more easily while demonstrating full-stack development, API integration, database usage, and responsible AI-assisted development.4j
