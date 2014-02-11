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
function fork(user, repo, options, callback) {
  options = options || {}
  //N.B. `org` is listed as `organization` in the spec, but that doesn't currently work :(
  var query = {owner: user, repo: repo}
  if (options.organization) {
    query.organization = options.organization
  }
  return github.json('post', '/repos/:owner/:repo/forks', query, options)
    .then(function (res) {
      return poll(function () {
        return exists(res.body.owner.login, repo, options)
      }, {timeout: options.timeout || '5 minutes', delay: function (attempt) { return (attempt * 5) + 'seconds' }})
      .then(function () { return res.body })
    }).nodeify(callback)
}

exports.branch = branch
function branch(user, repo, from, to, options, callback) {
  return github.json('get', '/repos/:owner/:repo/git/refs/:ref', {owner: user, repo: repo, ref: 'heads/' + from}, options)
    .then(function (res) {
      return github.json('post', '/repos/:owner/:repo/git/refs', {
        owner: user,
        repo: repo,
        ref: 'refs/heads/' + to,
        sha: res.body.object.sha
      }, options)
    })
    .nodeify(callback)
}

exports.commit = commit //does 5 API requests
function commit(user, repo, commit, options, callback) {
  var branch = commit.branch || 'master'
  var message = commit.message
  var updates = commit.updates
  var shaLatestCommit, shaBaseTree, shaNewTree, shaNewCommit

  return Promise.from(null).then(function () {

    //check for correct input
    assert(user && typeof user === 'string', '`user` must be a string')
    assert(repo && typeof repo === 'string', '`repo` must be a string')
    assert(branch && typeof branch === 'string', '`branch` must be a string')
    assert(message && typeof message === 'string', '`message` must be a string')

    updates = Promise.all(updates.map(function (file) {
      // {path: string, content: string|Buffer}
      assert(typeof file.path === 'string', '`file.path` must be a string')
      assert(typeof file.content === 'string' || Buffer.isBuffer(file.content), '`file.content` must be a string or a Buffer')
      var path = file.path.replace(/\\/g, '/').replace(/^\//, '')
      var mode = file.mode || '100644'
      var type = file.type || 'blob'
      return github.json('post', '/repos/:owner/:repo/git/blobs', {
        owner: user,
        repo: repo,
        content: typeof file.content === 'string' ? file.content : file.content.toString('base64'),
        encoding: typeof file.content === 'string' ? 'utf-8' : 'base64'
      }, options).then(function (res) {
        return {
          path: path,
          mode: mode,
          type: type,
          sha: res.body.sha
        };
      });
    }))

    return github.json('get', '/repos/:owner/:repo/git/refs/:ref', {owner: user, repo: repo, ref: 'heads/' + branch}, options)
  }).then(function (res) {
    shaLatestCommit = res.body.object.sha
    return github.json('get', '/repos/:owner/:repo/git/commits/:sha', {owner: user, repo: repo, sha: shaLatestCommit}, options)
  }).then(function (res) {
    shaBaseTree = res.body.tree.sha
    return updates;
  }).then(function (updates) {
    return github.json('post', '/repos/:owner/:repo/git/trees', {owner: user, repo: repo, tree: updates, base_tree: shaBaseTree}, options)
  }).then(function (res) {
    shaNewTree = res.body.sha
    return github.json('post', '/repos/:owner/:repo/git/commits', {owner: user, repo: repo, message: message, tree: shaNewTree, parents: [shaLatestCommit]}, options)
  }).then(function (res) {
    shaNewCommit = res.body.sha
    return github.json('patch', '/repos/:owner/:repo/git/refs/:ref', {owner: user, repo: repo, ref: 'heads/' + branch, sha: shaNewCommit, force: options.force || false}, options)
  }).nodeify(callback)
}

exports.pull = pull
function pull(from, to, msg, options, callback) {
  var query = {
    owner: to.user,
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
  return github.json('post', '/repos/:owner/:repo/pulls', query, options).nodeify(callback)
}
