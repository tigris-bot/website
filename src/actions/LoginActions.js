import 'fetch'
import pouchdb from 'pouchdb'
import * as types from '../constants/action-types'
import * as github from '../constants/github'
import { asyncawaitFetch } from '../lib/asyncawait-fetch/index'

const db = new pouchdb('https://plus-n-boots-users.iriscouch.com/users')

let accessToken
let username

async function getCode () {
  return await new Promise((resolve, reject) => {
    window.open(github.GITHUB_LOGIN, '_blank', 'width=1200,height=600,menubar=0')
    window.onmessage = oauth => {
      if (oauth.data.length) {
        resolve(oauth.data)
      }
    }
  })
}

async function getAuth (code) {
  const authRequest = `${github.AUTH_URI}${code}`
  return fetch(authRequest).then(
    data => data.json()
  )
}

async function storeUser (username) {
  const userObj = {
    _id: username,
    repos: []
  }
  let user
  try {
    user = await db.get(username)
  } catch (err) {
    user = await db.put(userObj)
  }
  return user
}

async function getUserDetails (auth) {
  accessToken = auth.token
  const response = await asyncawaitFetch(`${github.GITHUB_API}user?access_token=${accessToken}`)
  username = response.login
  await storeUser(username)
  localStorage.setItem('username', username)
  localStorage.setItem('accesToken', accessToken)
  return response
}

async function checkRepos (repos) {
  return db.get(username).then(function (doc) {
    const current = new Set(doc.repos)
    const chosen = new Set(repos)
    const intersection = new Set(
        [...chosen].filter(repo => current.has(repo.name)))
    const combined = [...intersection]
    const added  = combined.map(repo => {
      repo.hookAdded = true
      return repo
    })
    return added
  })
}

async function getRepos (auth) {
  const data = await asyncawaitFetch(`${github.GITHUB_API}user/repos?per_page=100&access_token=${auth.token}`)
  return checkRepos(data).then(function(repos) {
    const blah = repos.concat(data)
    const hooked = blah.map(repo => {
      !repo.hookAdded ? repo.hookAdded = false : null
      return repo
    })
    return hooked.filter(repo => {
      return !repo.fork && repo.owner.login === username
    })
  })
}

async function requestHook (repoName, type) {
  const config = {
    name: 'web',
    active: true,
    events: ['issues', 'issue_comment'],
    config: {
      url: 'http://fa4bb0f6.ngrok.io/postreceive',
      content_type: 'json'
    }
  }

  return fetch(`${github.GITHUB_API}repos/${username}/${repoName}/hooks?access_token=${accessToken}`, {
    method: type === 'add' ? 'post' : 'delete',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(config)
  }).then(
    data => data.json()
  ).then((response) => {
    return type === 'add' ? true : false
  }
  )
}

async function processLogin () {
  const code = await getCode()
  const auth = await getAuth(code)
  const details = await getUserDetails(auth)
  const repos = await getRepos(auth)

  return {
    type: types.USER_LOGGED_IN,
    details,
    repos
  }
}

async function requestCollab (repoName, type) {
  return fetch(`${github.GITHUB_API}repos/${username}/${repoName}/collaborators/plus-n-boots-official?access_token=${accessToken}`, {
    method: type  ===  'add' ? 'put' : 'delete',
    headers: {
      'Content-Length': 0
    }
  }).then(
    data => data.json()
  ).then((response) => {
    return response
  }
  )
}

async function requestPersist (repoName, type) {
  if (type === 'add') {
    db.get(username).then(function (doc) {
      doc.repos.push(repoName)
      return db.put(doc)
    }).then(function () {
      return db.get(username)
    })
  } else {
    db.get(username).then(function (doc) {
      const matching = doc.repos.indexOf(repoName)
      if (matching > -1) {
        doc.repos.splice(matching)
      }
      return db.put(doc)
    }).then(function () {
      return db.get(username)
    })
  }
}

async function processHook (repo, type) {
  await requestHook(repo.name, type)
  await requestCollab(repo.name, type)
  await requestPersist(repo.name, type)
  return {
    type: types.HOOK_ADDED,
    repo
  }
}

export function checkCache () {
  // const username = localStorage.getItem('username')
  const username = null
  return {
    type: types.CHECK_CACHE,
    username
  }
}

export function login () {
  return dispatch => {
    processLogin().then(
      data => {
        dispatch(data)
      }
    )
  }
}

export function addHook (repo) {
  processHook(repo, 'add')
  return {
    type: types.HOOK_ADDED,
    repo
  }
}

export function removeHook (repo) {
  processHook(repo, 'remove')
  return {
    type: types.HOOK_ADDED,
    repo
  }
}

export function logout () {
  return {
    type: types.USER_LOGGED_OUT
  }
}
