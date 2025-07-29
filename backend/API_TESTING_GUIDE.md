# StunxtV2 API Testing Guide

## Community and Space Microservices Test Plan

### Prerequisites
1. Server should be running on `http://localhost:3000`
2. You need a valid JWT token for authentication
3. Database should be connected and synchronized

### Authentication
First, you need to authenticate and get a JWT token:

```bash
# Register a new user
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123!",
    "firstName": "Test",
    "lastName": "User"
  }'

# Login to get JWT token
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123!"
  }'
```

### Community API Tests

```bash
# Set your JWT token (replace with actual token from login)
export JWT_TOKEN="your_jwt_token_here"

# Create a new community
curl -X POST http://localhost:3000/communities \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Tech Community",
    "description": "A community for tech enthusiasts",
    "type": "public"
  }'

# Get all communities
curl -X GET http://localhost:3000/communities \
  -H "Authorization: Bearer $JWT_TOKEN"

# Get community by ID (replace with actual community ID)
curl -X GET http://localhost:3000/communities/{community-id} \
  -H "Authorization: Bearer $JWT_TOKEN"

# Join a community
curl -X POST http://localhost:3000/communities/{community-id}/join \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'

# Get community members
curl -X GET http://localhost:3000/communities/{community-id}/members \
  -H "Authorization: Bearer $JWT_TOKEN"
```

### Space API Tests

```bash
# Create a new space in a community
curl -X POST http://localhost:3000/communities/{community-id}/spaces \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "General Discussion",
    "description": "Main discussion space for the community",
    "type": "public"
  }'

# Get all spaces in a community
curl -X GET http://localhost:3000/communities/{community-id}/spaces \
  -H "Authorization: Bearer $JWT_TOKEN"

# Get space by ID
curl -X GET http://localhost:3000/communities/{community-id}/spaces/{space-id} \
  -H "Authorization: Bearer $JWT_TOKEN"

# Join a space
curl -X POST http://localhost:3000/communities/{community-id}/spaces/{space-id}/join \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'

# Get space members
curl -X GET http://localhost:3000/communities/{community-id}/spaces/{space-id}/members \
  -H "Authorization: Bearer $JWT_TOKEN"

# Search spaces in a community
curl -X GET "http://localhost:3000/communities/{community-id}/spaces/search?q=discussion" \
  -H "Authorization: Bearer $JWT_TOKEN"

# Get popular spaces
curl -X GET http://localhost:3000/communities/{community-id}/spaces/popular \
  -H "Authorization: Bearer $JWT_TOKEN"
```

### Global Space API Tests

```bash
# Search all spaces across communities
curl -X GET "http://localhost:3000/spaces/search?q=tech" \
  -H "Authorization: Bearer $JWT_TOKEN"

# Get popular spaces globally
curl -X GET http://localhost:3000/spaces/popular \
  -H "Authorization: Bearer $JWT_TOKEN"

# Get all user's space memberships
curl -X GET http://localhost:3000/spaces/me/all \
  -H "Authorization: Bearer $JWT_TOKEN"
```

### Management API Tests

```bash
# Update community (owner/admin only)
curl -X PUT http://localhost:3000/communities/{community-id} \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Updated community description"
  }'

# Update space (owner/admin/moderator only)
curl -X PUT http://localhost:3000/communities/{community-id}/spaces/{space-id} \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Updated space description"
  }'

# Update member role (owner/admin only)
curl -X PUT http://localhost:3000/communities/{community-id}/members/{user-id}/role \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "moderator"
  }'

# Ban a member (owner/admin/moderator only)
curl -X POST http://localhost:3000/communities/{community-id}/members/{user-id}/ban \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Violation of community guidelines"
  }'
```

### Statistics API Tests

```bash
# Get community statistics
curl -X GET http://localhost:3000/communities/{community-id}/stats \
  -H "Authorization: Bearer $JWT_TOKEN"

# Get space statistics
curl -X GET http://localhost:3000/communities/{community-id}/spaces/{space-id}/stats \
  -H "Authorization: Bearer $JWT_TOKEN"

# Get community audit logs
curl -X GET http://localhost:3000/communities/{community-id}/audit-logs \
  -H "Authorization: Bearer $JWT_TOKEN"
```

## Expected Response Formats

### Community Response
```json
{
  "id": "uuid",
  "name": "Tech Community",
  "slug": "tech-community",
  "description": "A community for tech enthusiasts",
  "type": "public",
  "status": "active",
  "memberCount": 1,
  "ownerId": "uuid",
  "createdAt": "2025-07-26T...",
  "updatedAt": "2025-07-26T..."
}
```

### Space Response
```json
{
  "id": "uuid",
  "name": "General Discussion",
  "description": "Main discussion space",
  "type": "public",
  "status": "active",
  "memberCount": 1,
  "communityId": "uuid",
  "ownerId": "uuid",
  "createdAt": "2025-07-26T...",
  "updatedAt": "2025-07-26T..."
}
```

## Testing Workflow

1. **Setup**: Register user and login to get JWT token
2. **Community Creation**: Create a test community
3. **Community Membership**: Join the community  
4. **Space Creation**: Create spaces within the community
5. **Space Membership**: Join the spaces
6. **Management**: Test role updates, bans, etc.
7. **Search & Discovery**: Test search and popular content APIs
8. **Statistics**: Verify stats and audit logging

## Error Handling Tests

Test these scenarios to verify proper error handling:
- Unauthorized access (no JWT token)
- Forbidden actions (insufficient permissions)
- Invalid UUIDs
- Duplicate names
- Non-existent resources
- Invalid input data

## Performance Tests

For production readiness, test:
- Pagination with large datasets
- Search performance
- Concurrent user operations
- Rate limiting behavior
