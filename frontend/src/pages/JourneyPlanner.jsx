import { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import { CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { getGtfsStatus, getNearestStation, getStations, planJourney } from "../api/client";

const sriLankaCenter = [7.8731, 80.7718];
const inSriLanka = (lat, lon) => lat >= 5.7 && lat <= 10.1 && lon >= 79.4 && lon <= 82.1;
const text = {
  en: { title: "Plan a smarter rail journey", subtitle: "Find the best boarding station, compare services, and follow your train live.", locate: "Use current location", plan: "Find best journey", map: "Choose on map" },
  si: { title: "Plan a smarter rail journey", subtitle: "Find the best station and train for your destination.", locate: "Use current location", plan: "Find best journey", map: "Choose on map" },
  ta: { title: "Plan a smarter rail journey", subtitle: "Find the best station and train for your destination.", locate: "Use current location", plan: "Find best journey", map: "Choose on map" }
};

const formatTime = (value) => value
  ? new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  : "Pending";
const minutes = (value) => Number.isFinite(Number(value)) ? `${Math.round(Number(value))} min` : "Pending";

const freshness = (eventTime) => {
  if (!eventTime) return { label: "Position estimated", color: "slate" };
  const seconds = Math.max(0, Math.round((Date.now() - new Date(eventTime).getTime()) / 1000));
  if (seconds < 60) return { label: `Updated ${seconds}s ago`, color: "emerald" };
  const mins = Math.round(seconds / 60);
  if (mins < 10) return { label: `Updated ${mins}m ago`, color: "amber" };
  return { label: `Stale position (${mins}m)`, color: "red" };
};

const riskBadge = (risk) => {
  const value = Number(risk || 0);
  if (value >= 0.65) return { label: "High delay risk", css: "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900" };
  if (value >= 0.35) return { label: "Moderate risk", css: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900" };
  return { label: "Low delay risk", css: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900" };
};

const trainIcon = (selected, live) => L.divIcon({
  className: "train-marker",
  html: `<div class="train-marker-inner ${selected ? "is-selected" : ""} ${live ? "is-live" : "is-fallback"}"><svg viewBox="0 0 24 24"><path d="M7 2h10a3 3 0 0 1 3 3v10a4 4 0 0 1-4 4l2 2v1h-2l-3-3h-2l-3 3H6v-1l2-2a4 4 0 0 1-4-4V5a3 3 0 0 1 3-3Zm0 3v6h10V5H7Zm1 9a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm8 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z"/></svg></div>`,
  iconSize: selected ? [46, 46] : [38, 38],
  iconAnchor: selected ? [23, 23] : [19, 19],
  popupAnchor: [0, -20]
});

function MapViewport({ positions }) {
  const map = useMap();
  const key = positions.map((position) => position.join(",")).join("|");
  useEffect(() => {
    if (!positions.length) return;
    if (positions.length === 1) map.setView(positions[0], 12, { animate: true });
    else map.fitBounds(L.latLngBounds(positions), { padding: [50, 50], maxZoom: 13, animate: true });
  }, [key, map]);
  return null;
}

function MapPicker({ active, onPick }) {
  useMapEvents({ click: (event) => active && onPick(event.latlng.lat, event.latlng.lng) });
  return null;
}

function JourneyStep({ number, label, value, detail, active }) {
  return (
    <div className="flex min-w-0 gap-3">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-extrabold ring-4 ring-white dark:ring-slate-900 ${active ? "bg-teal-600 text-white" : "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-300"}`}>{number}</span>
      <div className="min-w-0">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-slate-400">{label}</p>
        <p className="truncate text-sm font-extrabold text-slate-950 dark:text-white">{value || "Not selected"}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{detail}</p>
      </div>
    </div>
  );
}

export function JourneyPlanner() {
  const [lang, setLang] = useState(() => localStorage.getItem("journey_lang") || "en");
  const t = text[lang] || text.en;
  const [stations, setStations] = useState([]);
  const [coords, setCoords] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [nearest, setNearest] = useState(null);
  const [destination, setDestination] = useState("");
  const [plan, setPlan] = useState(null);
  const [selectedTrainId, setSelectedTrainId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [mapPick, setMapPick] = useState(false);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [gtfsReady, setGtfsReady] = useState(false);
  const [showTrains, setShowTrains] = useState(true);
  const [showRoute, setShowRoute] = useState(true);
  const [showStations, setShowStations] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [alertMinutes, setAlertMinutes] = useState(10);

  const ranked = plan?.rankedTrains || plan?.trains || [];
  const selectedTrain = ranked.find((item) => item.trainId === selectedTrainId) || ranked[0] || null;
  const selectedEta = selectedTrain?.eta || plan?.trainEtas?.find((item) => item.trainId === selectedTrain?.trainId) || null;
  const selectedPosition = plan?.trainPositions?.find((item) => item.trainId === selectedTrain?.trainId) || null;
  const pathPositions = useMemo(() => (plan?.path || []).map((point) => [point.lat, point.lon]), [plan]);
  const viewportPositions = useMemo(() => {
    const result = [...pathPositions];
    if (!result.length && coords) result.push([coords.lat, coords.lon]);
    if (selectedPosition) result.push([Number(selectedPosition.latitude), Number(selectedPosition.longitude)]);
    return result.filter(([lat, lon]) => Number.isFinite(lat) && Number.isFinite(lon));
  }, [pathPositions, coords, selectedPosition]);

  useEffect(() => { localStorage.setItem("journey_lang", lang); }, [lang]);
  useEffect(() => {
    getStations().then((response) => setStations(response.data || [])).catch(() => setStations([]));
    getGtfsStatus().then((response) => setGtfsReady(Boolean(response.data?.ready))).catch(() => setGtfsReady(false));
  }, []);

  const setLocation = async (lat, lon, accuracyM = 10) => {
    setCoords({ lat, lon });
    setAccuracy(accuracyM);
    setPlan(null);
    setError("");
    const response = await getNearestStation(lat, lon);
    setNearest(response.data);
  };

  const detectLocation = () => {
    setError("");
    setLocating(true);
    if (!navigator.geolocation) {
      setLocating(false);
      return setError("Geolocation is unavailable. Choose your position on the map.");
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        await setLocation(lat, lon, Number(position.coords.accuracy || 0));
        if (!inSriLanka(lat, lon)) setError("The detected location appears outside Sri Lanka. Enable precise location or choose a point on the map.");
        setLocating(false);
      },
      () => {
        setLocating(false);
        setError("Location permission was denied. Use 'Choose on map' instead.");
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  };

  const announce = (result) => {
    if (!voiceEnabled || !("speechSynthesis" in window)) return;
    const top = (result.rankedTrains || result.trains || [])[0];
    const eta = top?.eta || result.trainEtas?.[0];
    let message = `Journey planned. Board at ${result.boardingStation?.name} for ${result.destinationStation?.name}.`;
    if (top) message += ` Recommended train ${top.trainId}, ${top.name}.`;
    if (eta?.etaBoardingIso) message += ` It should reach the boarding station at ${formatTime(eta.etaBoardingIso)}.`;
    if (Number.isFinite(Number(eta?.estimatedDelayMin))) message += ` Estimated delay ${eta.estimatedDelayMin} minutes.`;
    speechSynthesis.cancel();
    speechSynthesis.speak(new SpeechSynthesisUtterance(message));
  };

  const handlePlan = async () => {
    if (!coords) return setError("Set your current location before planning the journey.");
    if (!destination.trim()) return setError("Choose a destination station.");
    try {
      setLoading(true);
      setError("");
      const response = await planJourney({ lat: coords.lat, lon: coords.lon, destination: destination.trim() });
      setPlan(response.data);
      setSelectedTrainId(response.data?.rankedTrains?.[0]?.trainId || response.data?.trains?.[0]?.trainId || "");
      announce(response.data);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError.message || "The journey could not be planned.");
    } finally {
      setLoading(false);
    }
  };

  const selectedRisk = riskBadge(selectedEta?.mlRisk);
  const selectedFreshness = freshness(selectedPosition?.eventTime);

  return (
    <section className="mt-4 space-y-4">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <header className="border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-teal-50/70 p-5 dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-teal-950/30">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="rounded-full bg-teal-50 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-teal-700 ring-1 ring-inset ring-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:ring-teal-900">Smart journey assistant</span>
              <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-950 dark:text-white">{t.title}</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t.subtitle}</p>
            </div>
            <div className="flex gap-2">
              <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${gtfsReady ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"}`}>{gtfsReady ? "Live timetable" : "Scheduled route data"}</span>
              <select className="select-field !px-3 !py-1.5 !text-xs" value={lang} onChange={(event) => setLang(event.target.value)}><option value="en">English</option><option value="si">Sinhala</option><option value="ta">Tamil</option></select>
            </div>
          </div>
        </header>

        <div className="p-5">
          <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/70">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-slate-400">Starting point</p>
              <div className="mt-1 flex items-center justify-between gap-3">
                <div className="min-w-0"><p className="truncate text-sm font-extrabold text-slate-950 dark:text-white">{nearest?.name || "Current location not set"}</p><p className="text-xs text-slate-500 dark:text-slate-400">{coords ? `${Number(nearest?.distanceKm || 0).toFixed(2)} km from nearest station` : "Use GPS or choose on map"}</p></div>
                <button className="btn-secondary shrink-0 !px-3 !py-2" onClick={detectLocation} disabled={locating}>{locating ? "Locating..." : t.locate}</button>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/70">
              <label htmlFor="destination" className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-slate-400">Destination station</label>
              <input id="destination" list="station-options" className="mt-1 w-full border-0 bg-transparent p-0 text-sm font-extrabold text-slate-950 outline-none placeholder:font-medium placeholder:text-slate-400 dark:text-white" placeholder="Where are you going?" value={destination} onChange={(event) => setDestination(event.target.value)} onKeyDown={(event) => event.key === "Enter" && handlePlan()} />
              <datalist id="station-options">{stations.map((station) => <option key={station.name} value={station.name} />)}</datalist>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Choose an official Sri Lanka Railway station</p>
            </div>
            <button className="btn-primary min-h-[72px] px-6" onClick={handlePlan} disabled={loading}>{loading ? "Finding journey..." : t.plan}</button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button className={mapPick ? "btn-secondary border-amber-500 !bg-amber-50 !text-amber-800 dark:!bg-amber-950/40 dark:!text-amber-300" : "btn-secondary"} onClick={() => setMapPick((value) => !value)}>{mapPick ? "Click the map now" : t.map}</button>
            {coords ? <span className="text-xs text-slate-500 dark:text-slate-400">Location accuracy: {accuracy ? `${Math.round(accuracy)} m` : "unknown"}</span> : null}
          </div>
          {error ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{error}</div> : null}
        </div>
      </div>

      {plan ? (
        <div className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
          <div className="space-y-4">
            <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-4 dark:border-slate-800 dark:bg-slate-900">
              <JourneyStep number="1" label="You are near" value={plan.userNearestStation?.name || nearest?.name} detail={`${Number(plan.userNearestStation?.distanceKm || nearest?.distanceKm || 0).toFixed(2)} km away`} active />
              <JourneyStep number="2" label="Board at" value={plan.boardingStation?.name || plan.origin?.name} detail={formatTime(selectedEta?.etaBoardingIso)} active />
              <JourneyStep number="3" label="Travel on" value={selectedTrain ? `${selectedTrain.trainId} - ${selectedTrain.name}` : ""} detail={minutes(selectedEta?.tripMinutesBoardingToDestination)} active={Boolean(selectedTrain)} />
              <JourneyStep number="4" label="Arrive at" value={plan.destinationStation?.name} detail={formatTime(selectedEta?.etaDestinationIso)} active={Boolean(selectedEta)} />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4"><p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-teal-600">Ranked by ETA and delay risk</p><h3 className="text-lg font-extrabold text-slate-950 dark:text-white">Recommended trains</h3></div>
              <div className="space-y-3">
                {ranked.length ? ranked.map((train, index) => {
                  const eta = train.eta || plan.trainEtas?.find((item) => item.trainId === train.trainId);
                  const badge = riskBadge(eta?.mlRisk);
                  const position = plan.trainPositions?.find((item) => item.trainId === train.trainId);
                  const fresh = freshness(position?.eventTime);
                  const selected = train.trainId === selectedTrain?.trainId;
                  return (
                    <button key={train.trainId} type="button" onClick={() => setSelectedTrainId(train.trainId)} className={`w-full rounded-xl border p-4 text-left transition ${selected ? "border-teal-500 bg-teal-50/70 shadow-md ring-2 ring-teal-500/10 dark:border-teal-600 dark:bg-teal-950/20" : "border-slate-200 bg-slate-50 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-800/60"}`}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex gap-3"><span className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-extrabold ${index === 0 ? "bg-amber-400 text-slate-950" : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-200"}`}>#{index + 1}</span><div><p className="font-extrabold text-slate-950 dark:text-white">{train.name}</p><p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Train {train.trainId} / {train.routeName}</p></div></div>
                        <div className="flex gap-2"><span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ring-1 ring-inset ${badge.css}`}>{badge.label}</span><span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${position ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"}`}>{position ? "Live GPS" : "Estimated"}</span></div>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {[["Boarding ETA", formatTime(eta?.etaBoardingIso)], ["Expected delay", minutes(eta?.estimatedDelayMin)], ["Journey time", minutes(eta?.tripMinutesBoardingToDestination)], ["ML prediction", `${Math.round(Number(eta?.mlRisk || 0) * 100)}% risk`]].map(([label, value]) => <div key={label}><p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-0.5 text-sm font-extrabold text-slate-900 dark:text-white">{value}</p></div>)}
                      </div>
                      <div className="mt-3 flex justify-between border-t border-slate-200 pt-3 text-[10px] text-slate-500 dark:border-slate-700 dark:text-slate-400"><span className={fresh.color === "red" ? "text-red-600" : fresh.color === "amber" ? "text-amber-600" : "text-emerald-600"}>{fresh.label}</span><span>Score {Number(eta?.rankingScore || 0).toFixed(1)}</span></div>
                    </button>
                  );
                }) : <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700">No trains currently serve this journey.</div>}
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl bg-slate-950 p-5 text-white shadow-lg ring-1 ring-white/10">
              <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-teal-300">Selected service</p><h3 className="mt-1 text-xl font-extrabold">{selectedTrain?.name || "No train selected"}</h3><p className="text-sm text-slate-400">{selectedTrain ? `Train ${selectedTrain.trainId}` : ""}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ring-1 ring-inset ${selectedRisk.css}`}>{selectedRisk.label}</span></div>
              <div className="my-5 h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-teal-400 to-emerald-400" style={{ width: `${Math.max(8, Math.min(100, 100 - Number(selectedEta?.mlRisk || 0) * 60))}%` }} /></div>
              <div className="grid grid-cols-2 gap-3">{[["At platform", formatTime(selectedEta?.etaBoardingIso)], ["Destination ETA", formatTime(selectedEta?.etaDestinationIso)], ["ML delay", minutes(selectedEta?.mlPredictedDelayMin)], ["Speed", `${Number(selectedPosition?.speedKmh || 0).toFixed(0)} km/h`]].map(([label, value]) => <div key={label} className="rounded-xl bg-white/5 p-3"><p className="text-[9px] uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 text-lg font-extrabold">{value}</p></div>)}</div>
              <p className={`mt-4 text-xs ${selectedFreshness.color === "red" ? "text-red-300" : selectedFreshness.color === "amber" ? "text-amber-300" : "text-emerald-300"}`}>{selectedFreshness.label}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h3 className="font-extrabold text-slate-950 dark:text-white">Nearby boarding options</h3>
              <div className="mt-3 space-y-2">{(plan.alternativeBoardingStations || []).map((station) => <div key={station.name} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800"><div><p className="text-sm font-bold text-slate-900 dark:text-white">{station.name}</p><p className="text-xs text-slate-500 dark:text-slate-400">{station.line} line / {station.trainCount} trains</p></div><span className="text-xs font-extrabold text-teal-700 dark:text-teal-300">{Number(station.distanceKm || 0).toFixed(1)} km</span></div>)}</div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h3 className="font-extrabold text-slate-950 dark:text-white">Trip alerts</h3><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Notify me before the selected train arrives.</p>
              <div className="mt-3 flex items-center gap-2"><input type="number" min="1" max="60" className="select-field min-w-0 flex-1" value={alertMinutes} onChange={(event) => setAlertMinutes(Number(event.target.value || 10))} /><span className="text-xs text-slate-500">minutes before</span></div>
              <div className="mt-3 grid grid-cols-2 gap-2"><button className="btn-secondary !px-3" onClick={() => window.Notification?.requestPermission?.()}>Browser alert</button><button className={voiceEnabled ? "btn-primary !px-3" : "btn-secondary !px-3"} onClick={() => setVoiceEnabled((value) => !value)}>{voiceEnabled ? "Voice on" : "Voice off"}</button></div>
            </div>
          </aside>
        </div>
      ) : null}

      <div className={`${mapExpanded ? "fixed inset-3 z-[1000]" : "relative"} overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900`}>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
          <div className="mr-auto"><p className="font-extrabold text-slate-950 dark:text-white">Live railway map</p><p className="text-xs text-slate-500 dark:text-slate-400">Focused on your selected journey and train</p></div>
          {[["Trains", showTrains, setShowTrains], ["Route", showRoute, setShowRoute], ["Stations", showStations, setShowStations]].map(([label, value, setter]) => <label key={label} className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200"><input type="checkbox" className="accent-teal-600" checked={value} onChange={(event) => setter(event.target.checked)} />{label}</label>)}
          <button className="btn-secondary !px-3 !py-2" onClick={() => setMapExpanded((value) => !value)}>{mapExpanded ? "Exit fullscreen" : "Expand map"}</button>
        </div>
        {mapPick ? <div className="absolute left-1/2 top-20 z-[500] -translate-x-1/2 rounded-full bg-amber-400 px-4 py-2 text-xs font-extrabold text-slate-950 shadow-lg">Click the map to set your starting point</div> : null}
        <MapContainer className={mapExpanded ? "h-[calc(100vh-96px)] w-full" : "h-[560px] w-full"} center={coords ? [coords.lat, coords.lon] : sriLankaCenter} zoom={8} scrollWheelZoom>
          <MapPicker active={mapPick} onPick={async (lat, lon) => { await setLocation(lat, lon); setMapPick(false); }} />
          <MapViewport positions={viewportPositions} />
          <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {showRoute && pathPositions.length >= 2 ? <><Polyline positions={pathPositions} pathOptions={{ color: "#fff", weight: 11, opacity: 0.9 }} /><Polyline positions={pathPositions} pathOptions={{ color: "#0f766e", weight: 6, opacity: 1 }} /></> : null}
          {showStations && coords ? <CircleMarker center={[coords.lat, coords.lon]} radius={9} pathOptions={{ color: "#fff", fillColor: "#0f766e", fillOpacity: 1, weight: 3 }}><Popup><strong>Your location</strong><br />Accuracy: {accuracy ? `${Math.round(accuracy)} m` : "Unknown"}</Popup></CircleMarker> : null}
          {showStations && nearest ? <CircleMarker center={[nearest.lat, nearest.lon]} radius={7} pathOptions={{ color: "#fff", fillColor: "#2563eb", fillOpacity: 1, weight: 3 }}><Popup><strong>Nearest station</strong><br />{nearest.name}<br />{Number(nearest.distanceKm || 0).toFixed(2)} km away</Popup></CircleMarker> : null}
          {showStations && plan?.boardingStation ? <CircleMarker center={[plan.boardingStation.lat, plan.boardingStation.lon]} radius={10} pathOptions={{ color: "#fff", fillColor: "#7c3aed", fillOpacity: 1, weight: 3 }}><Popup><strong>Board here</strong><br />{plan.boardingStation.name}<br />Train arrives {formatTime(selectedEta?.etaBoardingIso)}</Popup></CircleMarker> : null}
          {showStations && plan?.destinationStation ? <CircleMarker center={[plan.destinationStation.lat, plan.destinationStation.lon]} radius={10} pathOptions={{ color: "#fff", fillColor: "#dc2626", fillOpacity: 1, weight: 3 }}><Popup><strong>Destination</strong><br />{plan.destinationStation.name}<br />Expected arrival {formatTime(selectedEta?.etaDestinationIso)}</Popup></CircleMarker> : null}
          {showTrains && (plan?.trainPositions || []).map((position) => {
            const train = ranked.find((item) => item.trainId === position.trainId);
            const eta = train?.eta || plan.trainEtas?.find((item) => item.trainId === position.trainId);
            const fresh = freshness(position.eventTime);
            const selected = position.trainId === selectedTrain?.trainId;
            return <Marker key={position.trainId} zIndexOffset={selected ? 1000 : 0} position={[position.latitude, position.longitude]} icon={trainIcon(selected, Boolean(eta?.hasLiveGps))} eventHandlers={{ click: () => setSelectedTrainId(position.trainId) }}><Popup minWidth={230}><strong>{train?.name || `Train ${position.trainId}`}</strong><br />Train {position.trainId} / {position.routeId}<br />Speed: {Number(position.speedKmh || 0).toFixed(0)} km/h<br />Delay: {minutes(eta?.estimatedDelayMin)}<br />Boarding ETA: {formatTime(eta?.etaBoardingIso)}<br /><span className={`freshness-${fresh.color}`}>{fresh.label}</span></Popup></Marker>;
          })}
        </MapContainer>
        <div className="pointer-events-none absolute bottom-7 left-4 z-[500] hidden rounded-xl border border-white/70 bg-white/95 p-3 text-[10px] font-semibold text-slate-700 shadow-xl backdrop-blur md:block dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-200"><p className="mb-2 font-extrabold uppercase tracking-wider text-slate-400">Map legend</p><div className="grid grid-cols-2 gap-x-4 gap-y-1.5"><span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-teal-600" />Your location</span><span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-blue-600" />Nearest station</span><span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-violet-600" />Boarding station</span><span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-red-600" />Destination</span></div></div>
      </div>
    </section>
  );
}
