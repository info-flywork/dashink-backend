const { ApiError, CODES } = require('../lib/apiError');
const { findItem } = require('../config/catalog');
const { ownedItemIds, buyCheck } = require('../lib/items');
const { mutateUser, changeCoins, userItemIds, buildProgress } = require('./userService');
const logger = require('../logger');

const EQUIP_COLUMNS = Object.freeze({ ball: 'equipped_ball', ink: 'equipped_ink', theme: 'equipped_theme' });

function requireItem(itemId) {
  const item = findItem(itemId);
  if (!item) throw ApiError.notFound(`unknown item_id ${itemId}`);
  return item;
}

async function equipColumn(conn, user, item) {
  const column = EQUIP_COLUMNS[item.category];
  await conn.query(`UPDATE users SET ${column} = ? WHERE id = ?`, [item.id, user.id]);
  user[column] = item.id;
}

/** Coin ile satın alır VE kuşanır. */
async function buy(userId, itemId) {
  const item = requireItem(itemId);
  return mutateUser(userId, { type: 'shop_buy' }, async (conn, user) => {
    const owned = ownedItemIds(await userItemIds(conn, userId), Number(user.premium));
    const err = buyCheck(item, owned, user.coins);
    if (err) throw ApiError.conflict(err);
    await changeCoins(conn, user, -item.price, 'shop_buy', item.id);
    await conn.query("INSERT INTO user_items (user_id, item_id, source) VALUES (?, ?, 'coins')", [userId, item.id]);
    await equipColumn(conn, user, item);
    logger.info('shop.buy', { user_id: userId, item_id: item.id, price: item.price, balance_after: user.coins });
    return buildProgress(conn, user);
  });
}

async function equip(userId, itemId) {
  const item = requireItem(itemId);
  return mutateUser(userId, { type: 'shop_equip' }, async (conn, user) => {
    const owned = ownedItemIds(await userItemIds(conn, userId), Number(user.premium));
    if (!owned.includes(item.id)) throw ApiError.conflict(CODES.NOT_OWNED);
    await equipColumn(conn, user, item);
    return buildProgress(conn, user);
  });
}

module.exports = { buy, equip, EQUIP_COLUMNS };
