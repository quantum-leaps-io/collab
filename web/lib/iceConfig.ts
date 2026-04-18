/**
 * ICE server configuration for WebRTC.
 *
 * STUN: Discovers your public IP. Google provides this for free.
 * TURN: Relays media when P2P fails (firewalls, symmetric NAT).
 *       Replace the TURN placeholder with real credentials from
 *       Twilio Network Traversal, Cloudflare Calls, or coturn.
 */
// IMPORTANT: For calls to work across different networks (e.g. 4G to Wi-Fi),
// you MUST use a TURN server. You can get free credentials from Metered.ca or Twilio.
export const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  {
    urls: "stun:stun.relay.metered.ca:80",
  },
  {
    urls: "turn:sg.relay.metered.ca:80",
    username: "e32ec10f28ea739049978679",
    credential: "Tw/jilyBiUtJqr5F"
  },
  {
    urls: "turn:sg.relay.metered.ca:80?transport=tcp",
    username: "e32ec10f28ea739049978679",
    credential: "Tw/jilyBiUtJqr5F",
  },
  {
    urls: "turn:sg.relay.metered.ca:443",
    username: "e32ec10f28ea739049978679",
    credential: "Tw/jilyBiUtJqr5F",
  },
  {
    urls: "turns:sg.relay.metered.ca:443?transport=tcp",
    username: "e32ec10f28ea739049978679",
    credential: "Tw/jilyBiUtJqr5F",
  }

];
