var _ = require('lodash')
var fs = require('fs')
var path = require('path')
var redis = require('redis')
var saml2 = require('saml2-js')

function SessionSSO (opts) {
  _.extend(this, {
    client: redis.createClient(process.env.LOGIN_CACHE_REDIS),
    sessionTimeout: 60 * 60 * 24 * 14, // two weeks.
    sessionLookupPrefix: 'user-',
    entityId: process.env.ENTITY_ID || 'http://127.0.0.1:8082/auth/saml/metadata.xml',
    assertEndpoint: process.env.ASSERT_ENDPOINT || 'http://127.0.0.1:8082/auth/saml/assert',
    logoutEndpoint: process.env.LOGOUT_ENDPOINT || 'http://127.0.0.1:8082/auth/saml/logout',
    nameidFormat: process.env.NAMEID_FORMAT || 'urn:oasis:names:tc:SAML:2.0:nameid-format:emailAddress',
    ssoLoginUrl: process.env.SSO_LOGIN_URL || 'https://npmo.onelogin.com/trust/saml2/http-post/sso/494337',
    ssoLogoutUrl: process.env.SSO_LOGOUT_URL || 'https://npmo.onelogin.com/trust/saml2/http-redirect/slo/494337',
    emailKey: process.env.EMAIL_KEY || 'user.name_id',
    sessionKey: process.env.SESSION_KEY || 'user.session_index'
  }, opts)

  var sp_options = {
    entity_id: this.entityId,
    // these files should be programatically populated
    // via the admin UI.
    private_key: fs.readFileSync(path.resolve(__dirname, '../files/local.key')).toString(),
    certificate: fs.readFileSync(path.resolve(__dirname, '../files/local.crt')).toString(),
    assert_endpoint: this.assertEndpoint,
    force_authn: true,
    auth_context: { comparison: 'exact', class_refs: ['urn:oasis:names:tc:SAML:1.0:am:password'] },
    nameid_format: this.nameidFormat,
    sign_get_request: false,
    allow_unencrypted_assertion: false
  }
  this.sp = new saml2.ServiceProvider(sp_options)

  var idp_options = {
    sso_login_url: this.ssoLoginUrl,
    sso_logout_url: this.ssoLogoutUrl,
    certificates: [(new Buffer(process.env.CERTIFICATE || this.certificate, 'base64')).toString()],
    force_authn: true,
    sign_get_request: false,
    allow_unencrypted_assertion: false
  }

  this.idp = new saml2.IdentityProvider(idp_options)
}

SessionSSO.prototype.get = function (key, cb) {
  var _this = this

  key = normalizeKey(key)

  this.client.get(_this.sessionLookupPrefix + key, function (err, user) {
    if (err) return cb(error500())
    if (!user) return _this.ssoUrl(cb)

    return cb(null, JSON.parse(user))
  })
}

SessionSSO.prototype.set = function (key, user, cb) {
  var _this = this

  key = normalizeKey(key)

  _this.client.setex(this.sessionLookupPrefix + key, this.sessionTimeout, JSON.stringify(user), cb)
}

SessionSSO.prototype.delete = function (key, cb) {
  key = normalizeKey(key)

  this.client.del(this.sessionLookupPrefix + key, this.sessionTimeoutPrefix + key, cb)
}

function normalizeKey (token) {
  return token.replace(/^user-/, '')
}

SessionSSO.prototype.end = function () {
  this.client.end()
}

SessionSSO.prototype.ssoUrl = function (cb, relayState) {
  this.sp.create_login_request_url(this.idp, {
    relay_state: relayState
  }, function (err, url) {
    if (err) return cb(err)

    var error = Error('visit ' + url + ' to validate your session')
    error.statusCode = 401
    cb(error, url)
  })
}

function error500 () {
  var error = Error('unknown error')
  error.statusCode = 500
  return error
}

module.exports = SessionSSO
