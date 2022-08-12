import NodeCache from 'node-cache';

const nodeCache = new NodeCache();

/**
 * @param key
 * @param value
 * @param ttl -> in seconds
 */
export async function set(key: string, value: any, ttl = 100): Promise<boolean> {
  return nodeCache.set(key, value, ttl);
}

export async function get(key: string): Promise<any | undefined> {
  return nodeCache.get(key);
}

export async function del(key: string): Promise<number> {
  return nodeCache.del(key);
}
