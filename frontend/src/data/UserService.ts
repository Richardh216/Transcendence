// import axios from 'axios';

// const api = axios.create({
// 	baseURL: 'http://localhost:3000/api',
// 	headers: { 'Content-Type': 'application/json' },
// });

// // Add request interceptor for JWT
// api.interceptors.request.use(config => {
//     const token = localStorage.getItem('authToken'); // Or wherever the token is gonna be
//     if (token) {
//         config.headers['Authorization'] = `Bearer ${token}`;
//     }
//     return config;
// }, error => {
//     return Promise.reject(error);
// });

// // Add response interceptor for 401
// // api.interceptors.response.use(...)

// export default api; // (all this can be exported as api from an api.ts file or something)

import { 
    UserProfile,
    ChatMessage, 
    AppNotification,
    FriendRequest,
    GameInvite,
    GameSettings,
    NotificationOptions
} from './Types.js';

import {
    mockUsers,
    mockMessages,
    mockNotifications,
    mockGameInvites,
    DEFAULT_GAME_SETTINGS
} from './mock_data.js';

import { NotificationManager } from '../components/Notification.js';

// ===== User Management Functions =====

// User lookup functions
export function findUserByUsername(username: string): UserProfile | undefined {
    if (!username) return undefined;
    return mockUsers.find(user => 
        user.username.toLowerCase() === username.toLowerCase()
    );
}

export function findUserByEmail(email: string): UserProfile | undefined {
    if (!email) return undefined;
    return mockUsers.find(user => 
        user.email?.toLowerCase() === email.toLowerCase()
    );
}

// OLD ONE WITH MOCK DATA
export function getUserById(id: number): UserProfile | undefined {
    return mockUsers.find(user => user.id === id);
}

// New Function using backed API
// export async function getUserById(id: number): Promise<UserProfile | undefined> {
// 	try {
// 		// Make GET request to backend endpoint
// 		const response = await api.get(`/users/${id}`);
// 		// If successful, return the data from the backend response
// 		// Axios puts the response body in response.data
// 		return response.data as UserProfile; // Cast to frontend UserProfile type
// 	} catch (error) {
// 		console.error(`Failed to fetch user with ID ${id}:`, error);
// 		// Handle specific error responses
// 		if (axios.isAxiosError(error) && error.response?.status === 404) {
// 			console.warn('User not found.');
// 			return undefined; // We can return undefined or throw a specific error
// 		}
// 		throw error;
// 	}
// }

export function createUser(userData: Partial<UserProfile>): UserProfile {
    const newUser: UserProfile = {
        id: mockUsers.length + 1,
        username: userData.username || '',
        email: userData.email,
        password: userData.password,
        displayName: userData.displayName || userData.username || '',
        avatarUrl: userData.avatarUrl || `https://placehold.co/150x150/7c00e3/ffffff?text=${(userData.displayName || userData.username || '?').charAt(0).toUpperCase()}`,
        joinDate: new Date().toISOString().split('T')[0],
        stats: { wins: 0, losses: 0 },
        // Initialize with default game settings
        gameSettings: { ...DEFAULT_GAME_SETTINGS },
        status: 'online',
        lastActive: new Date()
    };
    
    mockUsers.push(newUser);
    return newUser;
}

export function updateUserProfile(userId: number, updates: Partial<UserProfile>): boolean {
    const userIndex = mockUsers.findIndex(u => u.id === userId);
    if (userIndex === -1) return false;
    
    // Don't allow updating certain fields directly
    const { id, username, password, ...allowedUpdates } = updates;
    
    mockUsers[userIndex] = {
        ...mockUsers[userIndex],
        ...allowedUpdates
    };
    
    return true;
}

// Update user password separately for security
export function updateUserPassword(userId: number, currentPassword: string, newPassword: string): boolean {
    const user = getUserById(userId);
    if (!user || user.password !== currentPassword) return false;
    
    user.password = newPassword;
    return true;
}

