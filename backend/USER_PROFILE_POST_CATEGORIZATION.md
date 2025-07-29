# User Profile Post Categorization Guide

## Overview

This guide explains the new post categorization features that allow users to organize and view their posts in different ways within their profiles. The system now properly separates personal posts from community and space posts, providing comprehensive statistics and filtering options.

## Key Features

### 1. Post Type Filtering
Users can now filter their posts by type:
- **Personal Posts**: Posts created outside of any community or space
- **Community Posts**: Posts created within communities
- **Space Posts**: Posts created within spaces
- **All Posts**: Combined view of all post types

### 2. User Post Statistics
Comprehensive statistics provide insights into user activity:
- Total post count across all types
- Breakdown by post type (personal/community/space)
- Community-specific post counts with community names
- Space-specific post counts with space names

### 3. Privacy and Visibility Controls
Proper access control ensures users see appropriate content:
- Users can see all their own posts (including private ones)
- Followers can see public and follower-only posts
- Non-followers can only see public posts
- Anonymous users can only see public posts

## API Endpoints

### Get User Posts with Filtering

```http
GET /api/posts/user/{userId}?postType={type}&communityId={id}&spaceId={id}
```

**Parameters:**
- `userId` (required): Target user's ID
- `postType` (optional): Filter by post type
  - `all` (default): All posts
  - `personal`: Personal posts only
  - `community`: Community posts only
  - `space`: Space posts only
- `communityId` (optional): Filter posts from specific community (use with `postType=community`)
- `spaceId` (optional): Filter posts from specific space (use with `postType=space`)
- `limit` (optional): Number of posts per page (default: 20)
- `offset` (optional): Pagination offset (default: 0)

**Example Requests:**

```javascript
// Get all posts for user
GET /api/posts/user/123e4567-e89b-12d3-a456-426614174000

// Get only personal posts
GET /api/posts/user/123e4567-e89b-12d3-a456-426614174000?postType=personal

// Get posts from specific community
GET /api/posts/user/123e4567-e89b-12d3-a456-426614174000?postType=community&communityId=comm-123

// Get posts from specific space
GET /api/posts/user/123e4567-e89b-12d3-a456-426614174000?postType=space&spaceId=space-456
```

**Response:**
```json
{
  "success": true,
  "data": {
    "posts": [...],
    "total": 45,
    "currentPage": 1,
    "totalPages": 3
  },
  "message": "User posts retrieved successfully"
}
```

### Get User Post Statistics

```http
GET /api/posts/user/{userId}/stats
```

**Parameters:**
- `userId` (required): Target user's ID

**Example Request:**
```javascript
GET /api/posts/user/123e4567-e89b-12d3-a456-426614174000/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 45,
    "personal": 20,
    "community": 15,
    "space": 10,
    "communityBreakdown": [
      {
        "communityId": "comm-123",
        "communityName": "Tech Discussions",
        "count": 8
      },
      {
        "communityId": "comm-456", 
        "communityName": "JavaScript Developers",
        "count": 7
      }
    ],
    "spaceBreakdown": [
      {
        "spaceId": "space-123",
        "spaceName": "Project Alpha",
        "count": 6
      },
      {
        "spaceId": "space-456",
        "spaceName": "Team Beta", 
        "count": 4
      }
    ]
  },
  "message": "User post statistics retrieved successfully"
}
```

## Frontend Implementation Examples

### React Component for User Profile Posts

