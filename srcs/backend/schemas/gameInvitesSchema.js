const GameInvite = {
	type: 'object',
	properties: {
		id: { type: 'integer' },
		from_user_id: { type: 'integer' },
		to_user_id: { type: 'integer' },
		status: { type: 'string' }, // 'pending', 'accepted', 'rejected', 'expired'
		timestamp: { type: 'string' },
		game_mode: { type: 'string' },
	},
};

// Schema for returning game invite details (joining with users table)
const GameInviteDetails = {
	type: 'object',
	properties: {
		id: { type: 'integer' },
		from_user_id: { type: 'integer' },
		to_user_id: { type: 'integer' },
		status: { type: 'string' },
		timestamp: { type: 'string' },
		game_mode: { type: 'string' },
		from_username: { type: 'string' },
		from_display_name: { type: 'string' },
		from_avatar_url: { type: 'string' },
		to_username: { type: 'string' },
		to_display_name: { type: 'string' },
		to_avatar_url: { type: 'string' },
	}
}


module.exports = {
	GameInvite,
	GameInviteDetails,
};
