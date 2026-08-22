# Getting Started Guide

This guide will help you set up and run the GenYuga EduTech Platform development environment.

## Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (ensure it's running)
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [Git Bash](https://gitforwindows.org/) or any terminal with support for standard CLI tools.

## Step 1: Start Infrastructure (Docker)
The project requires PostgreSQL, Redis, and Kafka to be running.
Run the following command in the root directory:
```bash
docker compose up -d
```
You can verify the status of the containers using:
```bash
docker compose ps
```

## Step 2: Database Setup
Initialize the database and run the migrations:
```bash
npm run migrate
```
*Note: This command specifically runs migrations in the `@genyuga/database` package.*

## Step 3: Run the Application
Start the development servers for all internal applications (API Server, Kafka Worker, and Next.js Frontend):
```bash
npm run dev
```

### Services Summary:
- **API Server**: http://localhost:3001
- **Tenant Web (Frontend)**: http://localhost:3000
- **Kafka Worker**: Running in the background to process events.

## Troubleshooting
- **Connection Refused (9092)**: Ensure Docker is running and the Kafka container is up.
- **Missing name 'dotenv'**: If you see this in the logs, ensure you have the `import dotenv from 'dotenv';` at the top of your config files (Already fixed in current branch).
- **Module not found**: Run `npm install` at the project root to ensure all dependencies across all workspaces are up to date.
