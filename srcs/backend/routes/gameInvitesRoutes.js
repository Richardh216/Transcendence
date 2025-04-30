const {
	getGameInvites,
	getGameInvite,
	getSentGameInvites,
	getReceivedGameInvites,
	addGameInvite,
	updateGameInviteStatus,
	deleteGameInvite,
} = require('../controllers/gameInvitesController'); // Adjust path if needed

const { GameInvite, GameInviteDetails } = require('../schemas/gameInvitesSchema'); // Adjust path if needed

// Options for get all Game Invites
const getGameInvitesOpts = {
	schema: {
		response: {
			200: {
				type: 'array',
				items: GameInviteDetails, // Return detailed invite objects
			},
			500: {
				type: 'object',
				properties: {
					message: { type: 'string' }
				}
			}
		},
	},
	handler: getGameInvites,
};

// Options for get single Game Invite
const getGameInviteOpts = {
	schema: {
		params: {
			type: 'object',
			properties: {
				id: { type: 'integer' }
			},
			required: ['id']
		},
		response: {
			200: GameInviteDetails, // Return detailed invite object
			404: {
				type: 'object',
				properties: {
					message: { type: 'string' }
				}
			},
			500: {
				type: 'object',
				properties: {
					message: { type: 'string' }
				}
			}
		},
	},
	handler: getGameInvite,
};

// Options for get Sent Game Invites for a user
const getSentGameInvitesOpts = {
	schema: {
		params: {
			type: 'object',
			properties: {
				userId: { type: 'integer' }
			},
			required: ['userId']
		},
		response: {
			200: {
				type: 'array',
				items: GameInviteDetails,
			},
			500: {
				type: 'object',
				properties: {
					message: { type: 'string' }
				}
			}
		},
	},
	handler: getSentGameInvites,
};

// Options for get Received Game Invites for a user (usually pending)
const getReceivedGameInvitesOpts = {
	schema: {
		params: {
			type: 'object',
			properties: {
				userId: { type: 'integer' }
			},
			required: ['userId']
		},
		response: {
			200: {
				type: 'array',
				items: GameInviteDetails,
			},
			500: {
				type: 'object',
				properties: {
					message: { type: 'string' }
				}
			}
		},
	},
	handler: getReceivedGameInvites,
};

// Options for add Game Invite
const addGameInviteOpts = {
	schema: {
		body: {
			type: 'object',
			required: ['from_user_id', 'to_user_id'], // game_mode is optional in DB, so not required in schema body
			properties: {
				from_user_id: { type: 'integer'},
				to_user_id: { type: 'integer'},
				game_mode: { type: 'string'}, // Allow game_mode in body
			},
		},
		response: {
			201: GameInvite, // Return the basic invite object on creation
			400: {
				type: 'object',
				properties: {
					message: { type: 'string' }
				}
			},
			409: {
				type: 'object',
				properties: {
					message: { type: 'string' }
				}
			},
			500: {
				type: 'object',
				properties: {
					message: { type: 'string' }
				}
			}
		},
	},
	handler: addGameInvite,
};

// Options for update Game Invite Status
const updateGameInviteStatusOpts = {
	schema: {
		params: {
			type: 'object',
			properties: {
				id: { type: 'integer' }
			},
			required: ['id']
		},
		body: {
			type: 'object',
			required: ['status'],
			properties: {
				status: { type: 'string', enum: ['accepted', 'rejected', 'expired']}, // Enforce allowed values
			}
		},
		response: {
			200: { // Success response
				type: 'object',
				properties: {
					message: { type: 'string' },
					inviteId: { type: 'integer' }, // Include invite details in accepted response
					from_user_id: { type: 'integer' },
					to_user_id: { type: 'integer' },
					game_mode: { type: 'string', nullable: true }
				}
			},
			400: {
				type: 'object',
				properties: {
					message: { type: 'string' }
				}
			},
			404: {
				type: 'object',
				properties: {
					message: { type: 'string' }
				}
			},
			500: {
				type: 'object',
				properties: {
					message: { type: 'string' },
					error: { type: 'string', nullable: true } // Include error detail
				}
			}
		},
	},
	handler: updateGameInviteStatus,
};

// Options for delete Game Invite
const deleteGameInviteOpts = {
	schema: {
		params: {
			type: 'object',
			properties: {
				id: { type: 'integer' }
			},
			required: ['id']
		},
		response: {
			200: {
				type: 'object',
				properties: {
					message: {type: 'string'}
				},
			},
			404: {
				type: 'object',
				properties: {
					message: { type: 'string' }
				}
			},
			500: {
				type: 'object',
				properties: {
					message: { type: 'string' }
				}
			}
		},
	},
	handler: deleteGameInvite,
};

function gameInvitesRoutes (fastify, options, done) {
	// Get all game invites (admin or specific use case)
	fastify.get('/game-invites', getGameInvitesOpts);

	// Get single game invite by ID
	fastify.get('/game-invites/:id', getGameInviteOpts);

	// Get game invites sent by a user
	fastify.get('/users/:userId/sent-game-invites', getSentGameInvitesOpts);

	// Get game invites received by a user (usually pending)
	fastify.get('/users/:userId/received-game-invites', getReceivedGameInvitesOpts);

	// Add game invite
	fastify.post('/game-invites', addGameInviteOpts);

	// Update game invite status (accept/reject/expire)
	// PUT is used as we're updating the state of the resource identified by ID
	fastify.put('/game-invites/:id/status', updateGameInviteStatusOpts);

	// Delete game invite
	fastify.delete('/game-invites/:id', deleteGameInviteOpts);

	done();
}

module.exports = gameInvitesRoutes;
