import { useEffect, useRef } from "react";
import api from "../../services/api";

/**
 * useOrderPolling
 *
 * Replaces useDeliverySocket. Polls GET /orders/pending-requests every 5 seconds
 * when the rider is online, and hands the full orders array to the callback.
 *
 * Also handles location tracking (was previously done inside the socket hook).
 *
 * @param {boolean}  isOnline       - Whether the rider's availability is "online"
 * @param {function} onOrdersUpdate - Called with the latest orders array on every poll
 */
const useOrderPolling = (isOnline, onOrdersUpdate) => {
  const intervalRef = useRef(null);
  const watchIdRef = useRef(null);

  // Keep callback ref stable so effect doesn't re-run on every render
  const onOrdersUpdateRef = useRef(onOrdersUpdate);
  useEffect(() => {
    onOrdersUpdateRef.current = onOrdersUpdate;
  }, [onOrdersUpdate]);

  // ── Polling ──────────────────────────────────────────────────
  useEffect(() => {
    if (!isOnline) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      onOrdersUpdateRef.current([]); // clear incoming orders when going offline
      return;
    }

    const poll = async () => {
      try {
        const res = await api.get("/orders/pending-requests");
        onOrdersUpdateRef.current(res.data.data || []);
      } catch (err) {
        console.error("[Polling] Failed:", err.message);
      }
    };

    poll(); // immediate first call
    intervalRef.current = setInterval(poll, 5000); // then every 5s

    return () => {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [isOnline]);

  // ── Location Tracking ─────────────────────────────────────────
  // Sends GPS coordinates to the backend so the rider stays in range
  // for dispatch queries (replaces the socket "updateLocation" event).
  useEffect(() => {
    if (!isOnline) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    if (!navigator.geolocation) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        try {
          await api.patch("/delivery-persons/location", {
            coordinates: [pos.coords.longitude, pos.coords.latitude], // GeoJSON [lng, lat]
          });
        } catch (err) {
          console.error("[Location] Update failed:", err.message);
        }
      },
      (err) => console.warn("[Location] Geolocation error:", err.message),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 },
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [isOnline]);
};

export default useOrderPolling;
