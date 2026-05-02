export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    const targetDomain = env.TARGET_DOMAIN;
    if (!targetDomain) {
      return new Response("Configuration Error: Missing TARGET_DOMAIN environment variable.", { status: 500 });
    }

    const originalHost = url.hostname;
    url.hostname = targetDomain;
    url.protocol = 'https:'; 

    const newHeaders = new Headers(request.headers);
    newHeaders.set('Host', targetDomain); 
    newHeaders.set('X-Forwarded-Host', originalHost);

    const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown-ip';
    newHeaders.set('X-Real-IP', clientIP);

    if (request.cf) {
        newHeaders.set('X-Real-Country', request.cf.country || '');
        newHeaders.set('X-Real-Region', request.cf.region || '');
        newHeaders.set('X-Real-City', request.cf.city || '');
    }

    const newRequestInit = {
        method: request.method,
        headers: newHeaders,
        redirect: 'manual' 
    };
    
    if (request.method !== 'GET' && request.method !== 'HEAD') {
        newRequestInit.body = request.body;
    }

    const newRequest = new Request(url.toString(), newRequestInit);

    let response = await fetch(newRequest);
    let newResponse = new Response(response.body, response);

    const location = newResponse.headers.get('Location');
    if (location) {
        let safeLocation = location.replace(targetDomain, originalHost);
        safeLocation = safeLocation.replace('https://', 'http://');
        
        newResponse.headers.set('Location', safeLocation);
    }

    newResponse.headers.delete('Strict-Transport-Security');

    newResponse.headers.set('Access-Control-Allow-Origin', '*');
    newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');

    return newResponse;
  }
};
