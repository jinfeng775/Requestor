import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { resolveVariables } from '../../../../electron/http/variables/resolveVariables.js'

describe('resolveVariables', () => {
  it('replaces ordinary variables with flexible names and whitespace', () => {
    const result = resolveVariables('{{ token }} {{user.name}} {{api-key}}', {
      variables: {
        token: 'abc123',
        'user.name': 'Ada',
        'api-key': 'secret'
      }
    })

    assert.equal(result.value, 'abc123 Ada secret')
    assert.deepEqual(result.warnings, [])
  })

  it('keeps unknown variables and reports warnings', () => {
    const result = resolveVariables('Bearer {{missingToken}}', { variables: {} })

    assert.equal(result.value, 'Bearer {{missingToken}}')
    assert.equal(result.warnings.length, 1)
    assert.equal(result.warnings[0].type, 'undefined')
    assert.equal(result.warnings[0].variableName, 'missingToken')
  })

  it('preserves escaped variables as literals', () => {
    const result = resolveVariables('send \\{{token}} and {{token}}', {
      variables: { token: 'abc123' }
    })

    assert.equal(result.value, 'send {{token}} and abc123')
    assert.deepEqual(result.warnings, [])
  })

  it('resolves nested variables', () => {
    const result = resolveVariables('{{usersUrl}}/42', {
      variables: {
        baseUrl: 'https://api.example.com',
        usersUrl: '{{baseUrl}}/users'
      }
    })

    assert.equal(result.value, 'https://api.example.com/users/42')
    assert.deepEqual(result.warnings, [])
  })

  it('stops circular references without hanging', () => {
    const result = resolveVariables('{{a}}', {
      variables: {
        a: '{{b}}',
        b: '{{a}}'
      }
    })

    assert.equal(result.value, '{{a}}')
    assert.equal(result.warnings.length, 1)
    assert.equal(result.warnings[0].type, 'circular')
  })

  it('generates supported dynamic values', () => {
    const result = resolveVariables('{{$guid}} {{$uuid}} {{$randomUUID}} {{$timestamp}} {{$isoTimestamp}}', {
      variables: {}
    })
    const [guid, uuid, randomUUID, timestamp, isoTimestamp] = result.value.split(' ')
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

    assert.match(guid, uuidPattern)
    assert.match(uuid, uuidPattern)
    assert.match(randomUUID, uuidPattern)
    assert.match(timestamp, /^\d{10}$/)
    assert.doesNotThrow(() => new Date(isoTimestamp).toISOString())
    assert.deepEqual(result.warnings, [])
  })

  it('generates local date parts with fixed clock support', () => {
    const result = resolveVariables('{{$yyyy}}-{{$MM}}-{{$dd}} {{$HH}}:{{$mm}}:{{$ss}}', {
      variables: {},
      now: new Date(2026, 3, 5, 6, 7, 8)
    })

    assert.equal(result.value, '2026-04-05 06:07:08')
    assert.deepEqual(result.warnings, [])
  })

  it('reports unknown dynamic variables', () => {
    const result = resolveVariables('{{$unknown}}', { variables: {} })

    assert.equal(result.value, '{{$unknown}}')
    assert.equal(result.warnings.length, 1)
    assert.equal(result.warnings[0].type, 'dynamic-unknown')
    assert.equal(result.warnings[0].variableName, '$unknown')
  })

  it('lets dynamic variables take priority over environment variables', () => {
    const result = resolveVariables('{{$guid}}', {
      variables: { '$guid': 'not-a-guid' }
    })

    assert.notEqual(result.value, 'not-a-guid')
    assert.match(result.value, /^[0-9a-f-]{36}$/i)
  })
})
