const { normalizePlayerName } = require('../lib/player');
const { mutateUser, buildProgress } = require('./userService');

async function completeTutorial(userId) {
  return mutateUser(userId, { type: 'tutorial_complete' }, async (conn, user) => {
    if (!Number(user.tutorial_seen)) {
      await conn.query('UPDATE users SET tutorial_seen = 1 WHERE id = ?', [userId]);
      user.tutorial_seen = 1;
    }
    return buildProgress(conn, user);
  });
}

async function updateName(userId, rawName) {
  const name = normalizePlayerName(rawName);
  return mutateUser(userId, { type: 'name_update' }, async (conn, user) => {
    if (user.name !== name) {
      await conn.query('UPDATE users SET name = ? WHERE id = ?', [name, userId]);
      user.name = name;
    }
    return buildProgress(conn, user);
  });
}

module.exports = { completeTutorial, updateName };
