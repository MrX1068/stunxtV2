# StunxtV2 API Endpoints Summary

## Complete API Endpoint Documentation

### **Authentication Endpoints**
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register a new user account |
| POST | `/auth/login` | Login user and get JWT token |
| POST | `/auth/logout` | Logout user (invalidate token) |
| POST | `/auth/refresh` | Refresh JWT token |
| POST | `/auth/forgot-password` | Request password reset |
| POST | `/auth/reset-password` | Reset password with token |

---

## **Community Microservice Endpoints**

### **Core Community Management**
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/communities` | Create a new community |
| GET | `/communities` | Get all communities (with pagination/filters) |
| GET | `/communities/search` | Search communities |
| GET | `/communities/popular` | Get popular communities |
| GET | `/communities/:id` | Get community by ID |
| GET | `/communities/slug/:slug` | Get community by slug |
| PUT | `/communities/:id` | Update community (owner/admin only) |
| DELETE | `/communities/:id` | Delete community (owner only) |

### **Community Membership Management**
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/communities/:id/join` | Join a community |
| DELETE | `/communities/:id/leave` | Leave a community |
| GET | `/communities/:id/members` | Get community members |
| DELETE | `/communities/:id/members/:userId` | Remove member (admin/moderator) |
| PUT | `/communities/:id/members/:userId/role` | Update member role |
| POST | `/communities/:id/members/:userId/ban` | Ban member from community |
| DELETE | `/communities/:id/members/:userId/ban` | Unban member |

### **Community Invitations**
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/communities/:id/invites` | Create community invitation |
| GET | `/communities/:id/invites` | Get community invitations (admin) |
| DELETE | `/communities/:id/invites/:inviteId` | Revoke invitation |
| POST | `/communities/invites/:inviteCode/accept` | Accept invitation |
| POST | `/communities/invites/:inviteCode/reject` | Reject invitation |

### **User's Community Data**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/communities/me/memberships` | Get user's all community memberships |
| GET | `/communities/me/owned` | Get communities owned by user |
| GET | `/communities/me/joined` | Get communities joined by user (not owned) |
| GET | `/communities/me/invites` | Get user's pending invitations |

### **Community Statistics & Analytics**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/communities/:id/stats` | Get community statistics |
| GET | `/communities/:id/audit-logs` | Get community audit logs |
| GET | `/communities/:id/members/recent` | Get recently joined members |
| GET | `/communities/:id/members/banned` | Get banned members list |

### **Public Discovery**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/communities/public/discover` | Discover public communities (no auth) |

---

## **Space Microservice Endpoints**

### **Core Space Management (Community-Scoped)**
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/communities/:communityId/spaces` | Create space in community |
| GET | `/communities/:communityId/spaces` | Get all spaces in community |
| GET | `/communities/:communityId/spaces/search` | Search spaces in community |
| GET | `/communities/:communityId/spaces/popular` | Get popular spaces in community |
| GET | `/communities/:communityId/spaces/:id` | Get space by ID |
| GET | `/communities/:communityId/spaces/name/:name` | Get space by name |
| PUT | `/communities/:communityId/spaces/:id` | Update space |
| DELETE | `/communities/:communityId/spaces/:id` | Delete space |

### **Space Membership Management**
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/communities/:communityId/spaces/:id/join` | Join a space |
| GET | `/communities/:communityId/spaces/:id/members` | Get space members |
| DELETE | `/communities/:communityId/spaces/:id/members/:userId` | Remove member from space |
| PUT | `/communities/:communityId/spaces/:id/members/:userId/role` | Update member role |
| POST | `/communities/:communityId/spaces/:id/members/:userId/ban` | Ban member from space |
| DELETE | `/communities/:communityId/spaces/:id/members/:userId/ban` | Unban member |
| POST | `/communities/:communityId/spaces/:id/transfer-ownership` | Transfer space ownership |

### **User's Space Data (Community-Scoped)**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/communities/:communityId/spaces/me/memberships` | Get user's space memberships in community |
| GET | `/communities/:communityId/spaces/me/owned` | Get spaces owned by user in community |
| GET | `/communities/:communityId/spaces/me/joined` | Get spaces joined by user in community |

