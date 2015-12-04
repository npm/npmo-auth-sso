var client = require('redis').createClient()
var fs = require('fs')
var Session = require('../lib/session')
var tap = require('tap')

var sessionLookupKey = 'user-abc123'
var user = {name: 'bcoe', email: 'ben@example.com'}

function deleteTokens (t) {
  client.del(sessionLookupKey, function () {
    t.done()
  })
}

tap.test('before', deleteTokens)

tap.test('it should return an error containing a login URL if no session exists for a user', function (t) {
  var session = new Session({
    certificate: new Buffer(fs.readFileSync('./test/fixtures/remote.crt', 'utf-8')).toString('base64')
  })

  session.get(sessionLookupKey, function (err, user) {
    session.end()
    t.ok(err.message.indexOf('https://npmo.onelogin.com') !== -1)
    t.done()
  })
})

tap.test('before', deleteTokens)

tap.test('it should allow a session to be set for a user', function (t) {
  var session = new Session({
    certificate: new Buffer(fs.readFileSync('./test/fixtures/remote.crt', 'utf-8')).toString('base64')
  })

  session.set(sessionLookupKey, user, function (err) {
    t.false(err)
    client.get(sessionLookupKey, function (err, res) {
      session.end()

      t.equal(err, null)
      t.ok(res.indexOf('ben@example.com') !== -1)
      t.done()
    })
  })
})

tap.test('it should allow a session to be fetched for a user', function (t) {
  var session = new Session({
    certificate: new Buffer(fs.readFileSync('./test/fixtures/remote.crt', 'utf-8')).toString('base64')
  })

  session.get(sessionLookupKey, function (err, user) {
    session.end()
    t.false(err)
    t.equal(user.email, 'ben@example.com')
    t.done()
  })
})

tap.test('before', deleteTokens)

tap.test('after', function (t) {
  client.end()
  t.done()
})
