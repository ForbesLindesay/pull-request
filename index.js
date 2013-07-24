'use strict'

var assert = require('assert')
var ms = require('ms')
var Promise = require('promise')
var github = require('github-basic')

function delay(time, value) {
  return new Promise(function (resolve) {
    setTimeout(function () {
      resolve(value)
    }, ms(time.toString()))
  })
}
function poll(condition, options) {
  options = options || {}
  return condition().then(function (done) {
    if (done) {
      return done
    } else if (options.timeout && options.start && Date.now() - options.start > ms(options.timeout.toString())) {
      var err = new Error('operation timed out')
      err.code = 'TIMEOUT'
      throw err
    } else {
      return delay(typeof options.delay === 'function' ? options.delay(options.attempt || 1) : options.delay || 0).then(function () {
        return poll(condition, {
          attempt: (options.attempt || 1) + 1,
          delay: options.delay,
          timeout: options.timeout,
          start: options.start || Date.now()
        })
      })
    }
  })
}

exports.exists = exists
function exists(user, repo, options, callback) {
  if (typeof options === 'function') {
    callback = options
    options = undefined
  }
  options = JSON.parse(JSON.stringify(options || {}))
  options.host = 'github.com'
  return github.buffer('head', '/:user/:repo', {user: user, repo: repo}, options)
    .then(function () {
      return true
    }, function (err) {
      return false
    }).nodeify(callback)
}

exports.fork = fork
function fork(from, to, repo, options, callback) {
  options = options || {}
  return github.json('post', '/repos/:owner/:repo/forks', {owner: from, repo: repo, organization: to}, options)
    .then(function (res) {
      return poll(function () {
        return exists(to, repo, options)
      }, {timeout: options.timeout || '5 minutes', delay: function (attempt) { return (attempt * 5) + 'seconds' }})
      .then(function () { return res })
    }).nodeify(callback)
}

exports.branch = branch
function branch(user, repo, from, to, options, callback) {
  github.json('get', '/repos/:owner/:repo/git/refs/:ref', {owner: user, repo: repo, ref: 'heads/' + from})
    .then(function (res) {
      return github.json('post', '/repos/:owner/:repo/git/refs', {owner: user, repo: repo, ref: 'refs/heads/' + to, sha: res.object.sha})
    })
}

exports.commit = commit //does 5 API requests
function commit(user, repo, commit, options, callback) {
  var branch = commit.branch || 'master'
  var message = commit.message
  var updates = commit.updates
  var shaLatestCommit, shaBaseTree, shaNewTree, shaNewCommit

  Promise.from(null).then(function () {

    //check for correct input
    assert(user && typeof user === 'string', '`user` must be a string')
    assert(repo && typeof repo === 'string', '`repo` must be a string')
    assert(branch && typeof branch === 'string', '`branch` must be a string')
    assert(message && typeof message === 'string', '`message` must be a string')
    updates.forEach(function (file) { // {path: path, content: content}
      file.path = file.path.replace(/\\/g, '/').replace(/^\//, '')
      file.mode = file.mode || '100644'
      file.type = file.type || 'blob'
      file.content = file.content
    })


    return github.json('get', '/repos/:owner/:repo/git/refs/:ref', {owner: user, repo: repo, ref: 'heads/' + branch}, options)
  }).then(function (res) {
    shaLatestCommit = res.object.sha
    return github.json('get', '/repos/:owner/:repo/git/commits/:sha', {owner: user, repo: repo, sha: shaLatestCommit}, options)
  }).then(function (res) {
    shaBaseTree = res.tree.sha
    return github('post', '/repos/:owner/:repo/git/trees', {owner: user, repo: repo, tree: updates, base_tree: shaBaseTree}, options)
  }).then(function (res) {
    shaNewTree = res.sha
    return github.json('post', '/repos/:owner/:repo/git/commits', {owner: user, repo: repo, message: message, tree: shaNewTree, parents: [shaLatestCommit]}, options)
  }).then(function (res) {
    shaNewCommit = res.sha
    return github.json('patch', '/repos/:owner/:repo/git/refs/:ref', {owner: user, repo: repo, ref: 'heads/' + branch, sha: shaNewCommit, force: options.force || false})
  }).nodeify(callback)
}

exports.pull = pull
function pull(from, to, msg, options, callback) {
  var query = {
    owner: to.owner,
    repo: to.repo || from.repo,
    base: to.branch || 'master',
    head: from.user + ':' + (from.branch || 'master')
  }
  if (typeof msg.issue === 'number') {
    query.issue = msg.issue.toString()
  } else {
    query.title = msg.title
    query.body = msg.body || ''
  }
  return github.json('post', '/repos/:owner/:repo/pulls', query, options)
}