// ===== Game Settings Management =====

/**
 * Gets the game settings for a user
 * @param userId The ID of the user
 * @returns The user's game settings or the default settings if not found
 */
export function getUserGameSettings(userId: number): GameSettings {
    const user = getUserById(userId);
    
    // Return user's game settings if they exist, otherwise return default settings
    return user?.gameSettings || {...DEFAULT_GAME_SETTINGS};
}

/**
 * Updates the game settings for a user
 * @param userId The ID of the user
 * @param settings The new settings to save
 * @returns true if successful, false if user not found
 */
export function updateUserGameSettings(userId: number, settings: GameSettings): boolean {
    const userIndex = mockUsers.findIndex(user => user.id === userId);
    if (userIndex === -1) return false;
    
    // In a real app with a database, you'd make an API call here
    mockUsers[userIndex].gameSettings = {...settings};
    
    // Also store in localStorage for persistence between page refreshes
    // In a real app, this would be handled server-side
    try {
        localStorage.setItem(`gameSettings_${userId}`, JSON.stringify(settings));
    } catch (e) {
        console.error('Failed to save game settings to localStorage', e);
    }
    
    return true;
}

/**
 * Resets a user's game settings to default values
 * @param userId The ID of the user
 * @returns true if successful, false if user not found
 */
export function resetUserGameSettings(userId: number): boolean {
    return updateUserGameSettings(userId, {...DEFAULT_GAME_SETTINGS});
}

// ===== Chat-related Functions =====

export function sendMessage(fromUserId: number, toUserId: number, content: string): ChatMessage | null {
    const fromUser = getUserById(fromUserId);
    const toUser = getUserById(toUserId);
    
    if (!fromUser || !toUser || !content.trim()) {
        return null;
    }
    
    const newMessage: ChatMessage = {
        id: mockMessages.length + 1,
        senderId: fromUserId,
        receiverId: toUserId,
        content: content.trim(),
        timestamp: new Date(),
        read: false
    };
    
    mockMessages.push(newMessage);
    return newMessage;
}

export function getUnreadMessageCount(userId: number): number {
    return mockMessages.filter(msg => 
        msg.receiverId === userId && !msg.read
    ).length;
}

export function markMessagesAsRead(fromUserId: number, toUserId: number): void {
    mockMessages.forEach(msg => {
        if (msg.senderId === fromUserId && msg.receiverId === toUserId) {
            msg.read = true;
        }
    });
}

// Function to get conversations for a user
export function getUserConversations(userId: number): any[] {
    const user = getUserById(userId);
    if (!user) return [];
    
    // Get all users who have exchanged messages with current user
    const chatUserIds = [...new Set([
        ...mockMessages
            .filter(msg => msg.senderId === userId || msg.receiverId === userId)
            .map(msg => msg.senderId === userId ? msg.receiverId : msg.senderId)
    ])];
    
    return chatUserIds.map(contactId => {
        const contact = getUserById(contactId);
        if (!contact) return null;
        
        // Get the last message
        const messages = mockMessages.filter(msg => 
            (msg.senderId === userId && msg.receiverId === contactId) || 
            (msg.senderId === contactId && msg.receiverId === userId)
        ).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        
        const lastMessage = messages.length > 0 ? messages[0] : null;
        
        // Get unread count
        const unreadCount = messages.filter(msg => 
            msg.senderId === contactId && 
            msg.receiverId === userId && 
            !msg.read
        ).length;
        
        return {
            user: contact,
            lastMessage,
            unreadCount
        };
    }).filter(Boolean);
}

// ===== Notification Functions =====

// Notification functions
export function getUnreadNotifications(userId: number): AppNotification[] {
    return mockNotifications.filter(notification => 
        notification.userId === userId && !notification.read
    );
}

