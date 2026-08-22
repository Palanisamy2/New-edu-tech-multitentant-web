# GenYuga Platform: API reference

This document provides a structured architectural overview of all available RESTful endpoints in the GenYuga multi-tenant SaaS.

## Base URL
`http://localhost:3001/api/v1`

## Authentication & Identity
| Endpoint | Method | Role | Description |
| :--- | :--- | :--- | :--- |
| `/auth/login` | `POST` | Public | Authenticate via Email/Password. Returns JWT. |
| `/auth/google` | `POST` | Public | Authenticate via Google OAuth. |
| `/user/profile` | `GET` | Auth | Fetch active user identity and role. |
| `/user/profile` | `PUT` | Auth | Update name/avatar. |

## Super-Admin (Platform Level)
| Endpoint | Method | Role | Description |
| :--- | :--- | :--- | :--- |
| `/super-admin/stats` | `GET` | Super | Global platform stats (Tenants, Revenue). |
| `/super-admin/tenants` | `POST` | Super | **Provision new institute** (Creates schema/DB). |
| `/super-admin/tenants` | `GET` | Super | List all registered institutes. |

## Institute Finance & Ledger
| Endpoint | Method | Role | Description |
| :--- | :--- | :--- | :--- |
| `/finance/summary` | `GET` | Admin | Aggregate institute revenue and pending fees. |
| `/finance/enroll` | `POST` | Auth | Enroll a student in a course (Inits ledger). |
| `/finance/cash-payment`| `POST` | Admin | **Log Physical Cash** (Sequential receipt generation).|

## Course & Content
| Endpoint | Method | Role | Description |
| :--- | :--- | :--- | :--- |
| `/courses` | `GET`| Public | Browse active course catalog. |
| `/courses` | `POST` | Admin | Create a new course. |

## Trainer Workspace
| Endpoint | Method | Role | Description |
| :--- | :--- | :--- | :--- |
| `/trainer/batches` | `GET` | Trainer | List cohorts assigned to the trainer. |
| `/trainer/schedule`| `GET` | Trainer | View upcoming live class calendar. |
| `/trainer/lessons/:id/start-live`| `POST` | Trainer | Manually activate a live session. |

## Student Portal
| Endpoint | Method | Role | Description |
| :--- | :--- | :--- | :--- |
| `/student/dashboard`| `GET` | Student | Personalized progress and upcoming class list. |
| `/student/lessons/:id`| `GET` | Student | Access lesson content (Time-locked link reveal). |

---

### Header Requirements
- `x-tenant-slug`: Required for all non-super-admin routes to scope the database.
- `Authorization`: `Bearer <token>` required for all protected routes.
