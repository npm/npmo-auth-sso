var fs = require('fs')
var Authorizer = require('../lib/authorizer')
var Session = require('../lib/session')
var tap = require('tap')

var userComplete = {name: 'bcoe', email: 'ben@example.com', sessionKey: 'abc123'}
var userNotComplete = {name: 'bcoe', email: 'ben@example.com'}

var session = new Session({
  certificate: new Buffer(fs.readFileSync('./test/fixtures/remote.crt', 'utf-8')).toString('base64')
})

tap.test('it responds with session object if SSO dance is complete', function (t) {
  var authorizer = new Authorizer({
    certificate: new Buffer(fs.readFileSync('./test/fixtures/remote.crt', 'utf-8')).toString('base64')
  })

  session.set('ben@example.com-abc123', userComplete, function (err) {
    t.equal(err, null)
    authorizer.authorize({
      headers: {
        authorization: 'Bearer ben@example.com-abc123'
      }
    }, function (err, user) {
      authorizer.end()
      session.delete('ben@example.com-abc123')

      t.equal(err, null)
      t.equal(user.email, 'ben@example.com')
      t.end()
    })
  })
})

tap.test('it returns error with login url if SSO dance is not complete', function (t) {
  var authorizer = new Authorizer({
    certificate: new Buffer(fs.readFileSync('./test/fixtures/remote.crt', 'utf-8')).toString('base64')
  })

  session.set('ben@example.com-abc123', userNotComplete, function (err) {
    t.equal(err, null)
    authorizer.authorize({
      headers: {
        authorization: 'Bearer ben@example.com-abc123'
      }
    }, function (err, user) {
      authorizer.end()
      session.delete('ben@example.com-abc123')

      t.ok(err.message.indexOf('visit https://npmo.onelogin.com') !== -1)
      t.end()
    })
  })
})

tap.test('after', function (t) {
  session.end()
  t.end()
})