export function markNotificationAsRead(notificationId: number): boolean {
    const notification = mockNotifications.find(n => n.id === notificationId);
    if (notification) {
        notification.read = true;
        return true;
    }
    return false;
}

export function markAllNotificationsAsRead(userId: number): boolean {
    let updated = false;
    mockNotifications.forEach(notification => {
        if (notification.userId === userId && !notification.read) {
            notification.read = true;
            updated = true;
        }
    });
    return updated;
}

export function deleteNotification(notificationId: number): boolean {
    const index = mockNotifications.findIndex(n => n.id === notificationId);
    if (index !== -1) {
        mockNotifications.splice(index, 1);
        return true;
    }
    return false;
}

export function createNotification(
    userId: number, 
    type: AppNotification['type'], 
    message: string, 
    options?: Partial<Omit<AppNotification, 'id' | 'userId' | 'type' | 'message' | 'read' | 'timestamp'>>
): AppNotification {
    const newNotification: AppNotification = {
        id: mockNotifications.length + 1,
        userId,
        type,
        message,
        read: false,
        timestamp: new Date(),
        ...options
    };
    
    mockNotifications.push(newNotification);
    return newNotification;
}

// ===== Friend Management =====

// Friend-related functions
export function sendFriendRequest(fromUserId: number, toUserId: number): boolean {
    const toUser = getUserById(toUserId);
    if (!toUser) return false;
    
    if (!toUser.friendRequests) {
        toUser.friendRequests = [];
    }
    
    const existingRequest = toUser.friendRequests.find(
        req => req.from === fromUserId && req.status === 'pending'
    );
    
    if (existingRequest) return false;
    
    // Add new request
    const newRequest: FriendRequest = {
        id: Math.max(0, ...toUser.friendRequests.map(r => r.id)) + 1,
        from: fromUserId,
        to: toUserId,
        status: 'pending',
        date: new Date().toISOString().split('T')[0]
    };
    
    toUser.friendRequests.push(newRequest);
    
    // Create notification for recipient
    const fromUser = getUserById(fromUserId);
    if (fromUser) {
        createNotification(
            toUserId, 
            'friendRequest',
            `${fromUser.displayName} sent you a friend request`,
            { relatedUserId: fromUserId }
        );
    }
    
    return true;
}

// export async function sendFriendRequest(fromUserId: number, toUserId: number): Promise<boolean> {
//     try {
//         // This endpoint should be protected. The backend should get the sender ID from req.user.id
//         // and verify it matches fromUserId if that's sent in the body, or ignore fromUserId in body and use req.user.id directly.
//         // Let's assume the backend uses req.user.id and only needs toUserId in the body.
//         const response = await api.post('/api/friend-requests', { // Assuming POST method and this path
//             to_user_id: toUserId, // Use snake_case if that's what backend expects
//             // from_user_id is obtained from the token on the backend
//         });

//         // We expect the backend to return a success status (e.g., 201 Created or 200 OK)
//         // The backend should also handle creating the notification for the recipient.
//         console.log(`Friend request sent from (auth user) to user ${toUserId}. Backend response:`, response.data);
//         return response.status === 201 || response.status === 200;

//     } catch (error) {
//         console.error(`Failed to send friend request to user ${toUserId}:`, error);
//         // Handle specific backend errors:
//         // 401 (interceptor)
//         // 400 (invalid to_user_id, or trying to add self/already friends)
//         // 409 (request already pending)
//         if (axios.isAxiosError(error) && error.response) {
//              console.error('Backend error sending friend request:', error.response.status, error.response.data);
//              throw new Error(error.response.data.message || `Backend error: ${error.response.status}`);
//         }
//         throw error; // Re-throw other errors
//     }
// }

