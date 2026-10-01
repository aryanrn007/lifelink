/**
 * @typedef {Object} Location
 * @property {number} lat - Latitude coordinate
 * @property {number} lng - Longitude coordinate
 */

/**
 * @typedef {Object} EmergencyResponder
 * @property {string} uid - Responder's user ID
 * @property {string} name - Responder's display name
 * @property {"patient"|"aed"} role - Either "patient" (first aid) or "aed" (AED operator)
 * @property {number} distanceM - Distance from emergency in meters
 * @property {import('firebase/firestore').Timestamp} acceptedAt - When the responder accepted
 */

/**
 * @typedef {Object} Emergency
 * @property {string} callerUid - UID of the user who created the emergency
 * @property {string} callerName - Display name of the caller
 * @property {string} callerCollegeId - College/university ID of the caller
 * @property {string} type - Type of emergency (e.g., "cardiac", "injury", "other")
 * @property {"open"|"accepted"|"resolved"|"cancelled"} status - Current status
 * @property {Location} location - GPS coordinates of the emergency
 * @property {number} radiusM - Search radius in meters (starts at 500)
 * @property {import('firebase/firestore').Timestamp} createdAt - When the emergency was created
 * @property {import('firebase/firestore').Timestamp} expandedAt - When the search radius was last expanded
 * @property {EmergencyResponder[]} responders - List of responders who have accepted
 */

/**
 * @typedef {Object} Responder
 * @property {string} name - Display name of the responder
 * @property {string} collegeId - College/university ID
 * @property {string} skill - Skill level or certification (e.g., "basic", "advanced", "aed")
 * @property {boolean} onDuty - Whether the responder is currently available to respond
 * @property {Location} location - Current GPS coordinates
 * @property {import('firebase/firestore').Timestamp} updatedAt - Last time the responder's location was updated
 */

/**
 * @typedef {Object} Resource
 * @property {"aed"|"kit"} kind - Type of resource
 * @property {string} name - Human-readable name/description
 * @property {number} lat - Latitude coordinate
 * @property {number} lng - Longitude coordinate
 */
