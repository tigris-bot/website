import 'fetch'
import * as types from '../constants/ActionTypes'

const GITHUB_OAUTH = `https://github.com/login/oauth/authorize`
const GITHUB_API = `https://api.github.com/`
const CLIENT_ID = `d07ba9157a9cd18b5f0d`
const REDIRECT_URI = `http://localhost:8080/logged-in.html`
const STATE = `cbd8c10443696bbf430e2dc97a64951d`
const GITHUB_LOGIN = `${GITHUB_OAUTH}?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&state=${STATE}`
const AUTH_URI = `http://localhost:9999/authenticate/`

async function getCode () {
  return await new Promise((resolve, reject) => {
    window.open(GITHUB_LOGIN, '_blank', 'width=1200,height=600,menubar=0')
    window.onmessage = oauth => {
      if (oauth.data.length) {
        resolve(oauth.data)
      }
    }
  })
}

async function getAuth (code) {
  const authRequest = `${AUTH_URI}${code}`
  return fetch(authRequest).then(
    data => data.json()
  )
}

async function getUserDetails (auth) {
  return fetch(`${GITHUB_API}user?access_token=${auth.token}`).then(
    data => data.json()
  ).then((response) => {
    return response
  }
  )
}

async function getRepos (reposApi) {
  return fetch(`${reposApi}`).then((data) => {
    return data.json()
  }).then((data) => {
    return data.filter(repo => {
      return !repo.fork
    })
  })
}

async function processLogin () {
  const code = await getCode()
  const auth = await getAuth(code)
  const details = await getUserDetails(auth)
  const repos = await getRepos(details.repos_url)
  return {
    type: types.USER_LOGGED_IN,
    details,
    repos
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

export function logout () {
  return {
    type: types.USER_LOGGED_OUT
  }
}
