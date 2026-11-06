// {status, message, data} zarfı.
function success(res, data, httpStatus = 200) {
  return res.status(httpStatus).json({ status: 'success', message: 'ok', data: data === undefined ? null : data });
}

function failure(res, httpStatus, code) {
  return res.status(httpStatus).json({ status: 'error', message: code, data: null });
}

module.exports = { success, failure };
