export class WebscoketConfig {
	timeout = 5000
	reconnectDelay = 5000
	heartbeatTime = 15000
	baseUrl = `${location.protocol.startsWith('https') ? 'wss' : 'ws'}://${location.host}`
	url = '/api/auth/ws/endpoint'
}
