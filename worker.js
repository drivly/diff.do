import { diff, addedDiff, deletedDiff, updatedDiff, detailedDiff } from 'deep-object-diff';

export const api = {
  icon: '🚀',
  name: 'diff.do',
  description: 'Cloudflare Worker Template',
  url: 'https://diff.do/api',
  type: 'https://apis.do/templates',
  endpoints: {
    diff: `https://diff.do/:url`
  },
  site: 'https://diff.do',
  login: 'https://diff.do/login',
  signup: 'https://diff.do/signup',
  subscribe: 'https://diff.do/subscribe',
  repo: 'https://github.com/drivly/diff.do',
}

export const gettingStarted = [
  `If you don't already have a JSON Viewer Browser Extension, get that first:`,
  `https://extensions.do`,
]

export const examples = {
  diff: `https://diff.do/listings.do/api/Listing/{b4990a25-bb49-4ab3-8a09-6d9488370c71,27ee2a85-3e1f-4c11-932c-e0cd5d516331}`
}

export default {
  fetch: async (req, env) => {
    const { user, hostname, pathname, rootPath, pathSegments, query } = await env.CTX.fetch(req).then(res => res.json())
    if (rootPath) return json({ api, gettingStarted, examples, user })
    
    let [ options, ...url ] = pathSegments
    let mode = 'detailed'

    const allowedOptions = [
      'added',
      'deleted',
      'updated',
      'detailed',
    ]

    if (!allowedOptions.includes(options)) {
      url = [ options, ...url ].join('/')
    } else {
      url = url.join('/')
    }

    // URL example: https://diff.do/detailed/bucket.do/read/{file1,file2}

    const placeholder = /{([^}]+)}/g
    const targetPlaceholder = url.match(placeholder)[0]
    const matches = targetPlaceholder.replace(/{|}/g, '').split(',')

    if (matches.length !== 2) {
      return json({
        api,
        data: {
          success: false,
          error: 'You must provide two files to compare.',
        },
        user
      })
    }

    const [ original, target] = await Promise.all(matches.map(async file => {
      const res = await fetch(`https://${url.replace(targetPlaceholder, file)}`)
      return res.json()
    }))

    const diffed = {
      added: addedDiff,
      deleted: deletedDiff,
      updated: updatedDiff,
      detailed: detailedDiff,
    }[mode](original, target)

    const data = {
      diff: diffed,
    }

    function findMatchingFields(obj1, obj2, parentPath = '') {
      const matchingFields = [];
    
      for (const key in obj1) {
        if (obj2.hasOwnProperty(key)) {
          if (typeof obj1[key] === 'object' && typeof obj2[key] === 'object') {
            // The values are objects, so we need to check their fields recursively
            const nestedMatchingFields = findMatchingFields(obj1[key], obj2[key], `${parentPath}${key}.`);
            matchingFields.push(...nestedMatchingFields);
          } else if (obj1[key] === obj2[key]) {
            // The values are not objects, so we can just compare them directly
            matchingFields.push({
              path: `${parentPath}${key}`,
              value: obj1[key]
            });
          }
        }
      }
    
      return matchingFields;
    }

    data.matchingFields = findMatchingFields(original, target)
    
    return json({
      api,
      data,
      user
    })
  }
}

const json = obj => new Response(JSON.stringify(obj, null, 2), { headers: { 'content-type': 'application/json; charset=utf-8' }})
