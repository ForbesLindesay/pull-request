var assert = require('assert')
var github = require('github-basic')
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


// github-basic-js-test
var options = {
  auth: {
    type: 'oauth',
    token: '90993e4e47b0fdd1f51f4c67b17368c62a3d6097'
  }
}
var branch  = (new Date()).toISOString().replace(/[^0-9a-zA-Z]+/g, '')
describe('fork(from, to, repo, options)', function () {
  it('forks `repo` from `from` to `to`', function (done) {
    this.timeout(60000)
    pr.fork('ForbesLindesay', 'github-basic-js-test', 'pull-request-test', options, function (err, res) {
      if (err) return done(err)
      pr.exists('github-basic-js-test', 'pull-request-test', function (err, res) {
        if (err) return done(err)
        assert(res === true)
        done()
      })
    })
  })
})

describe('branch(user, repo, form, to, options)', function () {
  it('creates a new branch `to` in `user/repo` based on `from`', function (done) {
    this.timeout(10000)
    pr.branch('github-basic-js-test', 'pull-request-test', 'master', branch, options, function (err, res) {
      if (err) return done(err)
      github.buffer('head', '/repos/github-basic-js-test/pull-request-test/git/refs/heads/:branch', {branch: branch}, options, done)
    })
  })
})

describe('commit', function () {

})

describe('pull', function () {

})