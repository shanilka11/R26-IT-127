import { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { getGtfsStatus, getNearestStation, planJourney } from "../api/client";

const sriLankaCenter = [7.8731, 80.7718];
const isLikelySriLanka = (lat, lon) => lat >= 5.7 && lat <= 10.1 && lon >= 79.4 && lon <= 82.1;
const I18N = {
  en: { title: "Journey Planner (Sri Lanka Railway)", subtitle: "Detect your exact location, choose destination, and get best boarding guidance.", useLocation: "Use My Location", plan: "Plan & Track Train", pickMap: "Pick On Map", clickMap: "Click Map to Set Location", nearest: "Nearest Station", distance: "Distance", accuracy: "Location Accuracy", boarding: "Recommended Boarding", alternatives: "Alternative Nearby Boarding Stations", best: "Best Train Ranking", alerts: "Trip Alerts", destinationPlaceholder: "Enter destination station (e.g. Kandy, Galle, Jaffna)" },
  si: { title: "???? ??????????", subtitle: "???? ??????? ????????? ????????? ???? ?????? ?????? ??????.", useLocation: "??? ??????", plan: "??????? ?? ?????????", pickMap: "????????? ??????", clickMap: "?????? ?? ?????? ?????", nearest: "??????", distance: "???", accuracy: "???????????", boarding: "?????", alternatives: "??????", best: "???? ???????", alerts: "??????", destinationPlaceholder: "??????? ??????" },
  ta: { title: "??? ???????", subtitle: "?????? ???????????????????? ?????? ????? ??????????? ???????????.", useLocation: "??? ??????????", plan: "??????????? ??????????", pickMap: "??????????? ??????", clickMap: "????????? ???????????", nearest: "???????", distance: "?????", accuracy: "?????????", boarding: "????? ???????", alternatives: "?????? ??????????", best: "?????? ?????", alerts: "??????????", destinationPlaceholder: "?????? ???????" }
};

const trainIcon = L.divIcon({ className: "train-marker", html: '<div class="train-marker-inner">??</div>', iconSize: [30, 30], iconAnchor: [15, 15] });

export function JourneyPlanner() {
  const [lang, setLang] = useState(() => localStorage.getItem("journey_lang") || "en");
  const t = I18N[lang] || I18N.en;

  const [coords, setCoords] = useState(null);
  const [accuracyM, setAccuracyM] = useState(null);
  const [nearest, setNearest] = useState(null);
  const [destination, setDestination] = useState("");
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [gtfsReady, setGtfsReady] = useState(false);
  const [pathSource, setPathSource] = useState("");
  const [manualPickMode, setManualPickMode] = useState(false);
  const [armedTrainId, setArmedTrainId] = useState("");
  const [alertMinutes, setAlertMinutes] = useState(10);
  const [alertLog, setAlertLog] = useState([]);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [lastVoiceKey, setLastVoiceKey] = useState("");
  const [showTrains, setShowTrains] = useState(true);
  const [showRoute, setShowRoute] = useState(true);
  const [showStations, setShowStations] = useState(true);

  const pathPositions = useMemo(() => (plan?.path || []).map((p) => [p.lat, p.lon]), [plan]);
  const selectedEta = useMemo(() => {
    const rankedFirst = (plan?.rankedTrains || plan?.trains || [])[0];
    const rankedEta = rankedFirst?.eta || null;
    const selectedFromEtas = plan?.trainEtas?.find((e) => e.trainId === armedTrainId) || null;
    const selectedFromRanked = (plan?.rankedTrains || plan?.trains || []).find((e) => e.trainId === armedTrainId)?.eta || null;
    return selectedFromEtas || selectedFromRanked || rankedEta || null;
  }, [plan, armedTrainId]);

  useEffect(() => { localStorage.setItem("journey_lang", lang); }, [lang]);
  useEffect(() => { getGtfsStatus().then((res) => setGtfsReady(Boolean(res.data?.ready))).catch(() => setGtfsReady(false)); }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!armedTrainId || !plan?.trainEtas?.length) return;
      const eta = plan.trainEtas.find((e) => e.trainId === armedTrainId);
      if (!eta || eta.minutesToBoarding > Number(alertMinutes)) return;
      const msg = `${armedTrainId} arriving at boarding in ~${eta.minutesToBoarding} min`;
      setAlertLog((prev) => (prev.includes(msg) ? prev : [msg, ...prev].slice(0, 5)));
      if (voiceEnabled && "speechSynthesis" in window) {
        const key = `${armedTrainId}-${eta.minutesToBoarding}-${eta.estimatedDelayMin}-${eta.etaBoardingIso}`;
        if (key !== lastVoiceKey) {
          speechSynthesis.cancel();
          speechSynthesis.speak(new SpeechSynthesisUtterance(`Train ${armedTrainId} arriving in ${eta.minutesToBoarding} minutes. Delay ${eta.estimatedDelayMin} minutes.`));
          setLastVoiceKey(key);
        }
      }
    }, 30000);
    return () => clearInterval(timer);
  }, [armedTrainId, alertMinutes, plan, voiceEnabled, lastVoiceKey]);

  const refreshNearest = async (lat, lon) => { const res = await getNearestStation(lat, lon); setNearest(res.data); };

  const detectLocation = () => {
    setError("");
    if (!navigator.geolocation) return setError("Geolocation is not supported in this browser.");
    const samples = [];
    let completed = false;
    const finish = async () => {
      if (completed || !samples.length) return;
      completed = true;
      samples.sort((a, b) => (a.coords.accuracy || 999999) - (b.coords.accuracy || 999999));
      const best = samples[0];
      const lat = best.coords.latitude;
      const lon = best.coords.longitude;
      const acc = Number(best.coords.accuracy || 0);
      setCoords({ lat, lon });
      setAccuracyM(acc);
      await refreshNearest(lat, lon);
      if (!isLikelySriLanka(lat, lon)) {
        setError("Detected location looks outside Sri Lanka. Enable precise device location or use 'Pick On Map'.");
        return;
      }
      if (acc > 300) setError(`Low GPS accuracy (${Math.round(acc)}m). Try again outdoors or use map pick.`);
    };

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        samples.push(pos);
        if (Number(pos.coords.accuracy || 999999) <= 80) {
          navigator.geolocation.clearWatch(watchId);
          finish();
        }
      },
      () => {
        if (!samples.length) setError("Location access denied or unavailable.");
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );

    setTimeout(() => {
      navigator.geolocation.clearWatch(watchId);
      finish();
    }, 9000);
  };

  const handlePlan = async () => {
    try {
      if (!coords) return setError("Detect your current location first.");
      setError(""); setLoading(true);
      const res = await planJourney({ lat: coords.lat, lon: coords.lon, destination });
      setPlan(res.data); setPathSource(res.data?.pathSource || "");
      const best = res.data?.rankedTrains?.[0]?.trainId || ""; setArmedTrainId(best); setLastVoiceKey("");
      if (voiceEnabled && "speechSynthesis" in window) {
        const topTrain = (res.data?.rankedTrains || res.data?.trains || [])[0];
        const eta = topTrain?.eta || (res.data?.trainEtas || [])[0];
        const boardingName = res.data?.boardingStation?.name || res.data?.origin?.name || "your boarding station";
        const destinationName = res.data?.destinationStation?.name || destination || "your destination";
        let speak = `Journey planned. Board at ${boardingName} and travel to ${destinationName}.`;
        if (topTrain?.trainId) speak += ` Best train is ${topTrain.trainId}.`;
        if (eta) {
          if (Number.isFinite(Number(eta.minutesToBoarding))) speak += ` Arrival in about ${eta.minutesToBoarding} minutes.`;
          if (eta.etaBoardingIso) speak += ` Exact boarding arrival time is ${new Date(eta.etaBoardingIso).toLocaleTimeString()}.`;
          if (Number.isFinite(Number(eta.estimatedDelayMin))) speak += ` Estimated delay is ${eta.estimatedDelayMin} minutes.`;
          if (Number.isFinite(Number(eta.tripMinutesBoardingToDestination))) speak += ` Trip time is ${eta.tripMinutesBoardingToDestination} minutes.`;
        }
        speechSynthesis.cancel(); speechSynthesis.speak(new SpeechSynthesisUtterance(speak));
      }
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Failed to plan journey.");
    } finally { setLoading(false); }
  };

  function MapClickSetter() {
    useMapEvents({ click: async (e) => { if (!manualPickMode) return; const lat = e.latlng.lat; const lon = e.latlng.lng; setCoords({ lat, lon }); setAccuracyM(10); setError(""); await refreshNearest(lat, lon); setManualPickMode(false); } });
    return null;
  }

  return (
    <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <h2 className="text-xl font-semibold dark:text-slate-100">{t.title}</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400">{t.subtitle}</p>
      <div className="mt-2 flex gap-2">
        <select className="select-field !px-2.5 !py-1.5 !text-xs" value={lang} onChange={(e) => setLang(e.target.value)}><option value="en">English</option><option value="si">?????</option><option value="ta">?????</option></select>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Route source: {pathSource || (gtfsReady ? "GTFS available" : "Fallback")}</p>
      </div>
      <div className="my-3 flex flex-wrap gap-2">
        <button className="btn-secondary" onClick={detectLocation}>{t.useLocation}</button>
        <input className="input-field" placeholder={t.destinationPlaceholder} value={destination} onChange={(e) => setDestination(e.target.value)} />
        <button className="btn-primary" onClick={handlePlan} disabled={loading}>{loading ? "Planning..." : t.plan}</button>
        <button className={manualPickMode ? "btn-secondary border-amber-600 !bg-amber-100 !text-amber-900" : "btn-secondary"} onClick={() => setManualPickMode((v) => !v)}>{manualPickMode ? t.clickMap : t.pickMap}</button>
      </div>
      {error ? <p className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{error}</p> : null}
      {nearest ? <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-800"><p className="text-slate-500 dark:text-slate-400">{t.nearest}</p><p className="font-semibold dark:text-slate-100">{nearest.name}</p></div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-800"><p className="text-slate-500 dark:text-slate-400">{t.distance}</p><p className="font-semibold dark:text-slate-100">{Number(nearest.distanceKm || 0).toFixed(2)} km</p></div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-800"><p className="text-slate-500 dark:text-slate-400">{t.accuracy}</p><p className="font-semibold dark:text-slate-100">{accuracyM ? `${Math.round(accuracyM)} m` : "Unknown"}</p></div>
      </div> : null}
      {coords ? <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Detected coordinates: {coords.lat.toFixed(6)}, {coords.lon.toFixed(6)}</p> : null}
      {plan ? <div className="my-3 space-y-3">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
          <p className="text-sm">{t.boarding}: <strong>{plan.boardingStation?.name || plan.origin.name}</strong> ? <strong>{plan.destinationStation.name}</strong></p>
          {selectedEta?.etaBoardingIso ? <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Exact arrival at boarding station: <strong>{new Date(selectedEta.etaBoardingIso).toLocaleTimeString()}</strong> | Delay: <strong>{selectedEta.estimatedDelayMin} min</strong> | ML risk: <strong>{((selectedEta.mlRisk || 0) * 100).toFixed(1)}%</strong></p> : <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">Exact arrival time is not available yet for the selected train.</p>}
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
          <p className="mb-2 text-sm font-medium">{t.best}</p>
          <ul className="space-y-2 text-sm">
            {(plan.rankedTrains || plan.trains || []).map((tRow) => {
              const eta = tRow.eta || (plan.trainEtas || []).find((e) => e.trainId === tRow.trainId);
              return <li key={tRow.trainId} className="rounded border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900"><div className="font-semibold text-slate-900 dark:text-slate-100">{tRow.trainId} - {tRow.name}</div>{eta?.etaBoardingIso ? <><div className="text-xs text-slate-600 dark:text-slate-300">Arrive boarding: {new Date(eta.etaBoardingIso).toLocaleTimeString()} | Delay: {eta.estimatedDelayMin} min | Trip: {eta.tripMinutesBoardingToDestination} min | Score: {eta.rankingScore}</div><div className="text-xs text-slate-600 dark:text-slate-300">ML Delay Risk: {((eta.mlRisk || 0) * 100).toFixed(1)}% | ML Predicted Delay: {Number(eta.mlPredictedDelayMin || 0).toFixed(1)} min | CI: {Number(eta.mlConfidenceLow || 0).toFixed(1)} - {Number(eta.mlConfidenceHigh || 0).toFixed(1)}</div></> : <div className="text-xs text-amber-700 dark:text-amber-300">{eta?.message || "ETA unavailable"}</div>}</li>;
            })}
          </ul>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"><p className="mb-2 text-sm font-medium">{t.alternatives}</p><ul className="list-inside list-disc text-sm">{(plan.alternativeBoardingStations || []).map((s) => <li key={s.name}>{s.name} ({Number(s.distanceKm || 0).toFixed(2)} km, trains: {s.trainCount})</li>)}</ul></div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
          <p className="mb-2 text-sm font-medium">{t.alerts}</p>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <select className="select-field !px-2.5 !py-1.5" value={armedTrainId} onChange={(e) => setArmedTrainId(e.target.value)}>{(plan.rankedTrains || plan.trains || []).map((x) => <option key={x.trainId} value={x.trainId}>{x.trainId}</option>)}</select>
            <input type="number" min="1" max="60" className="select-field w-20 !px-2.5 !py-1.5" value={alertMinutes} onChange={(e) => setAlertMinutes(Number(e.target.value || 10))} />
            <button className="btn-primary !px-3 !py-1.5" onClick={() => Notification?.requestPermission?.()}>Enable Browser Alerts</button>
            <button className={voiceEnabled ? "btn-primary !px-3 !py-1.5" : "btn-secondary !px-3 !py-1.5"} onClick={() => setVoiceEnabled((v) => !v)}>{voiceEnabled ? "Voice On" : "Voice Off"}</button>
          </div>
          {alertLog.length ? <ul className="mt-2 list-inside list-disc text-xs text-amber-700 dark:text-amber-300">{alertLog.map((a) => <li key={a}>{a}</li>)}</ul> : null}
        </div>
      </div> : null}
      <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
          <span className="font-semibold">Map Layers</span>
          <label className="inline-flex items-center gap-1"><input type="checkbox" checked={showTrains} onChange={(e) => setShowTrains(e.target.checked)} /> Trains</label>
          <label className="inline-flex items-center gap-1"><input type="checkbox" checked={showRoute} onChange={(e) => setShowRoute(e.target.checked)} /> Route</label>
          <label className="inline-flex items-center gap-1"><input type="checkbox" checked={showStations} onChange={(e) => setShowStations(e.target.checked)} /> Stations</label>
          <span className="ml-auto text-slate-500 dark:text-slate-400">Legend: <span className="text-teal-600">●</span> User <span className="text-blue-600">●</span> Nearest <span className="text-violet-600">●</span> Boarding <span className="text-red-600">●</span> Destination</span>
        </div>
        <MapContainer className="h-[420px] w-full" center={coords ? [coords.lat, coords.lon] : sriLankaCenter} zoom={8} scrollWheelZoom>
          <MapClickSetter />
          <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {showStations && coords ? <CircleMarker center={[coords.lat, coords.lon]} radius={8} pathOptions={{ color: "#0f766e" }}><Popup>Your current location</Popup></CircleMarker> : null}
          {showStations && nearest ? <CircleMarker center={[nearest.lat, nearest.lon]} radius={7} pathOptions={{ color: "#2563eb" }}><Popup>Nearest: {nearest.name}</Popup></CircleMarker> : null}
          {showStations && plan?.boardingStation ? <CircleMarker center={[plan.boardingStation.lat, plan.boardingStation.lon]} radius={8} pathOptions={{ color: "#7c3aed" }}><Popup>Board here: {plan.boardingStation.name}</Popup></CircleMarker> : null}
          {showStations && plan?.destinationStation ? <CircleMarker center={[plan.destinationStation.lat, plan.destinationStation.lon]} radius={7} pathOptions={{ color: "#dc2626" }}><Popup>Destination: {plan.destinationStation.name}</Popup></CircleMarker> : null}
          {showRoute && pathPositions.length >= 2 ? <Polyline positions={pathPositions} pathOptions={{ color: "#f59e0b", weight: 5 }} /> : null}
          {showTrains && (plan?.trainPositions || []).map((tp) => <Marker key={tp.trainId} position={[tp.latitude, tp.longitude]} icon={trainIcon}><Popup><strong>{tp.trainId}</strong><br />Route: {tp.routeId}<br />Speed: {Number(tp.speedKmh || 0).toFixed(1)} km/h<br />Updated: {new Date(tp.eventTime).toLocaleTimeString()}</Popup></Marker>)}
        </MapContainer>
      </div>
    </section>
  );
}
