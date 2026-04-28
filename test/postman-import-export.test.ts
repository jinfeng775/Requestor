import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import samplePostmanCollection from '../test.json'
import { collectionToPostmanV21 } from '../src/renderer/src/utils/postman-export.js'
import { isValidPostmanCollection, parsePostmanCollections } from '../src/renderer/src/utils/postman-import.js'
import type { Collection } from '../src/renderer/src/types/collection.js'

describe('postman import/export', () => {
  it('parses a Postman collection object into one internal collection', () => {
    const collections = parsePostmanCollections(samplePostmanCollection)

    assert.ok(collections)
    assert.equal(collections.length, 1)
    assert.equal(collections[0].name, samplePostmanCollection.info.name)
    assert.equal(collections[0].items.length, samplePostmanCollection.item.length)
  })

  it('parses an array of Postman collections for export round-trip compatibility', () => {
    const collections = parsePostmanCollections([samplePostmanCollection, samplePostmanCollection])

    assert.ok(collections)
    assert.equal(collections.length, 2)
    assert.equal(collections[0].name, samplePostmanCollection.info.name)
    assert.equal(collections[1].name, samplePostmanCollection.info.name)
  })

  it('rejects invalid Postman payloads', () => {
    assert.equal(isValidPostmanCollection({}), false)
    assert.equal(parsePostmanCollections({}), null)
    assert.equal(parsePostmanCollections([]), null)
    assert.equal(
      parsePostmanCollections([
        samplePostmanCollection,
        {
          info: {
            name: 'broken',
            schema: 'https://example.com/schema.json'
          },
          item: []
        }
      ]),
      null
    )
  })

  it('exports an internal collection into valid Postman schema', () => {
    const collections = parsePostmanCollections(samplePostmanCollection)
    assert.ok(collections)

    const exported = collectionToPostmanV21(collections[0])

    assert.equal(isValidPostmanCollection(exported), true)
    assert.equal(exported.info.name, collections[0].name)
    assert.equal(exported.item.length, collections[0].items.length)
  })

  it('preserves key request fields across import/export', () => {
    const collections = parsePostmanCollections(samplePostmanCollection)
    assert.ok(collections)

    const importedCollection = collections[0] as Collection
    const importedRequest = importedCollection.items[0]
    assert.equal(importedRequest.type, 'request')

    const exported = collectionToPostmanV21(importedCollection)
    const exportedRequest = exported.item[0]

    assert.ok(exportedRequest.request)
    assert.equal(exportedRequest.request.method, samplePostmanCollection.item[0].request.method)
    assert.equal(exportedRequest.request.url.raw, samplePostmanCollection.item[0].request.url.raw)
    assert.equal(exportedRequest.request.header[0].key, samplePostmanCollection.item[0].request.header[0].key)
  })
})
