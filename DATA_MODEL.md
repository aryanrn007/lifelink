# Firestore Data Model

This document defines the Firestore data model for LifeLink. All field names and structures are final - do not rename fields in later phases as Phases 3-5 depend on this schema.

## Collections

### `emergencies/{id}`

Represents an emergency request created by a caller.

**Fields:**
- `callerUid` (string): UID of the user who created the emergency
- `callerName` (string): Display name of the caller
- `callerCollegeId` (string): College/university ID of the caller
- `type` (string): Type of emergency (e.g., "cardiac", "injury", "other")
- `status` (string): Current status - one of:
  - `"open"` - Emergency created, waiting for responders
  - `"accepted"` - At least one responder has accepted
  - `"resolved"` - Emergency has been resolved
  - `"cancelled"` - Emergency was cancelled by caller
- `location` (object): GPS coordinates of the emergency
  - `lat` (number): Latitude
  - `lng` (number): Longitude
- `radiusM` (number): Search radius in meters (starts at 500, can expand)
- `createdAt` (timestamp): When the emergency was created
- `expandedAt` (timestamp): When the search radius was last expanded
- `responders` (array): List of responders who have accepted
  - `uid` (string): Responder's user ID
  - `name` (string): Responder's display name
  - `role` (string): Either "patient" (first aid) or "aed" (AED operator)
  - `distanceM` (number): Distance from emergency in meters
  - `acceptedAt` (timestamp): When the responder accepted

### `responders/{uid}`

Represents a volunteer first-aid responder.

**Fields:**
- `name` (string): Display name of the responder
- `collegeId` (string): College/university ID
- `skill` (string): Skill level or certification (e.g., "basic", "advanced", "aed")
- `onDuty` (boolean): Whether the responder is currently available to respond
- `location` (object): Current GPS coordinates
  - `lat` (number): Latitude
  - `lng` (number): Longitude
- `updatedAt` (timestamp): Last time the responder's location was updated (used in Phase 3 for real-time tracking)

### `resources/{id}`

Represents fixed emergency resources like AEDs or first-aid kits.

**Fields:**
- `kind` (string): Type of resource - either `"aed"` or `"kit"`
- `name` (string): Human-readable name/description
- `lat` (number): Latitude coordinate
- `lng` (number): Longitude coordinate

**Note:** Used in Phase 4 for resource discovery and routing.

## Index Requirements

The following Firestore indexes may be required for efficient queries:

1. **responders** collection: Index on `onDuty` and `location` for finding nearby active responders
2. **emergencies** collection: Index on `status` and `createdAt` for querying open emergencies
3. **resources** collection: Geospatial index for nearest resource queries

## Usage Notes

- All timestamps should use Firestore server timestamps via `serverTimestamp()`
- Location objects follow standard GeoJSON format (lat/lng)
- The `responders` array in emergencies is used to track who has accepted a given emergency
- `radiusM` in emergencies starts at 500m and can be expanded if no responders are found
