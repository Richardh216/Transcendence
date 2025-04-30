// Helper function for getting invite details with user joins
const getInviteDetailsQuery = `
	SELECT
		gi.id,
		gi.from_user_id,
		gi.to_user_id,
		gi.status,
		gi.timestamp,
		gi.game_mode,
		uf.username AS from_username,
		uf.display_name AS from_display_name,
		uf.avatar_url AS from_avatar_url,
		ut.username AS to_username,
		ut.display_name AS to_display_name,
		ut.avatar_url AS to_avatar_url
	FROM game_invites gi
	JOIN users uf ON gi.from_user_id = uf.id
	JOIN users ut ON gi.to_user_id = ut.id
`;

const getGameInvites = async (req, reply) => {
	try {
		const db = req.server.betterSqlite3;

		// Get all game invites with sender/receiver details
		const invites = db.prepare(getInviteDetailsQuery).all();

		reply.send(invites);
	} catch (error) {
		req.log.error(error);
		reply.code(500).send({ message: 'Error retrieving game invites' });
	}
};

const getGameInvite = async (req, reply) => {
	try {
		const { id } = req.params;
		const db = req.server.betterSqlite3;

		// Get a single game invite by ID with sender/receiver details
		const invite = db.prepare(`${getInviteDetailsQuery} WHERE gi.id = ?`).get(id);

		if (!invite) {
			reply.code(404).send({ message: 'Game invite not found' });
		} else {
			reply.send(invite);
		}
	} catch (error) {
		req.log.error(error);
		reply.code(500).send({ message: 'Error retrieving game invite' });
	}
};

const getSentGameInvites = async (req, reply) => {
	try {
		const { userId } = req.params;
		const db = req.server.betterSqlite3;

		// Get game invites sent by a specific user with sender/receiver details
		const invites = db.prepare(`${getInviteDetailsQuery} WHERE gi.from_user_id = ?`).all(userId);

		reply.send(invites);
	} catch (error) {
		req.log.error(error);
		reply.code(500).send({ message: 'Error retrieving sent game invites' });
	}
};

const getReceivedGameInvites = async (req, reply) => {
	try {
		const { userId } = req.params;
		const db = req.server.betterSqlite3;

		// Get game invites received by a specific user (usually pending)
		const invites = db.prepare(`${getInviteDetailsQuery} WHERE gi.to_user_id = ? AND gi.status = 'pending'`).all(userId);

		reply.send(invites);
	} catch (error) {
		req.log.error(error);
		reply.code(500).send({ message: 'Error retrieving received game invites' });
	}
};

const addGameInvite = async (req, reply) => {
	try {
		const { from_user_id, to_user_id, game_mode } = req.body; // game_mode is optional in DB but can be sent in body
		const db = req.server.betterSqlite3;

		// 1. Basic validation
		if (!from_user_id || !to_user_id) {
			reply.code(400).send({ message: 'from_user_id and to_user_id are required' });
			return;
		}

		// Cannot invite yourself
		if (from_user_id === to_user_id) {
			reply.code(400).send({ message: 'Cannot send a game invite to yourself' });
			return;
		}

		// 2. Check if users exist
		const fromUserExists = db.prepare('SELECT id FROM users WHERE id = ?').get(from_user_id);
		const toUserExists = db.prepare('SELECT id FROM users WHERE id = ?').get(to_user_id);

		if (!fromUserExists || !toUserExists) {
			reply.code(400).send({ message: 'Invalid from_user_id or to_user_id' });
			return;
		}

		// 3. Check if a PENDING invite already exists between these two users (in either direction)
		// This prevents spamming invites or conflicting invites
		try { // Use a nested try/catch for database checks before insert
			const existingPendingInvite = db.prepare('SELECT id FROM game_invites WHERE ((from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?)) AND status = ?').get(from_user_id, to_user_id, to_user_id, from_user_id, 'pending');

			if (existingPendingInvite) {
				reply.code(409).send({ message: 'A pending game invite already exists between these users' });
				return;
			}
		} catch (dbCheckError) {
			 req.log.error(`Database check error in addGameInvite (existing pending): ${dbCheckError.message}`, dbCheckError);
			 // Return a 500 if the check itself failed (e.g., table doesn't exist)
			 reply.code(500).send({ message: 'Error checking for existing game invite' });
			 return; // Important to return after sending reply
		}

		// 4. Insert the new game invite
		try {
			// status defaults to 'pending', timestamp defaults to CURRENT_TIMESTAMP
			const result = db.prepare('INSERT INTO game_invites (from_user_id, to_user_id, status, game_mode) VALUES (?, ?, ?, ?)').run(from_user_id, to_user_id, 'pending', game_mode || null);
			const newInviteId = result.lastInsertedRowid;

			// Retrieve the newly inserted invite with the actual timestamp and status
			const newInvite = db.prepare('SELECT * FROM game_invites WHERE id = ?').get(newInviteId);

			reply.code(201).send(newInvite); // Return the basic GameInvite object
		} catch (err) {
			req.log.error(`Database insert error in addGameInvite: ${err.message}`, err);
			// Catch specific DB errors if needed, otherwise general 500
			reply.code(500).send({ message: 'Error adding game invite', error: err.message });
		}
	} catch (error) {
		req.log.error(`Unexpected error in addGameInvite: ${error.message}`, error);
		reply.code(500).send({ message: 'Error processing request to add game invite' });
	}
};

