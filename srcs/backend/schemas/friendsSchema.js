const Friend = {
	type: 'object',
	properties: {
		user_id: { type: 'integer' },
		friend_id: { type: 'integer' },
		// Note: We might join with the users table in controllers to return friend details
	},
};

// Schema for returning a list of friends (joining with users table)
const FriendDetails = {
	type: 'object',
	properties: {
		user_id: { type: 'integer' }, // The ID of the user whose friends are being listed
		friend_id: { type: 'integer' }, // The ID of the friend
		friend_username: { type: 'string' },
		friend_display_name: { type: 'string' },
		friend_avatar_url: { type: 'string' },
		friend_status: { type: 'string' },
		friend_last_active: { type: 'string' },
		// Add other user details for the friend as needed
	}
}


module.exports = {
	Friend,
	FriendDetails,
};