```tsx
import React, { useState, useEffect } from 'react';

interface UserProfilePostsProps {
  userId: string;
  currentUserId?: string;
}

const UserProfilePosts: React.FC<UserProfilePostsProps> = ({ userId, currentUserId }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'personal' | 'community' | 'space'>('all');
  const [posts, setPosts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchUserPosts(userId, activeTab),
      fetchUserStats(userId)
    ]).then(([postsData, statsData]) => {
      setPosts(postsData.posts);
      setStats(statsData);
      setLoading(false);
    });
  }, [userId, activeTab]);

  const fetchUserPosts = async (userId: string, postType: string) => {
    const response = await fetch(`/api/posts/user/${userId}?postType=${postType}`);
    return response.json();
  };

  const fetchUserStats = async (userId: string) => {
    const response = await fetch(`/api/posts/user/${userId}/stats`);
    const data = await response.json();
    return data.data;
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="user-profile-posts">
      {/* Statistics Overview */}
      <div className="post-stats">
        <div className="stat-item">
          <span className="count">{stats.total}</span>
          <span className="label">Total Posts</span>
        </div>
        <div className="stat-item">
          <span className="count">{stats.personal}</span>
          <span className="label">Personal</span>
        </div>
        <div className="stat-item">
          <span className="count">{stats.community}</span>
          <span className="label">Communities</span>
        </div>
        <div className="stat-item">
          <span className="count">{stats.space}</span>
          <span className="label">Spaces</span>
        </div>
      </div>

      {/* Post Type Tabs */}
      <div className="post-tabs">
        <button 
          className={activeTab === 'all' ? 'active' : ''}
          onClick={() => setActiveTab('all')}
        >
          All Posts ({stats.total})
        </button>
        <button 
          className={activeTab === 'personal' ? 'active' : ''}
          onClick={() => setActiveTab('personal')}
        >
          Personal ({stats.personal})
        </button>
        <button 
          className={activeTab === 'community' ? 'active' : ''}
          onClick={() => setActiveTab('community')}
        >
          Communities ({stats.community})
        </button>
        <button 
          className={activeTab === 'space' ? 'active' : ''}
          onClick={() => setActiveTab('space')}
        >
          Spaces ({stats.space})
        </button>
      </div>

      {/* Posts List */}
      <div className="posts-list">
        {posts.map(post => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>

      {/* Community/Space Breakdown */}
      {activeTab === 'community' && stats.communityBreakdown.length > 0 && (
        <div className="breakdown-section">
          <h3>Communities</h3>
          {stats.communityBreakdown.map(community => (
            <div key={community.communityId} className="breakdown-item">
              <span>{community.communityName}</span>
              <span>{community.count} posts</span>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'space' && stats.spaceBreakdown.length > 0 && (
        <div className="breakdown-section">
          <h3>Spaces</h3>
          {stats.spaceBreakdown.map(space => (
            <div key={space.spaceId} className="breakdown-item">
              <span>{space.spaceName}</span>
              <span>{space.count} posts</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

## Database Considerations

### Performance Optimization

1. **Indexing**: Ensure proper indexes on frequently queried columns:
   ```sql
   CREATE INDEX idx_posts_author_community ON posts(authorId, communityId) WHERE communityId IS NOT NULL;
   CREATE INDEX idx_posts_author_space ON posts(authorId, spaceId) WHERE spaceId IS NOT NULL;
   CREATE INDEX idx_posts_author_personal ON posts(authorId) WHERE communityId IS NULL AND spaceId IS NULL;
   ```

2. **Query Optimization**: The service uses efficient TypeORM query builders with proper joins and filtering.

### Data Consistency

- Posts are properly categorized based on `communityId` and `spaceId` fields
- Null values in both fields indicate personal posts
- Statistics are calculated in real-time for accuracy

## Testing

Use the provided test script to validate functionality:

```powershell
# Update the script with your test data
$TestUserId = "your-test-user-id"
$AuthToken = "your-auth-token"

# Run the test
.\test-post-categorization.ps1
```

The test script validates:
- Post filtering by type
- Statistics accuracy
- Data consistency
- Privacy controls
- Anonymous access

## Security Considerations

1. **Access Control**: Proper visibility filtering based on user relationships
2. **Privacy Protection**: Private posts only visible to post owner
3. **Community/Space Privacy**: Respects community and space visibility settings
4. **Rate Limiting**: Consider implementing rate limiting for statistics endpoints

## Future Enhancements

1. **Caching**: Implement Redis caching for frequently accessed statistics
2. **Real-time Updates**: WebSocket notifications for post statistics changes
3. **Advanced Filtering**: Date ranges, post types, engagement metrics
4. **Export Features**: Allow users to export their post data
5. **Analytics**: Detailed engagement analytics per post category

## Troubleshooting

### Common Issues

1. **Missing Statistics**: Ensure proper database permissions and indexes
2. **Inconsistent Counts**: Check for concurrent post creation/deletion
3. **Performance Issues**: Monitor query execution times and optimize as needed
4. **Privacy Leaks**: Verify visibility filtering logic in development/staging

### Debug Information

Enable debug logging to track query performance:

```typescript
// In development, add query logging
console.log('Query execution time:', performance.now() - startTime);
console.log('Filtered posts count:', posts.length);
```
