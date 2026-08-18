import request from './request'

/** Admin login */
export function login(data) {
  return request.post('/auth/login', data)
}