### **Space Statistics & Analytics**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/communities/:communityId/spaces/:id/stats` | Get space statistics |
| GET | `/communities/:communityId/spaces/:id/members/banned` | Get banned members list |
| GET | `/communities/:communityId/spaces/:id/members/recent` | Get recently joined members |

---

## **Global Space Endpoints (Cross-Community)**

### **Global Space Discovery**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/spaces/search` | Search all spaces across communities |
| GET | `/spaces/popular` | Get popular spaces globally |

### **User's Global Space Data**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/spaces/me/all` | Get all user's space memberships |
| GET | `/spaces/me/owned` | Get all spaces owned by user |
| GET | `/spaces/me/joined` | Get all spaces joined by user |

---

## **Endpoint Categories by Use Case**

### **For Frontend Dashboard/Profile Pages**
- **User's Communities**: `GET /communities/me/owned`, `GET /communities/me/joined`
- **User's Spaces**: `GET /spaces/me/owned`, `GET /spaces/me/joined`
- **User's Invitations**: `GET /communities/me/invites`
- **User Statistics**: Combine stats from owned communities/spaces

### **For Community Management**
- **Member Management**: `/communities/:id/members/*` endpoints
- **Invitation Management**: `/communities/:id/invites/*` endpoints
- **Analytics**: `GET /communities/:id/stats`, `GET /communities/:id/audit-logs`
- **Moderation**: Ban/unban, role management endpoints

### **For Space Management**
- **Space CRUD**: Standard CRUD operations under `/communities/:communityId/spaces`
- **Member Management**: `/communities/:communityId/spaces/:id/members/*`
- **Analytics**: `GET /communities/:communityId/spaces/:id/stats`

### **For Discovery & Search**
- **Public Discovery**: `GET /communities/public/discover`
- **Search**: `GET /communities/search`, `GET /spaces/search`
- **Popular Content**: `GET /communities/popular`, `GET /spaces/popular`

---

## **Authentication & Authorization**

### **Required Headers**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### **Permission Levels**
- **Owner**: Full control over community/space
- **Admin**: Management permissions, cannot delete
- **Moderator**: Member management, content moderation
- **Member**: Basic access, content creation
- **Restricted**: Limited access, view-only

---

## **Response Formats**

### **Standard Success Response**
```json
{
  "data": { ... },
  "message": "Operation successful",
  "timestamp": "2025-07-26T21:00:00Z"
}
```

### **Paginated Response**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### **Error Response**
```json
{
  "error": "Error message",
  "statusCode": 400,
  "timestamp": "2025-07-26T21:00:00Z",
  "path": "/api/endpoint"
}
```

---

## **Key Features Supported**

### **Enterprise Features**
- ✅ Role-based access control (5-tier hierarchy)
- ✅ Comprehensive audit logging (35+ audit actions)
- ✅ Invitation system with email/link support
- ✅ Member banning and moderation
- ✅ Statistics and analytics
- ✅ Search and discovery
- ✅ Ownership transfer

### **Scalability Features**
- ✅ Pagination on all list endpoints
- ✅ Filtering and sorting options
- ✅ Efficient database queries with proper indexing
- ✅ Caching-ready structure

### **Security Features**
- ✅ JWT-based authentication
- ✅ Permission checking on all operations
- ✅ Input validation and sanitization
- ✅ Rate limiting support
- ✅ Audit trail for all actions

---

## **Missing/Future Endpoints**

### **Potentially Needed for Full Product**
1. **Messaging System**: Direct messages, space messages
2. **File Upload**: Avatar, cover images, file sharing
3. **Notifications**: Push notifications, email notifications
4. **Content Management**: Posts, comments, reactions
5. **Webhooks**: External integrations
6. **Real-time Features**: WebSocket endpoints for live updates
7. **Analytics API**: Detailed analytics and reporting
8. **Backup/Export**: Data export and backup features

---

## **Testing Priority Order**

### **High Priority (Core Functionality)**
1. Authentication (register, login)
2. Community CRUD operations
3. Community membership management
4. Space CRUD operations
5. Space membership management

### **Medium Priority (User Experience)**
1. Search and discovery endpoints
2. User dashboard endpoints (owned/joined)
3. Invitation system
4. Basic statistics

### **Low Priority (Advanced Features)**
1. Audit logging
2. Advanced analytics
3. Moderation features
4. Ownership transfer

This comprehensive API provides a solid foundation for a modern community platform with enterprise-grade features and scalability.
