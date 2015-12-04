var _ = require('lodash')
var Session = require('./session')

function AuthorizerSSO (opts) {
  _.extend(this, {
    session: new Session(opts)
  }, opts)
}

AuthorizerSSO.prototype.authorize = AuthorizerSSO.prototype.whoami = function (credentials, cb) {
  var _this = this
  if (!validateCredentials(credentials)) return cb(error404())
  var token = credentials.headers.authorization.replace('Bearer ', '')
  this.session.get(token, function (err, user) {
    if (err) return cb(err)
    else if (!user.sessionKey) return _this.session.ssoUrl(cb, token)
    else return cb(err, user)
  })
}

function validateCredentials (credentials) {
  if (!credentials) return false
  if (!credentials.headers) return false
  if (!credentials.headers.authorization || !credentials.headers.authorization.match(/Bearer /)) return false
  return true
}

function error404 () {
  var error = Error('not found')
  error.statusCode = 404
  return error
}

AuthorizerSSO.prototype.end = function () {
  this.session.end()
}

module.exports = AuthorizerSSO
