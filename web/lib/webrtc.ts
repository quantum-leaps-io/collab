import { ICE_SERVERS } from "./iceConfig";

/**
 * Creates a configured RTCPeerConnection with our ICE servers.
 */
export function createPeerConnection(): RTCPeerConnection {
  return new RTCPeerConnection({ iceServers: ICE_SERVERS });
}

/**
 * Captures local camera + microphone stream.
 * @param video whether to request video (default true)
 * @param audio whether to request audio (default true)
 */
export async function getUserMedia(
  video = true,
  audio = true
): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({ video, audio });
}

/**
 * Attaches all tracks from a MediaStream to a PeerConnection.
 */
export function addTracksToConnection(
  pc: RTCPeerConnection,
  stream: MediaStream
) {
  stream.getTracks().forEach((track) => pc.addTrack(track, stream));
}

/**
 * Mutes / unmutes all audio tracks in a stream.
 */
export function setAudioEnabled(stream: MediaStream, enabled: boolean) {
  stream.getAudioTracks().forEach((t) => (t.enabled = enabled));
}

/**
 * Enables / disables all video tracks in a stream.
 */
export function setVideoEnabled(stream: MediaStream, enabled: boolean) {
  stream.getVideoTracks().forEach((t) => (t.enabled = enabled));
}

/**
 * Stops all tracks and closes the PeerConnection cleanly.
 */
export function closePeerConnection(
  pc: RTCPeerConnection | null,
  streams: (MediaStream | null)[]
) {
  streams.forEach((s) => s?.getTracks().forEach((t) => t.stop()));
  pc?.close();
}
