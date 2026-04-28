import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { collectionToHtmlDoc } from '../src/renderer/src/utils/html-doc-export.js'
import type { Collection } from '../src/renderer/src/types/collection.js'

describe('html doc export', () => {
  it('renders requests with null key-value values without throwing', () => {
    const collection: Collection = {
      id: 'collection-1',
      name: 'Sample Collection',
      description: '',
      createdAt: 0,
      updatedAt: 0,
      items: [
        {
          id: 'request-1',
          type: 'request',
          name: 'Get Users',
          request: {
            id: 'request-config-1',
            name: 'Get Users',
            description: '',
            method: 'GET',
            url: 'https://example.com/users',
            params: [
              {
                key: 'page',
                value: null as unknown as string,
                enabled: true,
                description: null as unknown as string
              }
            ],
            headers: [
              {
                key: 'X-Test',
                value: null as unknown as string,
                enabled: true,
                description: null as unknown as string
              }
            ],
            bodyType: 'none',
            rawBody: '',
            rawBodyFormat: 'json',
            formData: [],
            urlEncodedData: [],
            binaryFilePath: '',
            authType: 'none',
            auth: null,
            scripts: {
              preRequest: '',
              postRequest: '',
              trusted: true
            }
          },
          responseExamples: []
        }
      ]
    }

    assert.doesNotThrow(() => collectionToHtmlDoc(collection))
    const html = collectionToHtmlDoc(collection)
    assert.match(html, /Sample Collection/)
    assert.match(html, /Get Users/)
  })
})
