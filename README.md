# pull-request

All the tools you need to commit to GitHub repos via the API and create pull requests

Supports:

 - exists: check if a repository already exists so you don't try and fork again
 - fork: fork a repository so you get a copy to edit
 - branch: create a new branch in a repository to edit
 - commit: commit changes to files within a branch
 - pull: create a pull request to have a human merge those changes

[![Build Status](https://travis-ci.org/ForbesLindesay/pull-request.png?branch=master)](https://travis-ci.org/ForbesLindesay/pull-request)
[![Dependency Status](https://gemnasium.com/ForbesLindesay/pull-request.png)](https://gemnasium.com/ForbesLindesay/pull-request)
[![NPM version](https://badge.fury.io/js/pull-request.png)](http://badge.fury.io/js/pull-request)

## Installation

    npm install pull-request

## API

### pr.exists(user, repo, options, callback)

Returns `true` if `github.com/:user/:repo` exists, and `false` if requesting that url returns an error.

### pr.fork(user, repo, options, callback)

Forks the repo `github.com/:user/:repo` to the authenticated user and waits until the fork operation completes.  To fork to an organization, just add an `organization` string to the `options` object.

**N.B.** forking will currently appear successful even if the target repo already exists.  This functionality should not be relied upon and is subject to change without necessarily updating the MAJOR version.

**options:**

See [github-basic](https://github.com/ForbesLindesay/github-basic#options) and note that `auth` is **required**

### pr.branch(user, repo, from, to, options, callback)

Creates a new branch in `github.com/:user/:repo` using `from` as the source branch and `to` as the new branch name.

### pr.commit(user, repo, commit, options, callback)

Commits a set of changes to `github.com/:user/:repo`.  It only supports updating text files.

**commit:**

An object with:

property | type                | default      | description
---------|---------------------|--------------|----------------------------
branch   | `String`            | `'master'`   | The branch to commit to
message  | `String`            | **required** | The commit message
updates  | `Array<FileUpdate>` | **required** | The actual changes to make

**FileUpdate:**

An object with:

property | type     | default      | description
---------|----------|--------------|----------------------------
path     | `String` | **required** | The file path within the repo (e.g. `test/index.js`)
content  | `String` | **required** | The new content of the file
mode     | `String` | `'100644'`   | The mode to commit the file with (you probably don't want to change this)
type     | `String` | `'blob'`     | The type of entry to create (you probably don't want to change this)

**options:**

See [github-basic](https://github.com/ForbesLindesay/github-basic#options) and note that `auth` is **required**

Additionally the `force` object defaults to `false` and will force push the change if set to `true`.  You almost certainly don't want to do this.


### pr.pull(from, to, message, options, callback)

Creates a pull request from `from` to `to`.

**from:**

An object with:

property | type     | default      | description
---------|----------|--------------|----------------------------
user     | `String` | **required** | The source user
repo     | `String` | **required** | The source repository
branch   | `String` | `'master'`   | The source branch

**to:**

An object with:

property | type     | default      | description
---------|----------|--------------|----------------------------
user     | `String` | **required** | The destination user
repo     | `String` | **required** | The destination repository
branch   | `String` | `'master'`   | The destination branch

**message:**

Either:

property | type     | default      | description
---------|----------|--------------|----------------------------
title    | `String` | **required** | The title of the pull request
body     | `String` | `''`         | The body of the pull request

or:

property | type     | default      | description
---------|----------|--------------|----------------------------
issue    | `Number` | **required** | An issue number to convert into a pull request

**options:**

See [github-basic](https://github.com/ForbesLindesay/github-basic#options) and note that `auth` is **required**

## Promises

All APIs return promises if `callback` is ommitted.

## License

  MIT