const updateGameInviteStatus = async (req, reply) => {
	try {
		const { id } = req.params;
		const { status } = req.body; // 'accepted', 'rejected', or 'expired' (expired would likely be handled by a separate process or endpoint, but included here for completeness)
		const db = req.server.betterSqlite3;

		// 1. Validate the requested status value
		const allowedStatuses = ['accepted', 'rejected', 'expired'];
		if (!status || !allowedStatuses.includes(status)) {
			reply.code(400).send({ message: `status is required and must be one of: ${allowedStatuses.join(', ')}` });
			return;
		}

		// 2. Find the invite by ID and ensure it is currently 'pending'
		// We only allow updating pending invites to accepted/rejected/expired via this endpoint
		// Use parameter binding for status
		const invite = db.prepare('SELECT id, from_user_id, to_user_id, game_mode FROM game_invites WHERE id = ? AND status = ?').get(id, 'pending');

		// 3. If no pending invite is found with that ID, return 404
		if (!invite) {
			reply.code(404).send({ message: 'Pending game invite not found or no longer pending' });
			return;
		}

		// Get sender and receiver IDs from the fetched invite
		const { from_user_id, to_user_id, game_mode } = invite;

		// 4. Update the invite status in the database
		try {
			const updateResult = db.prepare('UPDATE game_invites SET status = ? WHERE id = ?').run(status, id);

			if (updateResult.changes === 0) {
				 // Should not happen if invite was found, but good defensive programming
				 req.log.warn(`Update status failed for game invite ${id} unexpectedly.`);
				 reply.code(500).send({ message: 'Failed to update game invite status' });
				 return; // Important to return after sending reply
			}
		} catch (dbUpdateError) {
			 req.log.error(`Database update error in updateGameInviteStatus: ${dbUpdateError.message}`, dbUpdateError);
			 reply.code(500).send({ message: 'Error updating game invite status in database' });
			 return; // Important to return after sending reply
		}

		// 5. Handle 'accepted' status - this is where game initiation logic would go
		// NOTE: This controller's responsibility is primarily updating the invite state.
		// Initiating the actual game based on the accepted invite is typically handled elsewhere
		// (e.g., a game server process listening for status updates, or the frontend
		// triggering another API call to a matchmaking/game creation service).
		if (status === 'accepted') {
			req.log.info(`Game invite ${id} accepted. Initiating game between ${from_user_id} and ${to_user_id} for mode ${game_mode || 'default'}.`);
			// --- Placeholder for Game Initiation Logic ---
			// You would likely emit a WebSocket event, send a message to a queue,
			// or call an internal service here to start the game.
			// Do NOT put complex game starting logic directly blocking the HTTP response.
			// ---------------------------------------------

			// Send success response for acceptance
			reply.send({ message: 'Game invite accepted', inviteId: id, from_user_id, to_user_id, game_mode });

		} else if (status === 'rejected') {
			 // Handle 'rejected' status - no further action needed in this controller
			req.log.info(`Game invite ${id} rejected by ${to_user_id}.`);
			reply.send({ message: 'Game invite rejected' });

		} else if (status === 'expired') {
			 // Handle 'expired' status - no further action needed here (expiry might be automatic)
			req.log.info(`Game invite ${id} marked as expired.`);
			reply.send({ message: 'Game invite expired' });
		}

	} catch (error) {
		// Catch any unexpected errors during the overall process (before/between DB calls)
		req.log.error(`Unexpected error in updateGameInviteStatus for invite ${id}: ${error.message}`, error);
		reply.code(500).send({ message: 'An unexpected error occurred while processing game invite status update' });
	}
};

const deleteGameInvite = async (req, reply) => {
	try {
		const { id } = req.params;
		const db = req.server.betterSqlite3;

		// Delete the game invite by ID
		const result = db.prepare('DELETE FROM game_invites WHERE id = ?').run(id);

		if (result.changes === 0) {
			// Check if the invite existed to return 404 correctly
			const inviteExists = db.prepare('SELECT id FROM game_invites WHERE id = ?').get(id);
			if (!inviteExists) {
				reply.code(404).send({ message: 'Game invite not found' });
			} else {
				// This case is unlikely for delete, but technically possible if DB reports 0 changes
				req.log.warn(`Delete command reported 0 changes for invite ${id} but it seems to exist.`);
				reply.code(500).send({ message: 'Failed to delete game invite' });
			}
		} else {
			reply.send({ message: `Game invite ${id} has been removed` });
		}
	} catch (error) {
		req.log.error(error);
		reply.code(500).send({ message: 'Error deleting game invite' });
	}
};

module.exports = {
	getGameInvites,
	getGameInvite,
	getSentGameInvites,
	getReceivedGameInvites,
	addGameInvite,
	updateGameInviteStatus,
	deleteGameInvite,
};