// Function to accept a friend request
export function acceptFriendRequest(userId: number, requestId: number): boolean {
    const user = getUserById(userId);
    if (!user || !user.friendRequests) return false;
    
    const request = user.friendRequests.find(r => r.id === requestId && r.status === 'pending');
    if (!request) return false;
    
    // Update request status
    request.status = 'accepted';
    
    // Add each user to the other's friends list
    const fromUser = getUserById(request.from);
    if (!fromUser) return false;
    
    if (!user.friends) user.friends = [];
    if (!fromUser.friends) fromUser.friends = [];
    
    if (!user.friends.includes(fromUser.id)) {
        user.friends.push(fromUser.id);
    }
    
    if (!fromUser.friends.includes(user.id)) {
        fromUser.friends.push(user.id);
    }
    
    // Create notification for the sender
    createNotification(
        fromUser.id,
        'friendRequest',
        `${user.displayName} accepted your friend request`
    );
    
    return true;
}

// export async function acceptFriendRequest(userId: number, requestId: number): Promise<boolean> {
//     try {
//         // This endpoint must be protected. The backend needs to verify that the request ID
//         // corresponds to a request SENT TO the authenticated user (req.user.id).
//         // We send the request ID in the URL params and the new status in the body.
//         const response = await api.put(`/api/friend-requests/status/${requestId}`, { // Assuming PUT method and this path/params
//             status: 'accepted', // Send the desired status
//             // No need to send userId in body if backend uses req.user.id
//         });

//         // We expect the backend to return a success status (e.g., 200 OK or 204 No Content)
//         // The backend should also handle adding friends to both users and creating the notification.
//          console.log(`Friend request ${requestId} accepted by (auth user). Backend response:`, response.data);
//         return response.status === 200 || response.status === 204;

//     } catch (error) {
//         console.error(`Failed to accept friend request ${requestId} for user ID ${userId}:`, error);
//         // Handle specific backend errors:
//         // 401 (interceptor)
//         // 403 (if backend auth check failed - trying to accept a request not sent to them)
//         // 404 (request ID not found or not pending)
//         if (axios.isAxiosError(error) && error.response) {
//              console.error('Backend error accepting friend request:', error.response.status, error.response.data);
//              throw new Error(error.response.data.message || `Backend error: ${error.response.status}`);
//         }
//         throw error; // Re-throw other errors
//     }
// }

// ===== Game Management =====

// Game invite functions
export function sendGameInvite(fromUserId: number, toUserId: number, gameMode: string = 'classic'): boolean {
    const fromUser = getUserById(fromUserId);
    const toUser = getUserById(toUserId);
    
    if (!fromUser || !toUser) {
        return false;
    }
    
    const newInvite: GameInvite = {
        id: mockGameInvites.length + 1,
        from: fromUserId,
        to: toUserId,
        status: 'pending',
        timestamp: new Date(),
        gameMode
    };
    
    mockGameInvites.push(newInvite);
    
    // Create notification
    createNotification(
        toUserId,
        'gameInvite',
        `${fromUser.displayName} invited you to play a game`,
        { relatedUserId: fromUserId }
    );
    
    return true;
}

// export async function sendGameInvite(fromUserId: number, toUserId: number, gameMode: string = 'classic'): Promise<boolean> {
//     try {
//         // This endpoint should be protected. The backend should get the sender ID from req.user.id
//         // and use it as the 'from' user, and only need toUserId and gameMode in the body.
//         const response = await api.post('/api/game-invites', { // Assuming POST method and this path
//             to_user_id: toUserId, // Use snake_case
//             game_mode: gameMode,   // Use snake_case
//             // from_user_id is obtained from the token on the backend
//         });

//         // We expect the backend to return a success status (e.g., 201 Created or 200 OK)
//         // The backend should also handle creating the notification for the recipient.
//         console.log(`Game invite sent from (auth user) to user ${toUserId}. Backend response:`, response.data);
//         return response.status === 201 || response.status === 200;

