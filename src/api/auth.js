import request from '@/utils/request'

const CLIENT_ID = import.meta.env.VITE_CLIENT_ID || 'vidora-web-2024'

// POST /api/auth/login  {phone,password,clientId} -> LoginVO
export function login(phone, password) {
  return request.post('/auth/login', { phone, password, clientId: CLIENT_ID })
}

// POST /api/auth/register {phone,password,nickname} -> Long(userId)
export function register(phone, password, nickname) {
  return request.post('/auth/register', { phone, password, nickname })
}
