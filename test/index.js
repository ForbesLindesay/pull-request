var assert = require('assert')
var pr = require('../')

describe('exists(user, repo)', function () {
  it('returns `true` if a repo exists', function (done) {
    pr.exists('ForbesLindesay', 'pull-request', function (err, res) {
      if (err) return done(err)
      assert(res === true)
      done()
    })
  })
  it('returns `false` if a repo does not exist', function (done) {
    pr.exists('ForbesLindesay', 'i-wont-ever-create-this', function (err, res) {
      if (err) return done(err)
      assert(res === false)
      done()
    })
  })
})