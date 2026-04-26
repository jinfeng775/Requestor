/**
 * 生成基于 crypto API 的随机 ID
 * 使用 crypto.getRandomValues 而非 Math.random,确保生成的 ID 具有密码学安全性
 * @param size ID 长度,默认 21
 * @returns 随机字符串 ID
 */
export function nanoid(size = 21): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let id = ''
  const bytes = crypto.getRandomValues(new Uint8Array(size))
  for (let i = 0; i < size; i++) {
    id += chars[bytes[i] % chars.length]
  }
  return id
}
