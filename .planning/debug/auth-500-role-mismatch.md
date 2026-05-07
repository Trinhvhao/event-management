---
status: investigating
trigger: "Debug lỗi 500 khi gọi GET /api/auth/me (auth controller getProfile). Sau khi sync database enum từ student/teacher/external -> participant, Prisma báo lỗi không match giữa schema và database."
created: 2026-05-07T17:49:00+07:00
updated: 2026-05-07T17:51:00+07:00
---

## Current Focus

hypothesis: "ROOT CAUSE FOUND - Schema mismatch between prisma/schema.prisma and database"
test: "Compared schema.prisma with Prisma client cache and database sync script"
expecting: "Confirmed: schema.prisma has OLD enum, database has NEW enum"
next_action: "Compile final report with all affected files"

## Symptoms

expected: "GET /api/auth/me returns user profile successfully"
actual: "500 Internal Server Error - Prisma enum mismatch"
errors: ["Prisma schema mismatch - enum value not found in database"]
reproduction: "Call GET /api/auth/me endpoint"
started: "After running prisma/sync-user-roles.ts to sync database enum"

## Eliminated

- **Hypothesis:** Hardcoded role checks in guards/middleware
  **Evidence:** Middleware uses dynamic UserRole type, not hardcoded strings
- **Hypothesis:** Auth validator using wrong enum
  **Evidence:** Validator already uses ['participant', 'organizer', 'admin']

## Evidence

- timestamp: 2026-05-07T17:50:00
  checked: "prisma/schema.prisma UserRole enum (lines 13-19)"
  found: "Has OLD values: student, organizer, admin, teacher, external"
  implication: "Schema does NOT match the database which was synced to participant/organizer/admin"

- timestamp: 2026-05-07T17:50:30
  checked: "node_modules/.prisma/client/index.js cached schema"
  found: "Has OLD values: participant, organizer, admin (generated from schema.prisma)"
  implication: "The OLD schema was used to generate Prisma client"

- timestamp: 2026-05-07T17:51:00
  checked: "backend/prisma/sync-user-roles.ts"
  found: "Sync script updates database: student/teacher/external -> participant"
  implication: "Database was successfully updated, but schema.prisma was NOT updated"

- timestamp: 2026-05-07T17:51:00
  checked: "auth.service.ts participant_type field"
  found: "Uses separate ParticipantType enum (student/teacher/external) correctly"
  implication: "This part is correct - student/teacher/external belong to participant_type"

## Resolution

root_cause: |
  Schema mismatch between prisma/schema.prisma and database:
  - Database (via sync-user-roles.ts): UserRole = participant, organizer, admin
  - Schema.prisma (lines 13-19): UserRole = student, organizer, admin, teacher, external
  - Prisma Client was generated from OLD schema
  - When getProfile tries to deserialize user.role from DB ('participant'), Prisma client expects one of: student, organizer, admin, teacher, external
  - This causes "Invalid enum value" error → 500

fix: |
  1. Update prisma/schema.prisma UserRole enum to match database:
     FROM: student, organizer, admin, teacher, external
     TO: participant, organizer, admin
  2. Regenerate Prisma Client: npx prisma generate
  3. Fix seed-test-payment.ts line 16: role: 'student' → role: 'participant'
  4. Update all test files using role: 'student' (or accept they will fail until migrated)

verification: |
  1. Check schema.prisma UserRole enum matches: participant, organizer, admin
  2. Run: npx prisma validate
  3. Run: npx prisma generate
  4. Test: GET /api/auth/me should return 200

files_changed: []
