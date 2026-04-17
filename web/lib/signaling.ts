/**
 * Firestore Signaling Layer
 *
 * Firestore schema:
 *   rooms/{roomId}
 *     offer:  { type, sdp }
 *     answer: { type, sdp }
 *     createdBy: uid
 *     createdAt: Timestamp
 *   rooms/{roomId}/callerCandidates/{id}   ← ICE from caller
 *   rooms/{roomId}/calleeCandidates/{id}   ← ICE from callee
 */

import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  addDoc,
  onSnapshot,
  serverTimestamp,
  Unsubscribe,
  collection,
} from "firebase/firestore";
import { db } from "./firebase";
import { createPeerConnection } from "./webrtc";

/**
 * Called by the CALLER: creates a new room, writes the SDP offer,
 * sets up ICE gathering, and returns the roomId.
 */
export async function createRoom(
  pc: RTCPeerConnection,
  callerUid: string,
  roomId: string
): Promise<string> {
  // 1. Create offer
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  // 2. Write to Firestore using the URL-provided roomId
  const roomRef = doc(db, "rooms", roomId);
  await setDoc(roomRef, {
    offer: { type: offer.type, sdp: offer.sdp },
    createdBy: callerUid,
    createdAt: serverTimestamp(),
  });

  // 3. Forward caller ICE candidates as they are gathered
  const callerCandidatesRef = collection(roomRef, "callerCandidates");
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      addDoc(callerCandidatesRef, event.candidate.toJSON());
    }
  };

  return roomRef.id;
}

/**
 * Called by the CALLER: listens for the callee's SDP answer and
 * subscribes to callee ICE candidates. Returns an unsubscribe function.
 */
export function listenForAnswer(
  roomId: string,
  pc: RTCPeerConnection
): Unsubscribe {
  const roomRef = doc(db, "rooms", roomId);
  const calleeCandidatesRef = collection(roomRef, "calleeCandidates");
  
  // Buffer for candidates that arrive before remote description is set
  const candidateBuffer: RTCIceCandidate[] = [];

  // 1. Listen for the Answer
  const unsubAnswer = onSnapshot(roomRef, async (snap) => {
    const data = snap.data();
    if (data?.answer && !pc.remoteDescription) {
      console.log("[Signaling] Received answer, setting remote description");
      const answerDescription = new RTCSessionDescription(data.answer);
      await pc.setRemoteDescription(answerDescription);
      
      // Process any buffered candidates
      console.log(`[Signaling] Processing ${candidateBuffer.length} buffered candidates`);
      while (candidateBuffer.length > 0) {
        const candidate = candidateBuffer.shift();
        if (candidate) await pc.addIceCandidate(candidate).catch(console.error);
      }
    }
  });

  // 2. Listen for Callee ICE candidates
  const unsubCandidates = onSnapshot(calleeCandidatesRef, (snap) => {
    snap.docChanges().forEach(async (change) => {
      if (change.type === "added") {
        const candidate = new RTCIceCandidate(change.doc.data());
        
        if (pc.remoteDescription) {
          await pc.addIceCandidate(candidate).catch(console.error);
        } else {
          // Buffer candidate if we're not ready yet
          candidateBuffer.push(candidate);
        }
      }
    });
  });

  return () => {
    unsubAnswer();
    unsubCandidates();
  };
}

/**
 * Called by the CALLEE: reads the offer, writes the SDP answer,
 * sets up ICE gathering, and subscribes to caller candidates.
 * Returns an unsubscribe function.
 */
export async function joinRoom(
  roomId: string,
  pc: RTCPeerConnection
): Promise<Unsubscribe> {
  const roomRef = doc(db, "rooms", roomId);
  const roomSnap = await getDoc(roomRef);

  if (!roomSnap.exists()) {
    throw new Error(`Room ${roomId} not found`);
  }

  const roomData = roomSnap.data();

  // 1. Set remote description (caller's offer)
  const offerDescription = new RTCSessionDescription(roomData.offer);
  await pc.setRemoteDescription(offerDescription);

  // 2. Create + set local description (callee's answer)
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);

  // 3. Write answer to Firestore
  await updateDoc(roomRef, {
    answer: { type: answer.type, sdp: answer.sdp },
  });

  // 4. Forward callee ICE candidates
  const calleeCandidatesRef = collection(roomRef, "calleeCandidates");
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      addDoc(calleeCandidatesRef, event.candidate.toJSON());
    }
  };

  // 5. Subscribe to caller ICE candidates
  const callerCandidatesRef = collection(roomRef, "callerCandidates");
  const unsubCandidates = onSnapshot(callerCandidatesRef, (snap) => {
    snap.docChanges().forEach((change) => {
      if (change.type === "added") {
        const candidate = new RTCIceCandidate(change.doc.data());
        pc.addIceCandidate(candidate).catch(console.error);
      }
    });
  });

  return unsubCandidates;
}
