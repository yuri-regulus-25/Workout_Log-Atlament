import { createServer, request as httpRequest } from 'node:http'
import { Socket } from 'node:net'

const port = 5173

const routes = [
  {
    name: 'development-runtime',
    prefixes: ['/api'],
    target: {
      host: '127.0.0.1',
      port: 5180,
    },
  },
  {
    name: 'dashboard',
    prefixes: ['/dashboard'],
    target: {
      host: '127.0.0.1',
      port: 5175,
    },
  },
  {
    name: 'workouts',
    prefixes: ['/workouts'],
    target: {
      host: '127.0.0.1',
      port: 5176,
    },
  },
  {
    name: 'exercises',
    prefixes: ['/exercises'],
    target: {
      host: '127.0.0.1',
      port: 5177,
    },
  },
  {
    name: 'analytics',
    prefixes: ['/analytics'],
    target: {
      host: '127.0.0.1',
      port: 5178,
    },
  },
  {
    name: 'settings',
    prefixes: ['/settings'],
    target: {
      host: '127.0.0.1',
      port: 5179,
    },
  },
  {
    name: 'portal',
    prefixes: ['/'],
    target: {
      host: '127.0.0.1',
      port: 5174,
    },
  },
]

const server = createServer((clientRequest, clientResponse) => {
  const route = resolveRoute(clientRequest.url ?? '/')

  if (!route) {
    clientResponse.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' })
    clientResponse.end('Development Gateway route is not configured.')
    return
  }

  proxyHttp(route, clientRequest, clientResponse)
})

server.on('upgrade', (clientRequest, clientSocket, head) => {
  const route = resolveRoute(clientRequest.url ?? '/', true)

  if (!route) {
    clientSocket.end('HTTP/1.1 502 Bad Gateway\r\n\r\n')
    return
  }

  proxyWebSocket(route, clientRequest, clientSocket, head)
})

server.on('error', (error) => {
  console.error(`Development Gateway failed: ${error.message}`)
  process.exit(1)
})

server.listen(port, '127.0.0.1', () => {
  console.log(`Atlament Development Gateway: http://127.0.0.1:${port}/`)
  console.log('Routes:')
  for (const route of routes) {
    console.log(`  ${route.prefixes.join(', ')} -> ${route.name} http://${route.target.host}:${route.target.port}`)
  }
})

function resolveRoute(rawUrl, webSocket = false) {
  const url = new URL(rawUrl, 'http://127.0.0.1')
  return routes.find((route) => {
    const prefixes = webSocket
      ? [...(route.webSocketPrefixes ?? []), ...route.prefixes]
      : route.prefixes
    return prefixes.some((prefix) => matchesPrefix(url.pathname, prefix))
  }) ?? null
}

function matchesPrefix(pathname, prefix) {
  return prefix === '/' || pathname === prefix || pathname.startsWith(`${prefix}/`)
}

function proxyHttp(route, clientRequest, clientResponse) {
  const upstream = httpRequest({
    hostname: route.target.host,
    port: route.target.port,
    method: clientRequest.method,
    path: clientRequest.url,
    headers: {
      ...clientRequest.headers,
      host: `${route.target.host}:${route.target.port}`,
    },
  }, (upstreamResponse) => {
    clientResponse.writeHead(upstreamResponse.statusCode ?? 502, upstreamResponse.headers)
    upstreamResponse.pipe(clientResponse)
  })

  upstream.on('error', (error) => {
    if (!clientResponse.headersSent) {
      clientResponse.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' })
    }
    clientResponse.end(`Development Gateway upstream error: ${error.message}`)
  })

  clientRequest.pipe(upstream)
}

function proxyWebSocket(route, clientRequest, clientSocket, head) {
  const upstreamSocket = new Socket()
  upstreamSocket.connect(route.target.port, route.target.host, () => {
    upstreamSocket.write(formatUpgradeRequest(clientRequest, route))
    if (head.length > 0) {
      upstreamSocket.write(head)
    }
    upstreamSocket.pipe(clientSocket)
    clientSocket.pipe(upstreamSocket)
  })

  upstreamSocket.on('error', () => {
    clientSocket.end('HTTP/1.1 502 Bad Gateway\r\n\r\n')
  })
}

function formatUpgradeRequest(clientRequest, route) {
  const headers = {
    ...clientRequest.headers,
    host: `${route.target.host}:${route.target.port}`,
  }

  const lines = [`${clientRequest.method} ${clientRequest.url} HTTP/${clientRequest.httpVersion}`]
  for (const [name, value] of Object.entries(headers)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        lines.push(`${name}: ${item}`)
      }
    } else if (value !== undefined) {
      lines.push(`${name}: ${value}`)
    }
  }

  return `${lines.join('\r\n')}\r\n\r\n`
}
