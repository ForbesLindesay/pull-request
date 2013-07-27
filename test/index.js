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
describe('fork(user, repo, options)', function () {
  it('forks `user/repo` to the current user', function (done) {
    this.timeout(60000)
    pr.fork('ForbesLindesay', 'pull-request-test', options, function (err, res) {
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

describe('commit(commit, options)', function () {
  it('commits an update to a branch', function (done) {
    this.timeout(15000)
    var commit = {
      branch: branch,
      message: 'test commit',
      updates: [{path: 'test-file.txt', content: 'lets-add-a-file wahooo'}]
    }
    pr.commit('github-basic-js-test', 'pull-request-test', commit, options, function (err, res) {
      if (err) return done(err)
      github.buffer('head', '/github-basic-js-test/pull-request-test/blob/' + branch + '/test-file.txt', {}, {host: 'github.com'}, done)
    })
  })
})

describe('pull(from, to, message, options)', function () {
  it('creates a pull request', function (done) {
    this.timeout(15000)
    var from = {
      user: 'github-basic-js-test',
      repo: 'pull-request-test',
      branch: branch
    }
    var to = {
      user: 'github-basic-js-test',
      repo: 'pull-request-test',
      branch: 'master'
    }
    var message = {
      title: branch,
      body: 'A test pull request'
    }
    pr.pull(from, to, message, options, function (err, res) {
      if (err) return done(err)
      ///repos/github-basic-js-test/pull-request-test/pulls/1
      github.buffer('head', '/repos/github-basic-js-test/pull-request-test/pulls/' + res.body.number, {}, options, done)
    })
  })
})