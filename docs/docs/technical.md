# Technical Documentation

## Overview
This document explains how the SplitNGo application is built from a technical perspective. It covers how the frontend, backend, and database work together, along with the main functions and data flow in the system.

## Project Structure
The project is divided into two main parts:

- `/src` → Frontend (React + TypeScript + Vite)
- `/server/src` → Backend (Node.js + Express)
- `/public` → Static files
- `/docs` → Documentation

This separation helps keep the code organized and easier to manage.

## Backend (Express Server)
The backend is built using Node.js and Express. It handles all API requests, processes data, and connects to the database or external APIs.

Main responsibilities:
- Receive requests from the frontend
- Validate input data
- Store or retrieve data from the database
- Call external APIs (Amadeus)
- Send responses back to the frontend

## API Routes
The backend includes routes for handling different operations.

Examples:

- POST requests are used to send data from the frontend and store it in the database
- GET requests are used to fetch data and return it to the frontend
- Some routes call the Amadeus API to get travel-related data

Each route follows a similar structure:
1. Get data from request
2. Validate it
3. Process it (DB or API)
4. Return response

## Database (PostgreSQL + Prisma)
The application uses PostgreSQL hosted on Neon.tech.

Prisma is used to interact with the database. It helps:
- Define models
- Run queries (create, read, update)
- Keep database logic clean and structured

Example data stored includes travel-related information such as destinations, preferences, and user inputs.

## Core Functions

### createData()
Used to store new data in the database.
- Takes input from the frontend
- Validates it
- Saves it using Prisma

### getData()
Used to retrieve data from the database.
- Queries stored records
- Returns them to the frontend

### fetchTravelData()
Used to call the Amadeus API.
- Sends a request to the external API
- Receives travel data
- Returns it to the frontend

## Frontend (React)
The frontend is built using React with TypeScript and Vite.

Main responsibilities:
- Display UI (forms, pages, results)
- Take user input
- Send requests to backend
- Display responses

The UI is styled using Tailwind CSS for a clean layout.

## Data Flow
The application follows a simple flow:

1. User interacts with the frontend
2. Frontend sends a request to backend
3. Backend processes request
4. Backend connects to database or external API
5. Backend sends response
6. Frontend displays result

## Validation and Error Handling
- Basic validation is done before processing data
- Try/catch is used in backend to prevent crashes
- Errors return proper responses instead of breaking the app

## Environment Variables
Sensitive data is stored in a `.env` file (not pushed to GitHub).

Example:
- DATABASE_URL
- AMADEUS_CLIENT_ID
- AMADEUS_CLIENT_SECRET

An `.env.example` file is included to show required variables.

## Security
- API keys are hidden using environment variables
- No sensitive data is stored in the repository
- Input validation helps prevent bad data

## Scalability
The project is built in a way that allows future improvements:
- New features can be added to backend routes
- Database can be expanded easily
- Frontend components are reusable

## Limitations
- No login/authentication system yet
- Basic validation only
- Some features can be expanded further

## Summary
SplitNGo is a full-stack application that connects a React frontend, an Express backend, a PostgreSQL database, and an external travel API. The system is structured to be simple, organized, and expandable for future improvements.
