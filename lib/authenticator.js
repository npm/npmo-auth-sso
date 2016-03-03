var _ = require('lodash')
var Session = require('./session')
var uuid = require('uuid')

function AuthenticatorSSO (opts) {
  _.extend(this, {
    session: new Session(opts)
  }, opts)
}

AuthenticatorSSO.prototype.authenticate = function (credentials, cb) {
  if (!validateCredentials(credentials)) return cb(error500())

  var token = uuid.v4()

  this.session.ssoUrl(function (_, url) {
    return cb(null, {
      token: token,
      user: {
        name: credentials.body.name,
        email: credentials.body.email,
        sso: url
      }
    })
  }, token)
}

AuthenticatorSSO.prototype.unauthenticate = function (token, cb) {
  this.session.delete(token, cb)
}

function validateCredentials (credentials) {
  if (!credentials) return false
  if (!credentials.body) return false
  if (!credentials.body.name) return false
  return true
}

AuthenticatorSSO.prototype.end = function () {
  this.session.end()
}

function error500 () {
  var error = Error('unknown error')
  error.statusCode = 500
  return error
}

module.exports = AuthenticatorSSO
