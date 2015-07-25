import 'fetch'

/**
 * wrapper around fetch polyfill
 */
async function f (request, options) {
  return await fetch(request, options)
}

/**
 * return json by default
 */
async function req (request, options, type) {
  const res = await f(request, options)
  const contentType = res.headers.get('Content-Type')

  if (res.statusText === 'No Content') {
    return null
  }

  if (type === 'html') {
    return res.text()
  }

  if (type === 'json') {
    return res.json()
  }

  if (contentType.indexOf('html') > -1) {
    return res.text()
  }

  if (contentType.indexOf('json') > -1) {
    return res.json()
  }

  return res.json()
}

/**
 * public api
 */
export async function asyncawaitFetch (request, options = null, type = null) {
  return await req(request, options, type)
}