//     } catch (error) {
//         console.error(`Failed to send game invite to user ${toUserId}:`, error);
//         // Handle specific backend errors:
//         // 401 (interceptor)
//         // 400 (invalid to_user_id, or trying to invite self/already in game)
//         // 409 (invite already pending)
//         if (axios.isAxiosError(error) && error.response) {
//              console.error('Backend error sending game invite:', error.response.status, error.response.data);
//              throw new Error(error.response.data.message || `Backend error: ${error.response.status}`);
//         }
//         throw error; // Re-throw other errors
//     }
// }

// ===== Leaderboard Functions =====

// Get top players for leaderboard
export function getTopPlayers(sortBy: 'wins' | 'winrate', limit: number = 10): UserProfile[] {
    // Make a copy to avoid modifying the original array
    const players = [...mockUsers];
    
    // Sort based on criteria
    if (sortBy === 'wins') {
        players.sort((a, b) => (b.stats?.wins || 0) - (a.stats?.wins || 0));
    } else if (sortBy === 'winrate') {
        players.sort((a, b) => {
            const aTotal = (a.stats?.wins || 0) + (a.stats?.losses || 0);
            const bTotal = (b.stats?.wins || 0) + (b.stats?.losses || 0);
            
            const aRate = aTotal > 0 ? (a.stats?.wins || 0) / aTotal : 0;
            const bRate = bTotal > 0 ? (b.stats?.wins || 0) / bTotal : 0;
            
            return bRate - aRate;
        });
    }
    
    // Return only the requested number of players
    return players.slice(0, limit);
}

// ===== UI Helper Functions =====

export function getRankIcon(rank: string): string {
    // Extract numeric rank if possible
    const rankNum = parseInt(rank?.replace(/\D/g, '') || '0');
    
    if (rankNum <= 10) return '<i class="fas fa-crown" style="color: gold;"></i>';
    if (rankNum <= 50) return '<i class="fas fa-medal" style="color: silver;"></i>';
    if (rankNum <= 100) return '<i class="fas fa-award" style="color: #cd7f32;"></i>';
    return '<i class="fas fa-chess-pawn"></i>';
}

export function getRankTitle(rank: string): string {
    const rankNum = parseInt(rank?.replace(/\D/g, '') || '0');
    
    if (rankNum <= 10) return 'Grandmaster';
    if (rankNum <= 50) return 'Master';
    if (rankNum <= 100) return 'Expert';
    return 'Amateur';
}

// ===== Game Stats Management =====

export function resetUserStats(userId: number): boolean {
    const user = getUserById(userId);
    if (!user) return false;
    
    user.stats = {
        wins: 0,
        losses: 0,
        rank: undefined,
        level: 1
    };
    
    user.matchHistory = [];
    
    if (user.achievements) {
        user.achievements.forEach(achievement => {
            achievement.completed = false;
            delete achievement.dateCompleted;
        });
    }
    
    return true;
}

// export async function resetUserStats(userId: number): Promise<boolean> {
//     try {
//         // This endpoint must be protected. The backend needs to verify
//         // req.user.id matches the userId from params.
//         // Assuming a DELETE method is appropriate for removing stats
//         const response = await api.delete(`/api/users/stats/${userId}`); // Assuming DELETE method and this path

//         // We expect the backend to return a success status (e.g., 200 OK or 204 No Content)
//          console.log(`Stats reset for user ID ${userId}. Backend response:`, response.data);
//         return response.status === 200 || response.status === 204;

//     } catch (error) {
//         console.error(`Failed to reset stats for user ID ${userId}:`, error);
//          // Handle specific backend errors:
//         // 401 (interceptor)
//         // 403 (if backend auth check failed - trying to reset another user's stats)
//         // 404 (user/stats not found - less likely if auth check passes)
//         if (axios.isAxiosError(error) && error.response) {
//              console.error('Backend error resetting stats:', error.response.status, error.response.data);
//              throw new Error(error.response.data.message || `Backend error: ${error.response.status}`);
//         }
//         throw error; // Re-throw other errors
//     }
// }